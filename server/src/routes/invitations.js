import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { normalizeForRead } from "../schemas/invitation.js";
import { findInvitationByToken } from "../utils/invitationLookup.js";
import { getStripe, isStripeConfigured, stripePublishableKey } from "../utils/stripe.js";
import {
  buildPaymentIntentData,
  getPlatformCountry,
  resolveCardAvailability,
  resolveStripeDestination,
} from "../utils/stripeDestination.js";
import { clientUrl } from "../utils/clientUrl.js";
import { sendGiftMessageEmail } from "../utils/mailer.js";

const router = Router();

const invitationViewLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120 });
const rsvpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const giftMessageLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

const SUPPORTED_CURRENCIES = ["mxn", "eur"];

// Tope por moneda en UNIDADES MAYORES (pesos/euros). Sirve para:
//   1) Evitar overflow/precisión en `amount * 100` (muy por debajo de Number.MAX_SAFE_INTEGER).
//   2) No superar el límite por cobro de Stripe (999.999,99 en unidades menores).
const MAX_AMOUNT = 999_999;

async function getGuests(groupId) {
  return query(
    `SELECT id, name, is_child, is_leader, registered, declined, companion_id,
            allergy, allergy_notes
     FROM guests
     WHERE group_id = $1
     ORDER BY is_leader DESC, id ASC`,
    [groupId]
  );
}

/* ------------------------------------------------------------------
   Alergias alimentarias del RSVP (v4).

   Array opcional `allergies: [{ guest_id, has_allergy, notes }]`.
   `has_allergy` debe ser boolean o null; `notes` string (máx. 500).
------------------------------------------------------------------ */

const RSVP_ALLERGY_NOTES_MAX = 500;

// Devuelve { present, entries } o { error }. `present` indica si el cliente
// v4 envió el array; si no viene (undefined/null), no se tocan las columnas.
function parseAllergiesInput(value) {
  if (value === undefined || value === null) return { present: false, entries: [] };
  if (!Array.isArray(value)) {
    return { error: 'El campo "allergies" debe ser un arreglo' };
  }

  const entries = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { error: `allergies[${index}] es inválido` };
    }

    const guestId = Number(item.guest_id);
    if (!Number.isInteger(guestId) || guestId <= 0) {
      return { error: `allergies[${index}].guest_id es inválido` };
    }

    if (
      item.has_allergy !== true &&
      item.has_allergy !== false &&
      item.has_allergy !== null
    ) {
      return { error: `allergies[${index}].has_allergy debe ser boolean o null` };
    }

    const rawNotes = item.notes == null ? "" : item.notes;
    if (typeof rawNotes !== "string") {
      return { error: `allergies[${index}].notes debe ser texto` };
    }
    const notes = rawNotes.trim();
    if (notes.length > RSVP_ALLERGY_NOTES_MAX) {
      return {
        error: `allergies[${index}].notes no puede superar los ${RSVP_ALLERGY_NOTES_MAX} caracteres`,
      };
    }

    entries.push({
      guest_id: guestId,
      has_allergy: item.has_allergy,
      notes,
    });
  }

  return { present: true, entries };
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
        eventAccountId: inv.stripe_account_id,
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

    // Lectura previa de pases: alimenta las guardas de plazo/congelado. La
    // respuesta se relee de la BD después de la transacción.
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

    const allergyInput = parseAllergiesInput(req.body.allergies);
    if (allergyInput.error) {
      return res.status(400).json({ error: allergyInput.error });
    }
    const allergyEntries = allergyInput.entries;

    const allIds = [
      ...allowIds,
      ...declineIds,
      ...allergyEntries.map((entry) => entry.guest_id),
    ];

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

    // Sets de asistencia: "no asistirá" gana ante un id duplicado, igual que
    // el orden de los UPDATE de asistencia dentro de la transacción.
    const allowSet = new Set(allowIds);
    const declineSet = new Set(declineIds);

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

      // Alergias: solo si el cliente v4 envió el array. Cada entrada sigue la
      // asistencia resultante: sin asistencia (o has_allergy null) => NULL.
      if (allergyInput.present) {
        for (const entry of allergyEntries) {
          const attends = allowSet.has(entry.guest_id) && !declineSet.has(entry.guest_id);
          let allergy = null;
          let allergyNotes = null;
          if (attends && typeof entry.has_allergy === "boolean") {
            allergy = entry.has_allergy;
            if (entry.has_allergy) allergyNotes = entry.notes;
          }
          await conn.query(
            `UPDATE guests
                SET allergy = $1, allergy_notes = $2
              WHERE id = $3 AND group_id = $4`,
            [allergy, allergyNotes, entry.guest_id, inv.group_id]
          );
        }
      }

      const noteStr = typeof note === "string" ? note.trim().slice(0, 500) : null;
      await conn.query(`UPDATE "groups" SET rsvp_note = $1 WHERE id = $2`, [
        noteStr,
        inv.group_id,
      ]);
      return noteStr;
    });

    // Relee los pases: la respuesta refleja exactamente la asistencia y las
    // alergias persistidas (no una reconstrucción en memoria).
    const updatedGuests = await getGuests(inv.group_id);

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

