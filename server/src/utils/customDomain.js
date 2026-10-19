import { isIP } from "node:net";

/* ------------------------------------------------------------------
   Dominio personalizado por evento (`events.custom_domain`).

   Única fuente de normalización/validación: la reutilizan las rutas de
   administración (`routes/events.js`) y la resolución pública por host
   (`utils/eventLookup.js`, `routes/public.js`, `utils/ogMeta.js`).

   El valor almacenado es un hostname: minúsculas, sin protocolo, sin
   `www.` inicial y sin barra final.
------------------------------------------------------------------- */

export const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
export const DOMAIN_MAX_LENGTH = 255;

// Dominios propios del servicio o no enroutables públicamente.
const RESERVED_DOMAINS = new Set(["displayevent.com", "localhost", "railway.app"]);

// Normaliza lo que llega del cliente (trim, lower, sin protocolo/www/barra
// final). "" si no queda nada.
export function normalizeCustomDomain(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

// Reservados: nuestro propio dominio (con subdominios), localhost, IPs
// literales (v4/v6) y cualquier host de Railway.
export function isReservedCustomDomain(domain) {
  if (RESERVED_DOMAINS.has(domain)) return true;
  if (domain.endsWith(".displayevent.com")) return true;
  if (domain.endsWith(".railway.app")) return true;
  if (isIP(domain) !== 0) return true;
  return false;
}

// Hostname de la petición para resolver un dominio personalizado:
// minúsculas, sin puerto, sin punto final y sin `www.` inicial.
// Tolera tanto `req.hostname` (Express ya quita el puerto) como el header
// `Host` crudo, e IPv6 entre corchetes.
export function normalizeHost(value) {
  if (typeof value !== "string") return "";
  let host = value.trim().toLowerCase();
  if (!host) return "";

  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end !== -1) host = host.slice(1, end);
  } else if (isIP(host) === 0) {
    host = host.replace(/:\d+$/, "");
  }

  return host.replace(/\.+$/, "").replace(/^www\./, "");
}
