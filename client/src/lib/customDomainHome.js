/* ------------------------------------------------------------------
   Portada pública en el dominio propio del evento.

   El servidor inyecta `<meta name="de-custom-domain" content="1" />`
   cuando sirve la raíz `/` para un host que coincide con
   `events.custom_domain`. La SPA NO deduce el dominio (nada de
   hardcodear hosts): solo lee esa señal del documento.

   Se usa para montar la portada de la boda en lugar de la landing de
   DisplayEvent. El resto de rutas (`/invitacion/*`, panel, auth)
   conservan sus ramas actuales.
------------------------------------------------------------------ */

export function isCustomDomainHost(doc = typeof document !== "undefined" ? document : null) {
  if (!doc || typeof doc.querySelector !== "function") return false;
  try {
    const meta = doc.querySelector('meta[name="de-custom-domain"]');
    if (!meta) return false;
    // El contrato inyecta content="1". Toleramos también la meta sin
    // contenido (presencia = verdadero) y cualquier valor distinto de 0.
    const content = String(meta.getAttribute("content") ?? "")
      .trim()
      .toLowerCase();
    return content !== "0" && content !== "false";
  } catch {
    return false;
  }
}
