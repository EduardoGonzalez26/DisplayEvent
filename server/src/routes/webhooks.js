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

// Eventos de Checkout que registran/actualizan el regalo. `completed` puede
// llegar con pago aún no confirmado (métodos asíncronos) y se corrige con los
// eventos `async_payment_*`.
const CHECKOUT_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
]);

// `acct_...` válido o null (metadata antigua puede no traer el campo).
function normalizeDestinationAccount(value) {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!/^acct_[A-Za-z0-9]+$/.test(id) || id.length > 255) return null;
  return id;
}

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

  // Solo nos interesan los pagos de Checkout y el estado de las cuentas
  // Connect; el resto se ignora con 200.
  if (event.type === "account.updated") {
    const account = event.data.object;
    try {
      // Sincroniza el estado de la cuenta Connect (idempotente: UPDATE por
      // `stripe_account_id`; 0 filas si la cuenta no es de esta plataforma).
      await query(
        `UPDATE stripe_accounts
            SET charges_enabled = $1,
                payouts_enabled = $2,
                details_submitted = $3,
                updated_at = CURRENT_TIMESTAMP
          WHERE stripe_account_id = $4`,
        [
          Boolean(account.charges_enabled),
          Boolean(account.payouts_enabled),
          Boolean(account.details_submitted),
          account.id,
        ]
      );
    } catch (err) {
      console.error("[stripe-webhook] Error sincronizando cuenta Connect:", err.message);
      return res.status(500).json({ error: "Error al sincronizar la cuenta" });
    }
    return res.json({ received: true });
  }

  if (!CHECKOUT_EVENT_TYPES.has(event.type)) {
    return res.json({ received: true });
  }

  const session = event.data.object;
  const metadata = session.metadata || {};
  const eventId = Number(metadata.event_id);
  const rawGroupId = Number(metadata.group_id);
  const groupId = Number.isInteger(rawGroupId) && rawGroupId > 0 ? rawGroupId : null;
  const amountMinor = Number(session.amount_total);
  const currency = typeof session.currency === "string" ? session.currency.toLowerCase() : "";
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;
  const livemode = Boolean(event.livemode);
  const destinationAccount = normalizeDestinationAccount(metadata.destination_account);
  const checkoutSessionId =
    typeof session.id === "string" && session.id.length <= 255 ? session.id : null;

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

  // Sin PaymentIntent no hay clave natural idempotente: no se inserta nada.
  // Stripe puede reenviar el evento; se responde 200 para no provocar retries.
  if (!paymentIntent) {
    console.warn("[stripe-webhook] Checkout Session sin payment_intent; se omite el registro.");
    return res.json({ received: true });
  }

  let status = "pending";
  if (event.type === "checkout.session.async_payment_succeeded") {
    status = "succeeded";
  } else if (event.type === "checkout.session.async_payment_failed") {
    status = "failed";
  } else if (session.payment_status === "paid") {
    status = "succeeded";
  }

  try {
    // Idempotente: `stripe_payment_intent_id` es único. Si Stripe reenvía el
    // mismo evento (at-least-once), se actualiza la misma fila en lugar de
    // duplicar el regalo. COALESCE conserva lo ya guardado cuando el evento
    // nuevo no trae cuenta destino o Checkout Session.
    // El estado no se degrada si los webhooks llegan desordenados:
    //   succeeded es final; failed no vuelve a pending; failed sí puede
    //   corregirse a succeeded (y failed puede reemplazar a pending).
    await query(
      `INSERT INTO gifts
         (event_id, group_id, amount_minor, currency, status,
          stripe_payment_intent_id, livemode, destination_account,
          stripe_checkout_session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (stripe_payment_intent_id) DO UPDATE
         SET status = CASE
               WHEN gifts.status = 'succeeded' OR EXCLUDED.status = 'succeeded' THEN 'succeeded'
               WHEN gifts.status = 'failed' AND EXCLUDED.status = 'pending' THEN 'failed'
               ELSE EXCLUDED.status
             END,
             livemode = EXCLUDED.livemode,
             destination_account = COALESCE(EXCLUDED.destination_account, gifts.destination_account),
             stripe_checkout_session_id = COALESCE(EXCLUDED.stripe_checkout_session_id, gifts.stripe_checkout_session_id)`,
      [
        eventId,
        groupId,
        amountMinor,
        currency,
        status,
        paymentIntent,
        livemode,
        destinationAccount,
        checkoutSessionId,
      ]
    );
  } catch (err) {
    console.error("[stripe-webhook] Error insertando regalo:", err.message);
    return res.status(500).json({ error: "Error al registrar el regalo" });
  }

  res.json({ received: true });
});

export default router;