/* ------------------------------------------------------------------
   Mensaje privado para los novios (v3).

   Público (token de invitación). El mensaje SIEMPRE se guarda; el aviso
   por correo es best-effort: si no hay canal, destinatario o el envío
   falla, se loguea y el invitado recibe igualmente `{ ok: true }`.
------------------------------------------------------------------ */

router.post("/:token/gift-message", giftMessageLimiter, async (req, res, next) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return res.status(400).json({ error: "El mensaje no puede estar vacío" });
  }
  if (message.length > 1000) {
    return res.status(400).json({ error: "El mensaje no puede superar los 1000 caracteres" });
  }

  // QA: el frontend puede enviar `amount: 0` cuando el invitado deja el monto
  // vacío. Se trata como "sin monto": no se exige moneda, no se guarda
  // `amount_minor`/`currency` y el correo recibe `null` ("No indicó monto").
  // Los montos negativos, decimales o de tipo inválido siguen dando 400.
  const hasAmount =
    body.amount !== undefined && body.amount !== null && body.amount !== 0;
  let amountMinor = null;
  let currency = null;
  if (hasAmount) {
    if (!Number.isInteger(body.amount) || body.amount < 0) {
      return res.status(400).json({ error: "El monto debe ser un entero mayor o igual a 0" });
    }
    if (body.amount > MAX_AMOUNT) {
      return res.status(400).json({ error: `El monto máximo es ${MAX_AMOUNT}` });
    }
    if (!SUPPORTED_CURRENCIES.includes(body.currency)) {
      return res.status(400).json({ error: 'Moneda inválida: usa "mxn" o "eur"' });
    }
    amountMinor = body.amount * 100;
    currency = body.currency;
  }

  const channel =
    body.channel === undefined || body.channel === null ? "transfer" : body.channel;
  if (channel !== "transfer" && channel !== "card") {
    return res.status(400).json({ error: 'Canal inválido: usa "transfer" o "card"' });
  }

  try {
    const inv = await findInvitationByToken(req.params.token);
    if (!inv) return res.status(404).json({ error: "Invitación no encontrada" });

    const senderName =
      typeof inv.name === "string" ? inv.name.trim().slice(0, 255) : "";

    await query(
      `INSERT INTO gift_messages
         (event_id, group_id, sender_name, message, amount_minor, currency, channel)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [inv.event_id, inv.group_id, senderName, message, amountMinor, currency, channel]
    );

    // Aviso por correo: privado (gift_message_email) con respaldo en el email
    // del dueño del evento. Cualquier fallo aquí no afecta la respuesta.
    try {
      let recipient =
        typeof inv.gift_message_email === "string" ? inv.gift_message_email.trim() : "";
      if (!recipient && inv.owner_user_id) {
        const owners = await query(`SELECT email FROM users WHERE id = $1 LIMIT 1`, [
          inv.owner_user_id,
        ]);
        recipient = owners[0]?.email ? String(owners[0].email).trim() : "";
      }

      if (!recipient) {
        console.warn(
          "[gift-message] Mensaje guardado sin aviso: no hay correo configurado",
          { event_id: inv.event_id }
        );
      } else {
        await sendGiftMessageEmail({
          to: recipient,
          eventName: inv.event_name,
          senderName,
          senderLeader: inv.leader_name || "",
          message,
          amount: hasAmount ? body.amount : null,
          currency,
          channel,
          eventId: inv.event_id,
        });
      }
    } catch (mailErr) {
      console.error(
        "[gift-message] No se pudo enviar el aviso por correo:",
        mailErr.message
      );
    }

    res.json({ ok: true });
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
    // application_fee. Si el evento tiene una cuenta seleccionada
    // (`stripe_account_id`), es la única admitida para cualquier moneda; sin
    // ella se conserva la resolución legacy por moneda
    // (`stripe_account_<currency>` ?? cuenta del dueño habilitada con esa
    // `default_currency`). Sin destino válido la tarjeta queda deshabilitada.
    const overrideAccountId =
      currency === "mxn" ? inv.stripe_account_mxn : inv.stripe_account_eur;
    const eventAccountId = inv.stripe_account_id;
    const destination = await resolveStripeDestination({
      currency,
      overrideAccountId,
      ownerUserId: inv.owner_user_id,
      eventAccountId,
    });
    if (!destination) {
      // La cuenta del evento está seleccionada pero no se puede usar
      // (deshabilitada, ajena o inexistente): no hay fallback. Mensaje
      // estable y sin detalles internos para el invitado.
      if (typeof eventAccountId === "string" && eventAccountId.trim() !== "") {
        return res.status(400).json({
          error: "La cuenta de Stripe seleccionada para este evento no está habilitada para cobros.",
        });
      }
      return res.status(400).json({
        error: "El pago con tarjeta no está disponible para esta moneda por el momento",
      });
    }

    // Destination charge cross-región (p. ej. plataforma MX -> cuenta ES):
    // Stripe exige `on_behalf_of` para liquidar el cargo en la región del
    // destino. Mismo país no lo lleva (comportamiento previo intacto). El
    // país de la plataforma se cachea en memoria (`getPlatformCountry`).
    const platformCountry = await getPlatformCountry();
    const paymentIntentData = buildPaymentIntentData(destination, platformCountry);

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
      // resuelta para la moneda (sin application_fee_amount), con
      // `on_behalf_of` solo si el destino está fuera de la región.
      payment_intent_data: paymentIntentData,
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