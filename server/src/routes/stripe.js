import { Router } from "express";
import { query } from "../db/index.js";
import { getStripe } from "../utils/stripe.js";
import { clientUrl } from "../utils/clientUrl.js";

/* ------------------------------------------------------------------
   Stripe Connect (cuentas Express del anfitrión).

   La plataforma cobra al invitado y transfiere el 100% al anfitrión via
   destination charges (sin application_fee). El destino se elige por
   moneda en `utils/stripeDestination.js`.

   Endpoints (montados con `requireAuth` en index.js):
     - POST /create-account  -> crea la cuenta Express + link de onboarding.
     - GET  /accounts        -> cuentas del usuario con su estado.
------------------------------------------------------------------- */

const router = Router();

// Países soportados para las cuentas Express y su moneda de liquidación.
// MX -> MXN y ES -> EUR cubren las dos monedas del checkout (MX/ES).
const SUPPORTED_COUNTRIES = { MX: "mxn", ES: "eur" };
const DEFAULT_COUNTRY = "MX";

const ACCOUNT_COLUMNS = `id, stripe_account_id, country, default_currency,
                         charges_enabled, payouts_enabled, details_submitted,
                         created_at, updated_at`;

// Base del dashboard SPA (el frontend del panel aún no tiene ruta propia de
// cuentas; se usan las URLs de retorno sobre /eventos con un marcador).
function dashboardBase() {
  return clientUrl().replace(/\/+$/, "");
}

// POST /create-account -> { account_id, url }
router.post("/create-account", async (req, res, next) => {
  const raw = typeof req.body?.country === "string" ? req.body.country.trim().toUpperCase() : "";
  const country = raw || DEFAULT_COUNTRY;
  if (!SUPPORTED_COUNTRIES[country]) {
    return res.status(400).json({ error: "País no soportado: usa MX o ES" });
  }

  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: "Pagos no configurados" });

  try {
    const account = await stripe.accounts.create({
      type: "express",
      country,
      // `transfers` habilita recibir el destino del pago. En países como ES
      // Stripe exige pedir también `card_payments` (no se usa para cobrar
      // aquí, pero es prerequisito de `transfers`).
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: { user_id: String(req.user.id) },
    });

    const base = dashboardBase();
    const link = await stripe.accountLinks.create({
      account: account.id,
      type: "account_onboarding",
      refresh_url: `${base}/eventos?stripe=refresh`,
      return_url: `${base}/eventos?stripe=return`,
    });

    await query(
      `INSERT INTO stripe_accounts
         (user_id, stripe_account_id, country, default_currency,
          charges_enabled, payouts_enabled, details_submitted)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (stripe_account_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         country = EXCLUDED.country,
         default_currency = EXCLUDED.default_currency,
         charges_enabled = EXCLUDED.charges_enabled,
         payouts_enabled = EXCLUDED.payouts_enabled,
         details_submitted = EXCLUDED.details_submitted,
         updated_at = CURRENT_TIMESTAMP`,
      [
        req.user.id,
        account.id,
        account.country || country,
        account.default_currency || SUPPORTED_COUNTRIES[country],
        Boolean(account.charges_enabled),
        Boolean(account.payouts_enabled),
        Boolean(account.details_submitted),
      ]
    );

    res.status(201).json({ account_id: account.id, url: link.url });
  } catch (err) {
    // Errores de Stripe (p. ej. creación de cuentas v1 deshabilitada por
    // política de la cuenta) se devuelven accionables al panel.
    if (err && typeof err.type === "string" && err.type.startsWith("Stripe")) {
      console.error("[stripe] Error creando cuenta Connect:", err.message);
      return res.status(502).json({
        error: "Stripe rechazó la creación de la cuenta Connect",
        detail: err.raw?.message || err.message,
      });
    }
    next(err);
  }
});

// GET /accounts -> lista de cuentas del usuario (array, como /api/templates).
router.get("/accounts", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${ACCOUNT_COLUMNS}
         FROM stripe_accounts
        WHERE user_id = $1
        ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );

    // Best-effort: refresca el estado en vivo desde Stripe. El webhook
    // `account.updated` también sincroniza; esto permite que el dashboard
    // funcione aunque el webhook aún no esté configurado. Nunca falla la
    // petición por esto (se devuelve el estado persistido).
    const stripe = getStripe();
    if (stripe && rows.length > 0) {
      const synced = await Promise.all(
        rows.map(async (row) => {
          try {
            const account = await stripe.accounts.retrieve(row.stripe_account_id);
            const flags = {
              charges_enabled: Boolean(account.charges_enabled),
              payouts_enabled: Boolean(account.payouts_enabled),
              details_submitted: Boolean(account.details_submitted),
            };
            if (
              flags.charges_enabled !== row.charges_enabled ||
              flags.payouts_enabled !== row.payouts_enabled ||
              flags.details_submitted !== row.details_submitted
            ) {
              await query(
                `UPDATE stripe_accounts
                    SET charges_enabled = $1,
                        payouts_enabled = $2,
                        details_submitted = $3,
                        updated_at = CURRENT_TIMESTAMP
                  WHERE stripe_account_id = $4`,
                [flags.charges_enabled, flags.payouts_enabled, flags.details_submitted, row.stripe_account_id]
              );
            }
            return { ...row, ...flags };
          } catch {
            return row;
          }
        })
      );
      return res.json(synced);
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
