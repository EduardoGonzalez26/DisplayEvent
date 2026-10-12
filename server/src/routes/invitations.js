import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { normalizeForRead } from "../schemas/invitation.js";
import { findInvitationByToken } from "../utils/invitationLookup.js";
import { getStripe, isStripeConfigured, stripePublishableKey } from "../utils/stripe.js";
import {
  resolveCardAvailability,
  resolveStripeDestination,
} from "../utils/stripeDestination.js";
import { clientUrl } from "../utils/clientUrl.js";

const router = Router();

const invitationViewLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120 });
const rsvpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

const SUPPORTED_CURRENCIES = ["mxn", "eur"];

// Tope por moneda en UNIDADES MAYORES (pesos/euros). Sirve para:
//   1) Evitar overflow/precisión en `amount * 100` (muy por debajo de Number.MAX_SAFE_INTEGER).
//   2) No superar el límite por cobro de Stripe (999.999,99 en unidades menores).
const MAX_AMOUNT = 999_999;

async function getGuests(groupId) {
  return query(
    `SELECT id, name, is_child, is_leader, registered, declined, companion_id
     FROM guests
     WHERE group_id = $1
     ORDER BY is_leader DESC, id ASC`,
    [groupId]
  );
}

// Disponibilidad de pago con tarjeta POR MONEDA (extensión del contrato
// público `payment_methods.card.{mxn,eur}`). Solo aplica cuando la mesa de
// regalos tiene el pago en línea habilitado y Stripe está configurado; luego
// resuelve si hay cuenta Connect destino válida para cada moneda. Nunca lanza:
// la vista pública no debe caerse por la disponibilidad de pago.
async function cardPaymentMethods(inv, cfg) {
  const card = { mxn: false, eur: false };
  if (!isStripeConfigured()) return { card };
  if (!(cfg.registry?.enabled && cfg.registry?.stripe_enabled)) return { card };
  try {
    return {
      card: await resolveCardAvailability({
        ownerUserId: inv.owner_user_id,
        overrideMxn: inv.stripe_account_mxn,
        overrideEur: inv.stripe_account_eur,
      }),
    };
  } catch (err) {
    console.error("[stripe] No se pudo resolver la disponibilidad de tarjeta:", err.message);
    return { card };
  }
}

router.get("/:token", invitationViewLimiter, async (req, res, next) => {
  try {
    const inv = await findInvitationByToken(req.params.token);
    if (!inv) return res.status(404).json({ error: "Invitación no encontrada" });

    const cfg = normalizeForRead(inv.invitation);
    const guests = await getGuests(inv.group_id);
    res.json({
      event: {
        name: inv.event_name,
        date: inv.date,
        time: inv.time,
        place: inv.place,
        invitation: cfg,
      },
      group: { name: inv.name, leader_name: inv.leader_name, rsvp_note: inv.rsvp_note },
      guests,
      public_config: {
        stripe_publishable_key: stripePublishableKey(),
        custom_domain: inv.custom_domain || null,
      },
      payment_methods: await cardPaymentMethods(inv, cfg),
    });
  } catch (err) {
    next(err);
  }
});

router.put("/:token/rsvp", rsvpLimiter, async (req, res, next) => {
  const { attending_ids, declining_ids, note } = req.body;
  try {
    const inv = await findInvitationByToken(req.params.token);
    if (!inv) return res.status(404).json({ error: "Invitación no encontrada" });

    const cfg = normalizeForRead(inv.invitation);

    // Lectura única de pases: alimenta ambas guardas y, tras la transacción,
    // la respuesta (el update es determinista sobre estas mismas filas).
    const guests = await getGuests(inv.group_id);
    const hasResponded = guests.some((g) => g.registered || g.declined);

    // GUARDA 1 (plazo): con RSVP editable y deadline configurado, bloquea
    // confirmar/editar una vez vencido. Deadline vacío o inválido = sin límite.
    const deadlineMs = Date.parse(cfg.rsvp_edit_deadline || "");
    if (cfg.rsvp_editable && Number.isFinite(deadlineMs) && Date.now() > deadlineMs) {
      return res
        .status(403)
        .json({ error: "El plazo para confirmar o modificar la asistencia ha terminado." });
    }

    // GUARDA 2 (congelado): sin RSVP editable, tras la primera respuesta el
    // grupo ya no puede modificar; la primera confirmación sigue permitida.
    if (hasResponded && !cfg.rsvp_editable) {
      return res.status(403).json({ error: "La confirmación ya no puede modificarse." });
    }

    const allowIds = Array.isArray(attending_ids) ? attending_ids.map(Number) : [];
    const declineIds = Array.isArray(declining_ids) ? declining_ids.map(Number) : [];
    const allIds = [...allowIds, ...declineIds];

    if (allIds.length > 0) {
      const owned = await query(
        `SELECT id FROM guests WHERE group_id = $1 AND id = ANY($2::int[])`,
        [inv.group_id, allIds]
      );
      const ownedSet = new Set(owned.map((g) => g.id));
      const invalid = allIds.filter((id) => !ownedSet.has(id));
      if (invalid.length > 0) {
        return res.status(400).json({ error: "Algunos pases no pertenecen a esta invitación" });
      }
    }

    const cleanNote = await transaction(async (conn) => {
      // Pases que asisten: registrados. Pases que no asisten: declinados.
      // El resto vuelve a "sin respuesta".
      await conn.query(
        `UPDATE guests SET registered = FALSE, declined = FALSE WHERE group_id = $1`,
        [inv.group_id]
      );
      if (allowIds.length > 0) {
        await conn.query(
          `UPDATE guests SET registered = TRUE, declined = FALSE WHERE id = ANY($1::int[])`,
          [allowIds]
        );
      }
      if (declineIds.length > 0) {
        await conn.query(
          `UPDATE guests SET registered = FALSE, declined = TRUE WHERE id = ANY($1::int[])`,
          [declineIds]
        );
      }

      const noteStr = typeof note === "string" ? note.trim().slice(0, 500) : null;
      await conn.query(`UPDATE "groups" SET rsvp_note = $1 WHERE id = $2`, [
        noteStr,
        inv.group_id,
      ]);
      return noteStr;
    });

    // Refleja en la lectura previa el resultado exacto de la transacción
    // (reset + marcas enviadas; "no asistirá" gana ante un id duplicado),
    // sin una segunda consulta.
    const allowSet = new Set(allowIds);
    const declineSet = new Set(declineIds);
    const updatedGuests = guests.map((g) => {
      const id = Number(g.id);
      const declined = declineSet.has(id);
      return { ...g, registered: !declined && allowSet.has(id), declined };
    });

    res.json({
      ok: true,
      attending: updatedGuests.filter((g) => g.registered).length,
      declining: updatedGuests.filter((g) => g.declined).length,
      responded: updatedGuests.filter((g) => g.registered || g.declined).length,
      note: cleanNote ?? null,
      guests: updatedGuests,
    });
  } catch (err) {
    next(err);
  }
});

