import { Reveal, motion, EASE } from "../motion.jsx";

export { Reveal };

/* ------------------------------------------------------------------
   Elementos decorativos compartidos
------------------------------------------------------------------ */

export function Ornament({ className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-inv-primary ${className}`}>
      <span className="h-px w-14 bg-gradient-to-r from-transparent to-inv-primary/60" />
      <span className="w-1 h-1 rotate-45 bg-inv-primary/70 inline-block" />
      <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
        <path d="M6 0 8 6 6 12 4 6 6 0Z" />
      </svg>
      <span className="w-1 h-1 rotate-45 bg-inv-primary/70 inline-block" />
      <span className="h-px w-14 bg-gradient-to-l from-transparent to-inv-primary/60" />
    </div>
  );
}

export function Corner({ className }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className={`absolute w-10 h-10 md:w-14 md:h-14 ${className}`}
    >
      <path d="M2 39 V10 Q2 2 10 2 H39" />
      <path d="M8 39 V14 Q8 8 14 8 H39" opacity=".45" />
    </svg>
  );
}

/* ------------------------------------------------------------------
   Utilidades de animación
------------------------------------------------------------------ */

export function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <Reveal className="text-center mb-12">
      <div className="flex items-center justify-center gap-3 mb-5">
        <span className="h-px w-9 bg-gradient-to-r from-transparent to-inv-primary/60" />
        <span className="text-inv-primary text-[0.65rem] uppercase tracking-[0.45em]">
          {eyebrow}
        </span>
        <span className="h-px w-9 bg-gradient-to-l from-transparent to-inv-primary/60" />
      </div>
      <h2 className="font-inv-heading text-4xl md:text-5xl text-gold-gradient text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-inv-text font-light max-w-xl mx-auto text-lg">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

/* ------------------------------------------------------------------
   Estados de carga y error
------------------------------------------------------------------ */

/* Recuerdo del tema por token (solo el id del tema, ningún dato personal):
   permite que recargas y visitas repetidas pinten el loader del tema desde
   el primer frame. Todo en try/catch (modo privado, cuota, SSR). */
const THEME_KEY_PREFIX = "de:inv-theme:";
const THEME_ID_RE = /^[a-z0-9_-]{1,48}$/i;

export function readStoredThemeId(token) {
  if (!token) return null;
  try {
    const id = window.localStorage.getItem(THEME_KEY_PREFIX + token);
    return id && THEME_ID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function storeThemeId(token, themeId) {
  if (!token || !themeId || !THEME_ID_RE.test(themeId)) return;
  try {
    window.localStorage.setItem(THEME_KEY_PREFIX + token, themeId);
  } catch {
    /* sin almacenamiento: se usa el loader neutro */
  }
}

/* Loader neutro (papel cálido + grafito, estilos en index.css bajo
   `.inv-loader`). `themeId` solo afina el aspecto de temas conocidos
   (hoy: boda_jorge_macarena); cualquier otro id usa el neutro. */
export function InvitationLoader({ themeId = null }) {
  return (
    <div
      className="inv-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-loader-theme={themeId || undefined}
    >
      <div className="inv-loader__inner">
        <div className="inv-loader__mark" aria-hidden="true">
          &amp;
        </div>
        <div className="inv-loader__orn" aria-hidden="true">
          <i />
        </div>
        <p className="inv-loader__text">Preparando la invitación…</p>
      </div>
    </div>
  );
}

export function InvitationNotFound() {
  return (
    <div className="min-h-screen bg-inv-bg grid place-items-center text-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <motion.div
          className="w-16 h-16 mx-auto mb-5 rounded-full border border-inv-primary/40 bg-inv-surface grid place-items-center font-inv-heading text-3xl text-gold-gradient"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          ×
        </motion.div>
        <h1 className="font-inv-script text-5xl text-gold-gradient mb-3 leading-[1.5]">
          Invitación no encontrada
        </h1>
        <p className="text-inv-text-soft font-light">El enlace no es válido o fue revocado.</p>
        <Ornament className="mt-7" />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Resaltado del nombre de la familia en el mensaje
------------------------------------------------------------------ */

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ------------------------------------------------------------------
   Sanitización de URLs para CSS (evita inyección vía backgroundImage)
------------------------------------------------------------------ */

// Devuelve una URL segura para interpolar en `url('...')` dentro de un
// estilo inline, o `null` si el valor es inseguro/vacío. Acepta únicamente
// URLs absolutas http(s) o rutas relativas que empiezan por `/`; rechaza
// cualquier carácter que permita salir de la cadena CSS (`"`, `'`, `(`, `)`,
// `;`, espacios, backslash) y los protocolos javascript:/data:/vbscript:.
export function safeCssUrl(url) {
  if (typeof url !== "string") return null;
  const value = url.trim();
  if (!value) return null;
  if (/["'();\\\s]/.test(value)) return null;
  if (/^(javascript|data|vbscript):/i.test(value)) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return null;
}

export function highlightMessage(message, family) {
  if (!family) return message;
  const re = new RegExp(`(${escapeRegExp(family)})`, "gi");
  const parts = message.split(re);
  return parts.map((part, i) =>
    part && part.toLowerCase() === family.toLowerCase() ? (
      <span key={i} className="text-gold-gradient whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    )
  );
}