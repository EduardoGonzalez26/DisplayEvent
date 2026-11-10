/* ------------------------------------------------------------------
   Rutas de los assets del paquete v3 (copiados por SecDevOps a
   `client/public/invitations/macarena-jorge-v3/`). `BASE_URL` respeta
   despliegues bajo subruta; por defecto es "/".
------------------------------------------------------------------- */

function joinBase(base, path) {
  const left = String(base || "/").replace(/\/+$/, "");
  const right = String(path || "").replace(/^\/+/, "");
  return `${left}/${right}`;
}

export const V3_DIR = joinBase(import.meta.env.BASE_URL, "invitations/macarena-jorge-v3");

export function v3Asset(file) {
  return joinBase(V3_DIR, file);
}

/* Resuelve una imagen configurable para usarla en CSS. Acepta http(s),
   rutas absolutas (/uploads/...) y las rutas del seed (invitations/...).
   Cualquier otro valor relativo o potencialmente inseguro cae al fallback. */
export function resolveInvitationImage(value, fallback = "") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/["'();\\\s]/.test(raw)) return fallback;
  if (/^(javascript|data|vbscript):/i.test(raw)) return fallback;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return raw;
  if (raw.startsWith("invitations/")) {
    return joinBase(import.meta.env.BASE_URL, raw);
  }
  return fallback;
}

export const V3 = {
  portada: v3Asset("c-portada.webp"),
  historia: v3Asset("c-historia.webp"),
  icebreaker: v3Asset("c-icebreaker.webp"),
  iglesia: v3Asset("c-iglesia.webp"),
  alhambra: v3Asset("c-alhambra.webp"),
  p7: v3Asset("c-p7.webp"),
  p2: v3Asset("c-p2.webp"),
  p10: v3Asset("c-p10.webp"),
  p9: v3Asset("c-p9.webp"),
  p3: v3Asset("c-p3.webp"),
  p1: v3Asset("c-p1.webp"),
  p5: v3Asset("c-p5.webp"),
  ideas: {
    ellos: [
      v3Asset("idea-ellos-1.jpg"),
      v3Asset("idea-ellos-2.jpg"),
      v3Asset("idea-ellos-3.jpg"),
    ],
    ellas: [
      v3Asset("idea-ellas-1.jpg"),
      v3Asset("idea-ellas-2.jpg"),
      v3Asset("idea-ellas-3.jpg"),
    ],
  },
  mapaCeremonia: v3Asset("m-ceremonia.webp"),
  mapaRecepcion: v3Asset("m-recepcion.webp"),
  mapaAlbaicin: v3Asset("m-albaicin.webp"),
  webiLogo: v3Asset("webi-logo.png"),
  og: v3Asset("og-v3.jpg"),
};
