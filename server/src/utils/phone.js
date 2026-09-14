/* ------------------------------------------------------------------
   Normalización de teléfonos de líderes para WhatsApp.
   Acepta formatos MX comunes (10 dígitos, +52, "1"+10 legado, 521+10)
   y números internacionales; devuelve E.164 ("+525512345678").
------------------------------------------------------------------ */

export const INVALID_PHONE_ERROR = "El teléfono del líder no es válido";

// Separadores de captura que se ignoran: espacios, guiones, puntos y paréntesis.
const SEPARATORS_RE = /[\s\-.()]/g;

// Normaliza a E.164. `raw` puede ser string o número; `defaultCountry` es la
// lada que se asume para números locales de 10 dígitos.
export function normalizePhone(raw, { defaultCountry = "52" } = {}) {
  if (typeof raw !== "string" && typeof raw !== "number") {
    return { ok: false, error: INVALID_PHONE_ERROR };
  }
  let value = String(raw).trim();
  if (!value) return { ok: false, error: INVALID_PHONE_ERROR };

  value = value.replace(SEPARATORS_RE, "");
  if (!value) return { ok: false, error: INVALID_PHONE_ERROR };

  // "+" internacional o prefijo de marcado "00" (equivalente a "+").
  let international = false;
  if (value.startsWith("+")) {
    international = true;
    value = value.slice(1);
  } else if (value.startsWith("00")) {
    international = true;
    value = value.slice(2);
  }

  if (!/^\d+$/.test(value)) return { ok: false, error: INVALID_PHONE_ERROR };
  const digits = value;

  // Con código de país explícito, E.164 admite de 8 a 15 dígitos.
  if (international) {
    if (digits.length < 8 || digits.length > 15) {
      return { ok: false, error: INVALID_PHONE_ERROR };
    }
    return { ok: true, e164: `+${digits}` };
  }

  // 10 dígitos: número local del país por defecto (México: +52).
  if (digits.length === 10) {
    return { ok: true, e164: `+${defaultCountry}${digits}` };
  }

  // "1" + 10 dígitos: formato MX legado con "1" de larga distancia.
  if (digits.length === 11 && digits.startsWith("1")) {
    return { ok: true, e164: `+${defaultCountry}${digits.slice(1)}` };
  }

  // "52" + 10 dígitos: ya incluye el código de país de México.
  if (digits.length === 12 && digits.startsWith("52")) {
    return { ok: true, e164: `+${digits}` };
  }

  // "521" + 10 dígitos: formato MX legado de WhatsApp.
  if (digits.length === 13 && digits.startsWith("521")) {
    return { ok: true, e164: `+52${digits.slice(3)}` };
  }

  // 11 a 15 dígitos: asumimos que ya incluyen la lada del país.
  if (digits.length >= 11 && digits.length <= 15) {
    return { ok: true, e164: `+${digits}` };
  }

  return { ok: false, error: INVALID_PHONE_ERROR };
}

// wa.me y la Cloud API esperan solo dígitos (sin "+" ni separadores).
export function toWaDigits(e164) {
  return String(e164 ?? "").replace(/\D/g, "");
}
