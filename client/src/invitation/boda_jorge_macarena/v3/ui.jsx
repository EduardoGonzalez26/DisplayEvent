import { useEffect } from "react";

/* ------------------------------------------------------------------
   Sistema visual v3: primitivas reutilizables y valores de respaldo del
   prototipo aprobado. Todo se apoya en `v3.css` (scope `.mjv3` y
   `[data-invitation-theme="boda_jorge_macarena"]`).
------------------------------------------------------------------- */

export const DEFAULT_STORY = [
  "A nuestra familia y amigos, gracias por acompañarnos en este capítulo tan importante de nuestra historia. A quienes nos acompañáis desde España, gracias por compartir con nosotros esta ciudad tan mágica. Y a todos los que cruzarán el charco desde México dejando el corazón en cada kilómetro de vuelo, y a los que vienen de otras partes del mundo: ¡gracias infinitas!",
  "El tequila y la cerveza Alhambra corren por nuestra cuenta. ¡A celebrar!",
].join("\n\n");

export const DEFAULT_ICEBREAKER_TEXT =
  "Dos días antes de la boda nos reuniremos de manera informal para brindar, romper el hielo y que nuestras familias y amigos de ambos lados del charco se conozcan.";

export const DEFAULT_RECOMMENDATIONS = [
  {
    icon: "shoe",
    title: "Calzado",
    text: "Para ellas, os recomendamos tacón bajo o ancho: de la iglesia al Carmen iremos caminando por calles empedradas.",
  },
  {
    icon: "weather",
    title: "Clima",
    text: "Granada es de contrastes: de día hace calor y por la noche puede refrescar bastante. Traed algo para abrigaros.",
  },
  {
    icon: "transport",
    title: "Transporte",
    text: "Por los acontecimientos recientes, de momento no recomendamos viajar en tren. Os sugerimos avión, autobús o alquilar un coche.",
  },
  {
    icon: "taxi",
    title: "Moverse por Granada",
    text: "Dentro de la ciudad es más práctico usar **PideTaxi**, el servicio de taxis por WhatsApp, que Uber. Teléfono: {phone}. También podéis bajar su app en App Store o Google Play.",
    phone: "+34 958 28 00 00",
  },
  {
    icon: "stay",
    title: "Alojamiento",
    text: "Os recomendamos alojaros en el Albaicín o sus alrededores: estaréis a un paseo de la iglesia y del Carmen.",
  },
];

export const DEFAULT_LOCATION_EYEBROWS = ["Ceremonia religiosa", "Recepción y fiesta"];

export const DEFAULT_LODGING = [
  {
    name: "Hotel Alhambra Palace",
    note: "Un clásico de Granada, con vistas a la ciudad desde la colina de la Alhambra.",
    url: "https://www.google.com/maps/search/?api=1&query=Hotel%20Alhambra%20Palace%2C%20Granada",
  },
  {
    name: "Parador de Granada",
    note: "Dentro del recinto de la Alhambra, en un antiguo convento.",
    url: "https://www.google.com/maps/search/?api=1&query=Parador%20de%20Granada",
  },
];

export const DEFAULT_DRESS = {
  labels: ["Formal"],
  note: "Queremos veros guapísimos.",
};

export const DEFAULT_STAY_QUOTE =
  "«Dale limosna, mujer,\nque no hay en la vida nada\ncomo la pena de ser\nciego en Granada.»";
export const DEFAULT_STAY_QUOTE_AUTHOR = "Poeta mexicano: Francisco de Icaza";

export const WEDDING_TARGET = "2027-06-10T18:00:00+02:00";
export const RSVP_DEADLINE_DEFAULT = "2027-02-21T14:00:00+01:00";

/* ------------------------------------------------------------------
   Revelado al hacer scroll: `[data-rv]` y `[data-foto]` (mismo gesto
   que el prototipo). Respeta `prefers-reduced-motion`.
------------------------------------------------------------------- */
export function useV3Reveal(rootRef, readyKey = "always") {
  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return undefined;

    let reduce = false;
    try {
      reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* noop */
    }

    const targetSelector = "[data-rv], [data-foto]";
    const nodes = Array.from(root.querySelectorAll(targetSelector));

    if (reduce || typeof IntersectionObserver === "undefined") {
      nodes.forEach((el) => {
        if (el.hasAttribute("data-rv")) el.classList.add("rv-seen");
        if (el.hasAttribute("data-foto")) el.classList.add("visto");
      });
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          if (el.hasAttribute("data-rv")) el.classList.add("rv-seen");
          if (el.hasAttribute("data-foto")) el.classList.add("visto");
          io.unobserve(el);
        });
      },
      { threshold: 0.12 }
    );

    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef, readyKey]);
}

