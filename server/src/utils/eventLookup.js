import { query } from "../db/index.js";
import { isReservedCustomDomain, normalizeHost } from "./customDomain.js";

/* ------------------------------------------------------------------
   Búsqueda pública del evento por dominio personalizado.

   Única fuente del SQL que resuelve la portada white-label: la usan
   `routes/public.js` (API pública) y la inyección de metadatos de la SPA
   en `index.js`. Selecciona SOLO campos públicos (sin dueño, Stripe,
   grupos, invitados ni tokens) y normaliza el host antes de consultar.
------------------------------------------------------------------- */

export async function findEventByCustomDomain(host) {
  const domain = normalizeHost(host);
  // Los dominios del servicio (y hosts no enroutables) nunca son portadas.
  if (!domain || isReservedCustomDomain(domain)) return null;

  const rows = await query(
    `SELECT name, date, time, place, invitation, slug, custom_domain
       FROM events
      WHERE custom_domain = $1
      LIMIT 1`,
    [domain]
  );
  return rows[0] || null;
}
