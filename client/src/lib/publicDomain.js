/* ------------------------------------------------------------------
   Dominio personalizado por evento.
   Contrato: se guarda como hostname sin protocolo (p. ej.
   "macarenayjorge.com"; el backend quita además el `www.` inicial y la
   barra final). Con dominio propio, el enlace público de cada grupo es
   https://<dominio>/invitacion/<token> (SIN slug). Sin dominio se
   conserva el formato actual: origen + slug opcional + token.
------------------------------------------------------------------ */

// Normaliza un dominio escrito por el usuario: minúsculas, sin protocolo,
// sin `www.` inicial ni barras finales. Misma semántica que el backend.
export function normalizeDomain(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

// Enlace público de una invitación.
// - Con `domain`: https://<domain>/invitacion/<token> (sin slug).
// - Sin `domain`: <origin>/invitacion[/<slug>]/<token> (comportamiento actual).
export function buildInviteUrl({ domain, slug, token, origin } = {}) {
  if (!token) return "";
  const custom = normalizeDomain(domain);
  if (custom) return `https://${custom}/invitacion/${token}`;
  const base = `${origin || window.location.origin}/invitacion`;
  const cleanSlug = String(slug ?? "").trim();
  return cleanSlug ? `${base}/${cleanSlug}/${token}` : `${base}/${token}`;
}

// true si el dominio configurado corresponde al host actual (tolera `www.`
// en cualquiera de los dos). Lo usa el white-label de la invitación.
export function isCustomDomainActive(publicDomain, hostname) {
  const expected = normalizeDomain(publicDomain);
  if (!expected) return false;
  const host = normalizeDomain(hostname ?? window.location.hostname);
  return expected === host;
}
