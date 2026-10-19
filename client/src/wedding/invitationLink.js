/* ------------------------------------------------------------------
   Extracción del token de una invitación personal.

   La portada pública acepta:
     - el enlace completo recibido por WhatsApp:
       https://dominio/invitacion/<token>
       https://dominio/invitacion/<slug>/<token>
     - el enlace sin protocolo (dominio/invitacion/<token>)
     - el token suelto, incluso si viene con puntuación alrededor
       (".../abc123.", "(abc123)", etc.)

   Devuelve el token normalizado o null. El token se navega SIEMPRE
   contra el origen actual; no se confía en el host del enlace pegado.
   Los tokens del backend son hex de 32 caracteres (se admite el mismo
   rango que valida el servidor para las rutas de invitación).
------------------------------------------------------------------ */

const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;
const INVITATION_MARKER_RE = /\/invitacion\//i;
const TRAILING_PUNCTUATION_RE = /[.,;:!?)\]}>]+$/;

function cleanInput(raw) {
  return String(raw ?? "")
    .trim()
    // Quita comillas/paréntesis que suelen acompañar al pegar un enlace.
    .replace(/^[\s<>"'(]+|[\s<>"')]+$/g, "")
    .trim();
}

function cutAtSeparator(value) {
  return String(value || "").split(/[\s?#]/, 1)[0];
}

function stripTrailingPunctuation(value) {
  return String(value || "").replace(TRAILING_PUNCTUATION_RE, "");
}

function decodeToken(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function tokenFromSegments(segments) {
  // Rutas válidas: /invitacion/<token> o /invitacion/<slug>/<token>.
  // Cualquier segmento extra (o la ruta sin token) no es una invitación.
  if (segments.length < 1 || segments.length > 2) return null;
  const candidate = stripTrailingPunctuation(segments[segments.length - 1]);
  return decodeToken(candidate);
}

function tokenFromPathname(pathname) {
  const match = String(pathname || "").match(/\/invitacion\/(.*)$/i);
  if (!match) return null;
  return tokenFromSegments(match[1].split("/").filter(Boolean));
}

export function extractInvitationToken(raw) {
  let value = cleanInput(raw);
  if (!value) return null;

  let token = null;

  // Enlace dentro de un mensaje de WhatsApp u otro texto.
  const urlMatch = value.match(/https?:\/\/[^\s<>"']+/i);
  if (urlMatch) {
    const href = stripTrailingPunctuation(urlMatch[0]);
    try {
      const url = new URL(href);
      // Una URL solo es válida si apunta a /invitacion/...
      if (!INVITATION_MARKER_RE.test(url.pathname)) return null;
      token = tokenFromPathname(url.pathname);
    } catch {
      return null;
    }
  } else {
    const marker = value.toLowerCase().lastIndexOf("/invitacion/");
    if (marker >= 0) {
      const remainder = value.slice(marker + "/invitacion/".length);
      const route = cutAtSeparator(remainder);
      const segments = route.split("/").filter(Boolean);
      if (segments.length < 1 || segments.length > 2) return null;
      token = tokenFromSegments(segments);
    } else if (value.includes("/")) {
      // Dominio/ruta pegados sin protocolo y sin /invitacion/.
      return null;
    } else {
      // Token suelto (con posible puntuación final).
      token = decodeToken(stripTrailingPunctuation(cutAtSeparator(value)));
    }
  }

  if (!token || !TOKEN_RE.test(token)) return null;
  // "invitacion" es parte de la ruta, no un token.
  if (/^invitacion$/i.test(token)) return null;
  return token;
}
