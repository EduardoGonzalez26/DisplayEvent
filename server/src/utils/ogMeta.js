import { normalizeForRead } from "../schemas/invitation.js";
import { buildInvitationUrl } from "./whatsapp.js";

/* ------------------------------------------------------------------
   Metadatos Open Graph dinámicos para `/invitacion/<token>`.

   La SPA (`index.js`) sirve el `index.html` estático para todas las rutas
   no-API; antes de responder a un enlace de invitación, estas funciones
   puras calculan el título/descripción/imagen/URL por invitación y los
   inyectan de forma quirúrgica en la plantilla cacheada. Todo valor se
   escapa para HTML (los nombres los escribe el organizador: XSS).
------------------------------------------------------------------- */

// Descripción deliberadamente genérica: los previews (WhatsApp, etc.) no
// exponen el nombre de la familia ni datos del grupo invitado (privacidad).
export const OG_DESCRIPTION =
  "Acompáñanos a celebrar este momento tan especial. Abre tu invitación para consultar todos los detalles y confirmar tu asistencia.";

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Escapa para usar en texto y atributos HTML.
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

// Token de una ruta de invitación: `/invitacion/<token>` o la URL bonita
// `/invitacion/<slug>/<token>`. null si la ruta no es de invitación o el
// último segmento no parece un token (evita consultas por rutas basura).
export function invitationTokenFromPath(pathname) {
  if (typeof pathname !== "string") return null;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts.length > 3 || parts[0] !== "invitacion") return null;
  let token;
  try {
    token = decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return null;
  }
  return /^[A-Za-z0-9_-]{8,128}$/.test(token) ? token : null;
}

// URL absoluta para og:image. Las http(s) absolutas se respetan; las
// relativas (`/uploads/...`) se resuelven contra el host de la petición.
function absoluteUrl(value, req) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `${req.protocol}:${s}`;
  return `${req.protocol}://${req.get("host")}${s.startsWith("/") ? s : `/${s}`}`;
}

// Título: "{nameB} & {nameA} · Nuestra boda" — misma convención de display
// que el Hero del template v2 (`displayNames` de
// client/src/invitation/boda_jorge_macarena/helpers.js): novia (nameB)
// primero, luego novio (nameA), omitiendo vacíos. Sin nombres -> nombre del
// evento; luego null (se conserva el genérico actual).
function buildTitle(cfg, eventName) {
  const couple = cfg && typeof cfg.couple === "object" ? cfg.couple : {};
  const names = [couple.nameB, couple.nameA]
    .map((n) => String(n || "").trim())
    .filter(Boolean);
  if (names.length > 0) return `${names.join(" & ")} · Nuestra boda`;
  const name = typeof eventName === "string" ? eventName.trim() : "";
  return name || null;
}

// Imagen: hero_image -> gallery[0]. "" cuando no hay (se conserva el
// fallback `og-image.png` de la plantilla).
function buildImage(cfg, req) {
  const hero = absoluteUrl(cfg?.hero_image, req);
  if (hero) return hero;
  const gallery = Array.isArray(cfg?.gallery) ? cfg.gallery : [];
  for (const item of gallery) {
    const image = absoluteUrl(item, req);
    if (image) return image;
  }
  return "";
}

// Metadatos de una invitación. `inv` es una fila de findInvitationByToken.
export function buildInvitationMeta(inv, token, req) {
  const cfg = normalizeForRead(inv?.invitation);
  return {
    title: buildTitle(cfg, inv?.event_name),
    description: OG_DESCRIPTION,
    image: buildImage(cfg, req),
    url: buildInvitationUrl(
      { custom_domain: inv?.custom_domain, slug: inv?.slug },
      { invitation_token: token }
    ),
  };
}

// Metadatos de la portada pública servida en la raíz de un dominio propio.
// `event` es una fila de findEventByCustomDomain (sin token de invitación).
// La imagen cae a `og-image.png` (servida por la SPA en el mismo host).
export function buildEventMeta(event, req) {
  const cfg = normalizeForRead(event?.invitation);
  const domain =
    typeof event?.custom_domain === "string" ? event.custom_domain.trim() : "";
  return {
    title: buildTitle(cfg, event?.name),
    description: OG_DESCRIPTION,
    image: buildImage(cfg, req) || absoluteUrl("/og-image.png", req),
    url: domain ? `https://${domain}/` : absoluteUrl("/", req),
  };
}

// Reemplazo por función: conserva los grupos (prefijo/sufijo de la etiqueta)
// y evita que un `$&`/`$'` en el valor se interprete como patrón de
// sustitución de String.replace.
function replaceTag(html, regex, value) {
  return html.replace(regex, (match, open, close) => `${open}${value}${close}`);
}

// Insertar el marker de dominio propio (y, opcionalmente, una directiva
// robots) inmediatamente después de `<head>`, ANTES del script inline de
// tema. Idempotente: si el documento ya lo tiene, no duplica nada.
export function injectCustomDomainMarker(html, { robots = "" } = {}) {
  if (typeof html !== "string" || !html) return html;
  if (html.includes('name="de-custom-domain"')) return html;

  const tags = ['<meta name="de-custom-domain" content="1" />'];
  if (robots) tags.push(`<meta name="robots" content="${escapeHtml(robots)}" />`);

  return html.replace(
    /<head(?:\s[^>]*)?>/i,
    (tag) => `${tag}\n    ${tags.join("\n    ")}`
  );
}

// Inyecta los metadatos en la plantilla HTML cacheada. Reemplazos quirúrgicos
// por etiqueta: si alguna no existe en la plantilla, el reemplazo es un
// no-op y el resto del documento queda intacto.
function injectMeta(html, meta) {
  if (typeof html !== "string" || !html || !meta) return html;
  let out = html;

  const title = meta.title ? escapeHtml(meta.title) : "";
  const description = meta.description ? escapeHtml(meta.description) : "";
  const image = meta.image ? escapeHtml(meta.image) : "";
  const url = meta.url ? escapeHtml(meta.url) : "";

  if (title) {
    out = replaceTag(out, /(<title>)[\s\S]*?(<\/title>)/i, title);
  }

  // Cada meta con atributos en el orden `property|name="..." content="..."`.
  const setMeta = (attr, name, value) => {
    if (!value) return;
    const re = new RegExp(`(<meta\\s+${attr}="${name}"\\s+content=")[^"]*(")`, "i");
    out = replaceTag(out, re, value);
  };

  setMeta("property", "og:title", title);
  setMeta("name", "description", description);
  setMeta("property", "og:description", description);
  setMeta("property", "og:image", image);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image", image);

  if (url) {
    out = replaceTag(out, /(<link\s+rel="canonical"\s+href=")[^"]*(")/i, url);
    out = replaceTag(out, /(<meta\s+property="og:url"\s+content=")[^"]*(")/i, url);
  }

  return out;
}

// Invitación personalizada: conserva la inyección OG de siempre.
export function injectInvitationMeta(html, meta) {
  return injectMeta(html, meta);
}

// Portada en la raíz de un dominio propio: OG del evento + marker +
// `robots: index, follow` (la portada es el contenido canónico del host).
export function injectEventMeta(html, meta) {
  return injectCustomDomainMarker(injectMeta(html, meta), {
    robots: "index, follow",
  });
}