// Crea una Checkout Session embebida de Stripe para el regalo monetario.
router.post("/:token/payment", paymentLimiter, async (req, res, next) => {
  const { currency, amount } = req.body ?? {};
  try {
    const inv = await findInvitationByToken(req.params.token);
    if (!inv) return res.status(404).json({ error: "Invitación no encontrada" });

    const registry = normalizeForRead(inv.invitation).registry;

    if (!registry.enabled) {
      return res.status(400).json({ error: "La mesa de regalos no está habilitada para esta invitación" });
    }
    if (!registry.stripe_enabled) {
      return res.status(400).json({ error: "El pago en línea no está habilitado para esta invitación" });
    }
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return res.status(400).json({ error: 'Moneda inválida: usa "mxn" o "eur"' });
    }
    if (!Number.isInteger(amount) || amount < 0) {
      return res.status(400).json({ error: "El monto debe ser un entero mayor o igual a 0" });
    }
    if (amount > MAX_AMOUNT) {
      return res.status(400).json({ error: `El monto máximo es ${MAX_AMOUNT} ${currency.toUpperCase()}` });
    }

    const min = currency === "mxn" ? registry.min_mxn : registry.min_eur;
    const suggested = currency === "mxn" ? registry.suggested_mxn : registry.suggested_eur;

    if (amount < min) {
      return res.status(400).json({ error: `El monto mínimo es ${min} ${currency.toUpperCase()}` });
    }
    if (!registry.allow_custom && !suggested.includes(amount)) {
      return res.status(400).json({ error: "El monto debe ser uno de los montos sugeridos" });
    }

    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: "El pago en línea no está disponible en este momento" });
    }

    // Destination charge (Connect): el 100% va al anfitrión, sin
    // application_fee. El destino se elige por moneda: override del evento
    // (`stripe_account_<currency>`) ?? cuenta del dueño habilitada con esa
    // `default_currency`. Sin destino válido la tarjeta queda deshabilitada.
    const overrideAccountId =
      currency === "mxn" ? inv.stripe_account_mxn : inv.stripe_account_eur;
    const destination = await resolveStripeDestination({
      currency,
      overrideAccountId,
      ownerUserId: inv.owner_user_id,
    });
    if (!destination) {
      return res.status(400).json({
        error: "El pago con tarjeta no está disponible para esta moneda por el momento",
      });
    }

    // Con dominio propio, el regreso del checkout vive en el dominio del
    // evento; sin él se conserva el comportamiento actual (CLIENT_URL).
    const customDomain =
      typeof inv.custom_domain === "string" ? inv.custom_domain.trim() : "";
    const base = customDomain
      ? `https://${customDomain}`
      : clientUrl().replace(/\/+$/, "");
    const eventName = inv.event_name || "Regalo";

    // Checkout embebido:
    // - `ui_mode: "embedded"`: el cliente monta el formulario con `client_secret`.
    // - `redirect_on_completion: "if_required"`: los pagos con tarjeta terminan
    //   sin navegación y el cliente resuelve el estado con `onComplete`; solo los
    //   métodos que exigen redirección (p. ej. OXXO/3DS) vuelven al `return_url`.
    // - `return_url` conserva la MISMA `base` (dominio propio o CLIENT_URL) y el
    //   parámetro `payment=success`; se añade `session_id={CHECKOUT_SESSION_ID}`
    //   para que, tras una redirección, el cliente pueda correlacionar/verificar
    //   la sesión (Stripe sustituye el placeholder).
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      redirect_on_completion: "if_required",
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amount * 100,
            product_data: { name: `Regalo — ${eventName}` },
          },
          quantity: 1,
        },
      ],
      return_url: `${base}/invitacion/${req.params.token}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      // Destination charge: la transferencia va íntegra a la cuenta Connect
      // resuelta para la moneda (sin application_fee_amount).
      payment_intent_data: {
        transfer_data: { destination: destination.stripe_account_id },
      },
      metadata: {
        event_id: String(inv.event_id),
        group_id: String(inv.group_id),
      },
    });

    // En modo embebido el cliente necesita el `client_secret` para montar el
    // checkout. Nunca se expone nada más de la sesión (ni id ni URLs).
    if (!session.client_secret) {
      console.error("[stripe] Checkout Session embebida creada sin client_secret", {
        session_id: session.id,
      });
      return res.status(500).json({ error: "No se pudo iniciar el pago en línea" });
    }

    res.json({ client_secret: session.client_secret });
  } catch (err) {
    next(err);
  }
});

export default router;