/* Variantes móviles disponibles en el paquete. `c-p2.webp` no tiene
   versión -720, así que debe conservar la ruta original. */
const MOBILE_DRAWING_VARIANTS = new Set([
  "c-portada",
  "c-historia",
  "c-icebreaker",
  "c-iglesia",
  "c-alhambra",
  "c-p7",
  "c-p10",
  "c-p9",
  "c-p3",
  "c-p1",
  "c-p5",
]);

function mobileDrawingSrc(src) {
  const raw = String(src || "").trim();
  if (!raw) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) return "";
  const match = raw.match(/(?:^|\/)invitations\/macarena-jorge-v3\/(c-[^/]+)\.webp$/);
  if (!match || !MOBILE_DRAWING_VARIANTS.has(match[1])) return "";
  return raw.replace(/\.webp$/, "-720.webp");
}

/* Dibujo con transparencia: el papel se transparenta con multiply. */
export function Drawing({
  src,
  alt,
  ratio = "3 / 4",
  rotate = 0,
  className = "",
  style,
  children,
}) {
  if (!src) return null;
  const mobileSrc = mobileDrawingSrc(src);
  return (
    <div
      className={className}
      data-foto="1"
      style={{ "--r": `${rotate}deg`, ...style }}
    >
      <div
        role="img"
        aria-label={alt || "Dibujo de Macarena y Jorge"}
        className="mj-drawing"
        style={{
          aspectRatio: ratio,
          "--mj-bg": `url("${src}")`,
          "--mj-bg-mobile": `url("${mobileSrc || src}")`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function NazariFrame({ cover = false }) {
  return (
    <div
      aria-hidden="true"
      className={`mjv3-frame${cover ? " mjv3-frame--cover" : ""}`}
    >
      <div className="nzx mjv3-frame-top" />
      <div className="nzx mjv3-frame-bottom" />
      <div className="nzy mjv3-frame-left" />
      <div className="nzy mjv3-frame-right" />
      <div className="nzc mjv3-frame-corner mjv3-frame-corner--tl" />
      <div className="nzc mjv3-frame-corner mjv3-frame-corner--tr" />
      <div className="nzc mjv3-frame-corner mjv3-frame-corner--bl" />
      <div className="nzc mjv3-frame-corner mjv3-frame-corner--br" />
    </div>
  );
}

export function OrnamentRule() {
  return (
    <div className="mjv3-ornament" aria-hidden="true">
      <div className="mjv3-ornament-line" />
      <span className="granada" />
      <div className="mjv3-ornament-line" />
    </div>
  );
}

export function Eyebrow({ children, size = "lg", className = "" }) {
  return (
    <div className={`mj-label mj-label--${size} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function InfoCard({
  label,
  value,
  compact = false,
  grid = false,
  valueSize = "",
  labelSize = "",
  className = "",
}) {
  return (
    <div
      className={`mjv3-card mjv3-info-card${
        compact ? " mjv3-info-card--compact" : ""
      }${grid ? " mjv3-info-card--grid" : ""} ${className}`.trim()}
    >
      <div className={`mjv3-info-label ${labelSize}`.trim()}>{label}</div>
      <div className={`mjv3-info-value ${valueSize}`.trim()}>{value}</div>
    </div>
  );
}

export function PaperCard({ as: Tag = "div", className = "", children, ...props }) {
  return (
    <Tag className={`mjv3-card ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

export function Button({
  as: Tag = "button",
  variant = "primary",
  size = "",
  className = "",
  children,
  ...props
}) {
  const cls = [
    "mjv3-btn",
    variant === "outline" ? "mjv3-btn--outline" : "",
    variant === "link" ? "mjv3-btn--link" : "",
    size === "sm" ? "mjv3-btn--sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} {...props}>
      {children}
    </Tag>
  );
}

/* Utilidad de copiado con fallback (misma que usaba la mesa v2). */
export function legacyCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* cae al fallback */
  }
  return legacyCopy(String(text ?? ""));
}
