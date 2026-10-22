import { query } from "../db/index.js";
import { getStripe } from "./stripe.js";

/* ------------------------------------------------------------------
   Resolución del destino del pago (Stripe Connect, destination charges).

   El 100% del cobro se transfiere al anfitrión (sin application_fee).

   A) Cuenta EXPLÍCITA del evento (`events.stripe_account_id`):
      si tiene valor, SOLO se admite esa cuenta, siempre que pertenezca
      al dueño del evento y tenga `charges_enabled`. Se usa para
      CUALQUIER moneda (si `default_currency` no coincide, Stripe
      convierte). Si la cuenta no existe, es de otro usuario o está
      deshabilitada, se devuelve null SIN fallback: esto garantiza
      "una sola cuenta activa por evento".

   B) Legacy (sin cuenta explícita): el destino se elige POR MONEDA en
      orden determinista:
        1) override del evento (`events.stripe_account_mxn`/`_eur`) con la
           moneda EXACTA y `charges_enabled`;
        2) cuenta del dueño del evento con la moneda EXACTA y `charges_enabled`;
        3) fallback (Plan B): override del evento habilitado aunque su moneda
           no coincida;
        4) fallback: cuenta del dueño habilitada aunque su moneda no coincida.
      El fallback permite operar con UNA sola cuenta (p. ej. MX) y deja que
      Stripe convierta automáticamente los cobros en otra moneda (EUR -> MXN).
      Entre varias cuentas habilitadas de un mismo nivel se elige la de MENOR
      `id` (estable e independiente del orden de filas que devuelva Postgres).

   `pickStripeDestination` es pura y testeable; `resolveStripeDestination`
   y `resolveCardAvailability` son los wrappers con una única consulta SQL
   y usan EXACTAMENTE esta resolución (disponibilidad y pago no divergen).
------------------------------------------------------------------- */

// Fila habilitada para recibir transferencias.
function isEnabled(row) {
  return Boolean(row) && row.charges_enabled === true;
}

// Fila habilitada con la moneda exacta solicitada.
function isExact(row, currency) {
  return (
    isEnabled(row) &&
    typeof row.default_currency === "string" &&
    row.default_currency.toLowerCase() === currency
  );
}

// Selección determinista: menor `id` (las filas sin id numérico van al final).
function byIdAsc(a, b) {
  const ia = Number.isFinite(Number(a?.id)) ? Number(a.id) : Number.MAX_SAFE_INTEGER;
  const ib = Number.isFinite(Number(b?.id)) ? Number(b.id) : Number.MAX_SAFE_INTEGER;
  return ia - ib;
}

function firstById(rows) {
  return rows.length ? rows.slice().sort(byIdAsc)[0] : null;
}

// `acct_...` canónico o null. "" / solo espacios / no-string -> null.
function normalizeAccountId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

// IDs únicos (y no vacíos) para la consulta `ANY($n::text[])`.
function candidateAccountIds(...ids) {
  return [...new Set(ids.map(normalizeAccountId).filter(Boolean))];
}

// Pura: elige la fila destino dados los candidatos (cuenta del evento,
// override legacy y cuentas del dueño).
// - `currency`: "mxn" | "eur" (se normaliza a minúsculas).
// - `overrideAccountId`: `acct_...` legacy del evento para esa moneda (o null).
// - `ownerUserId`: dueño del evento.
// - `eventAccountId`: cuenta explícita del evento (o null).
// - `accounts`: filas candidatas de `stripe_accounts`.
// Devuelve la fila elegida o null.
export function pickStripeDestination({
  currency,
  overrideAccountId,
  ownerUserId,
  eventAccountId,
  accounts,
}) {
  const cur = typeof currency === "string" ? currency.trim().toLowerCase() : "";
  if (!cur || !Array.isArray(accounts)) return null;

  // A) Cuenta explícita del evento: la MISMA para cualquier moneda.
  // Sin fallback si no es válida: una sola cuenta activa por evento.
  const eventId = normalizeAccountId(eventAccountId);
  if (eventId) {
    return (
      accounts.find(
        (row) =>
          row &&
          row.stripe_account_id === eventId &&
          row.user_id === ownerUserId &&
          isEnabled(row)
      ) || null
    );
  }

  // B) Legacy: resolución por moneda.
  const overrideId = normalizeAccountId(overrideAccountId);
  const overrideRow = overrideId
    ? accounts.find((row) => row && row.stripe_account_id === overrideId) || null
    : null;

  // 1) override del evento con moneda exacta.
  if (overrideRow && isExact(overrideRow, cur)) return overrideRow;

  // 2) cuenta del dueño con moneda exacta (menor id si hay varias).
  const exactOwner = firstById(
    accounts.filter((row) => row && row.user_id === ownerUserId && isExact(row, cur))
  );
  if (exactOwner) return exactOwner;

  // 3) fallback: override habilitado (moneda distinta -> Stripe convierte).
  if (isEnabled(overrideRow)) return overrideRow;

  // 4) fallback: cuenta del dueño habilitada (moneda distinta), menor id.
  return firstById(accounts.filter((row) => row && row.user_id === ownerUserId && isEnabled(row)));
}

