import { query } from "../db/index.js";

/* ------------------------------------------------------------------
   Resolución del destino del pago (Stripe Connect, destination charges).

   El 100% del cobro se transfiere al anfitrión (sin application_fee).
   El destino se elige POR MONEDA:
     1) override del evento (`events.stripe_account_mxn`/`_eur`) si la
        cuenta existe, está habilitada y su `default_currency` coincide;
     2) cuenta del usuario dueño del evento con esa `default_currency` y
        `charges_enabled`.

   `pickStripeDestination` es pura y testeable; `resolveStripeDestination`
   y `resolveCardAvailability` son los wrappers con una única consulta SQL.
------------------------------------------------------------------- */

// Fila válida como destino para `currency`.
function isEligible(row, currency) {
  return (
    row &&
    row.charges_enabled === true &&
    typeof row.default_currency === "string" &&
    row.default_currency.toLowerCase() === currency
  );
}

// Pura: elige la fila destino dados los candidatos (override + dueño).
// - `currency`: "mxn" | "eur" (se normaliza a minúsculas).
// - `overrideAccountId`: `acct_...` del evento para esa moneda (o null).
// - `ownerUserId`: dueño del evento (fallback cuando no hay override válido).
// - `accounts`: filas candidatas de `stripe_accounts`.
// Devuelve la fila elegida o null.
export function pickStripeDestination({ currency, overrideAccountId, ownerUserId, accounts }) {
  const cur = typeof currency === "string" ? currency.trim().toLowerCase() : "";
  if (!cur || !Array.isArray(accounts)) return null;

  if (overrideAccountId) {
    const override = accounts.find(
      (row) => row.stripe_account_id === overrideAccountId && isEligible(row, cur)
    );
    if (override) return override;
  }

  return (
    accounts.find((row) => row.user_id === ownerUserId && isEligible(row, cur)) || null
  );
}

const CANDIDATE_COLUMNS = `user_id, stripe_account_id, country, default_currency,
                           charges_enabled, payouts_enabled, details_submitted`;

// Destino para UNA moneda del pago de un evento (override ?? cuenta del dueño).
export async function resolveStripeDestination({ currency, overrideAccountId, ownerUserId }) {
  const rows = await query(
    `SELECT ${CANDIDATE_COLUMNS}
       FROM stripe_accounts
      WHERE user_id = $1
         OR stripe_account_id = $2`,
    [ownerUserId, overrideAccountId || null]
  );
  return pickStripeDestination({ currency, overrideAccountId, ownerUserId, accounts: rows });
}

// Disponibilidad de tarjeta por moneda para la vista pública (una sola query).
// El llamador decide si aplica (registry con pago habilitado + Stripe configurado).
export async function resolveCardAvailability({ ownerUserId, overrideMxn, overrideEur }) {
  const overrides = [overrideMxn, overrideEur].filter(Boolean);
  const rows = await query(
    `SELECT ${CANDIDATE_COLUMNS}
       FROM stripe_accounts
      WHERE user_id = $1
         OR stripe_account_id = ANY($2::text[])`,
    [ownerUserId, overrides]
  );
  const available = (currency, overrideAccountId) =>
    Boolean(
      pickStripeDestination({ currency, overrideAccountId, ownerUserId, accounts: rows })
    );
  return {
    mxn: available("mxn", overrideMxn),
    eur: available("eur", overrideEur),
  };
}
