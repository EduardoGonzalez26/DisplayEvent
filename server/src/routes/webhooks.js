import { Router, raw } from "express";
import { query } from "../db/index.js";
import { verifyStripeWebhook } from "../utils/stripe.js";

/* ------------------------------------------------------------------
   Webhooks de Stripe (server-to-server).

   Se montan ANTES de `express.json()` global y ANTES de CORS/CSRF en
   index.js, porque:
     - Necesitan el body CRUDO (Buffer) para verificar la firma.
     - Stripe no envía cabecera Origin (no aplica CORS/CSRF).
   Nunca se loguea el body crudo ni la clave secreta.

   No se aplica rate-limit a esta ruta: Stripe entrega con retry + backoff
   exponencial (si respondemos 429 lo reintentaría igual) y solo se procesan
   eventos con firma válida, así que el abuso sin la clave secreta se reduce
   a respuestas 400 baratas. La idempotencia (ON CONFLICT) evita regalos
   duplicados si Stripe reenvía el mismo evento.
------------------------------------------------------------------ */

const router = Router();

router.post("/stripe", raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res.status(400).json({ error: "Firma de Stripe ausente" });
  }

  const { event, error } = verifyStripeWebhook(req.body, signature);
  if (error) {
    console.error("[stripe-webhook] Verificación de firma fallida:", error);
    return res.status(400).json({ error: "Firma de webhook inválida" });
  }

  // Solo nos interesan los pagos completados; el resto se ignora con 200.
  if (event.type !== "checkout.session.completed") {
    return res.json({ received: true });
  }

  const session = event.data.object;
  const metadata = session.metadata || {};
  const eventId = Number(metadata.event_id);
  const groupId = metadata.group_id ? Number(metadata.group_id) : null;
  const amountMinor = Number(session.amount_total);
  const currency = typeof session.currency === "string" ? session.currency.toLowerCase() : "";
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;

  if (
    !Number.isInteger(eventId) ||
    eventId <= 0 ||
    !Number.isInteger(amountMinor) ||
    amountMinor <= 0 ||
    !/^[a-z]{3}$/.test(currency)
  ) {
    console.error("[stripe-webhook] Evento con metadata inválida (event_id/amount_total/currency).");
    return res.json({ received: true });
  }

  try {
    // Idempotente: si Stripe reenvía el mismo `checkout.session.completed`
    // (entrega at-least-once), no se duplica el regalo.
    await query(
      `INSERT INTO gifts (event_id, group_id, amount_minor, currency, status, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4, 'succeeded', $5)
       ON CONFLICT (stripe_payment_intent_id) DO NOTHING`,
      [eventId, groupId, amountMinor, currency, paymentIntent]
    );
  } catch (err) {
    console.error("[stripe-webhook] Error insertando regalo:", err.message);
    return res.status(500).json({ error: "Error al registrar el regalo" });
  }

  res.json({ received: true });
});

export default router;