// `id` es imprescindible: el desempate determinista de `pickStripeDestination`
// elige la fila de MENOR `id` (sin este campo, la ordenación no tendría datos).
const CANDIDATE_COLUMNS = `id, user_id, stripe_account_id, country, default_currency,
                           charges_enabled, payouts_enabled, details_submitted`;

// Destino para UNA moneda del pago de un evento. Aplica la cuenta explícita
// del evento o, en su ausencia, el orden legacy completo (exacto -> fallback
// Plan B con conversión).
export async function resolveStripeDestination({
  currency,
  overrideAccountId,
  ownerUserId,
  eventAccountId,
}) {
  const eventId = normalizeAccountId(eventAccountId);
  const overrideId = normalizeAccountId(overrideAccountId);
  const rows = await query(
    `SELECT ${CANDIDATE_COLUMNS}
       FROM stripe_accounts
      WHERE user_id = $1
         OR stripe_account_id = ANY($2::text[])`,
    [ownerUserId, candidateAccountIds(eventId, overrideId)]
  );
  return pickStripeDestination({
    currency,
    overrideAccountId: overrideId,
    ownerUserId,
    eventAccountId: eventId,
    accounts: rows,
  });
}

// Disponibilidad de tarjeta por moneda para la vista pública (una sola query).
// El llamador decide si aplica (registry con pago habilitado + Stripe configurado).
// Con cuenta de evento seleccionada, ambas monedas comparten el mismo destino:
// { mxn: true, eur: true } si es válida y está habilitada, o
// { mxn: false, eur: false } si está seleccionada pero no se puede usar.
export async function resolveCardAvailability({
  ownerUserId,
  overrideMxn,
  overrideEur,
  eventAccountId,
}) {
  const eventId = normalizeAccountId(eventAccountId);
  const mxnId = normalizeAccountId(overrideMxn);
  const eurId = normalizeAccountId(overrideEur);
  const rows = await query(
    `SELECT ${CANDIDATE_COLUMNS}
       FROM stripe_accounts
      WHERE user_id = $1
         OR stripe_account_id = ANY($2::text[])`,
    [ownerUserId, candidateAccountIds(eventId, mxnId, eurId)]
  );
  const available = (currency, overrideAccountId) =>
    Boolean(
      pickStripeDestination({
        currency,
        overrideAccountId,
        ownerUserId,
        eventAccountId: eventId,
        accounts: rows,
      })
    );
  return {
    mxn: available("mxn", mxnId),
    eur: available("eur", eurId),
  };
}

/* ------------------------------------------------------------------
   on_behalf_of (destinos fuera de la región de la plataforma).

   Stripe rechaza las destination charges hacia cuentas conectadas fuera
   de la región de la plataforma (p. ej. plataforma MX -> cuenta ES) salvo
   que el cargo se liquide en la región del destino vía `on_behalf_of`.
   El país de la plataforma se obtiene UNA vez (`stripe.accounts.retrieve`)
   y se cachea en memoria, con el mismo patrón lazy que `getStripe()`.
------------------------------------------------------------------- */

let platformCountryPromise = null;

// País de la cuenta plataforma ("MX", "ES", ...) o null si no se pudo
// resolver (p. ej. error de red). Cacheado; si falla, se reintenta en la
// siguiente llamada.
export function getPlatformCountry() {
  if (!platformCountryPromise) {
    platformCountryPromise = (async () => {
      const stripe = getStripe();
      if (!stripe) return null;
      try {
        const account = await stripe.accounts.retrieve();
        const country =
          typeof account.country === "string" ? account.country.trim().toUpperCase() : "";
        return country || null;
      } catch (err) {
        console.error("[stripe] No se pudo obtener el país de la plataforma:", err.message);
        platformCountryPromise = null; // permite reintentar en la próxima petición
        return null;
      }
    })();
  }
  return platformCountryPromise;
}

// Pura: ¿el destino requiere `on_behalf_of`?
// - Mismo país que la plataforma -> false (comportamiento previo intacto:
//   no cambia el merchant of record ni el statement descriptor).
// - País distinto -> true (Stripe lo exige para liquidar cross-region).
// - País desconocido (plataforma o destino) -> true: con `charges_enabled`
//   ya garantizado por la resolución, `on_behalf_of` es válido en ambas
//   regiones y evita que el cargo falle por el chequeo cross-region.
export function destinationNeedsOnBehalfOf(destination, platformCountry) {
  if (!destination || typeof destination !== "object") return false;
  const platform = typeof platformCountry === "string" ? platformCountry.trim().toUpperCase() : "";
  const country = typeof destination.country === "string" ? destination.country.trim().toUpperCase() : "";
  if (!platform || !country) return true;
  return country !== platform;
}

// Datos de `payment_intent_data` para la Checkout Session: transferencia
// íntegra al destino y `on_behalf_of` solo cuando el destino cruza región.
export function buildPaymentIntentData(destination, platformCountry) {
  const data = { transfer_data: { destination: destination.stripe_account_id } };
  if (destinationNeedsOnBehalfOf(destination, platformCountry)) {
    data.on_behalf_of = destination.stripe_account_id;
  }
  return data;
}
