import { Reveal } from "../motion.jsx";

/* ------------------------------------------------------------------
   Sistema de ornamentos de la plantilla "XV de Alice".
   Todo el arte es SVG inline de línea fina inspirado en la estética de
   una quinceañera: rosas/peonías (5 pétalos rosa), perlas doradas,
   brotes rosas y hojas finas. Los tallos y hojas se colorean con
   `currentColor` (el consumidor decide el tinte vía clases de color con
   variables `--inv-*`); las flores usan sus propios acentos
   (`--inv-accent-pink`, `--inv-accent-yellow`) vía `style`. Todo
   `aria-hidden`.
------------------------------------------------------------------ */

/* Hoja fina para racimos, divisores y florituras. */
function Leaf({ x, y, flip = false, s = 1, opacity = 0.85 }) {
  return (
    <path
      d="M0 0 C 8 -1, 13 -9, 20 -14 C 13 -5, 11 0, 0 0 Z"
      transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}
      fill="currentColor"
      opacity={opacity}
    />
  );
}

/* Rosa/peonía: 5 pétalos rosa con corazón dorado. */
function Rose({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy="-8"
          rx="3"
          ry="7.5"
          transform={`rotate(${a})`}
          style={{ fill: "var(--inv-accent-pink)" }}
          opacity="0.9"
        />
      ))}
      <circle r="3" style={{ fill: "var(--inv-accent-yellow)" }} />
    </g>
  );
}

/* Brote rosa: tres pétalos con centro dorado. */
function Rosebud({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 120, 240].map((a) => (
        <path
          key={a}
          d="M0 -9 C 4 -7, 5 -2, 0 0 C -5 -2, -4 -7, 0 -9 Z"
          transform={`rotate(${a})`}
          style={{ fill: "var(--inv-accent-pink)" }}
          opacity="0.85"
        />
      ))}
      <circle r="1.6" style={{ fill: "var(--inv-accent-yellow)" }} />
    </g>
  );
}

/* Perla dorada: esfera con brillo y canto cálido. */
function Pearl({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r="4.5" style={{ fill: "var(--inv-accent-yellow)" }} opacity="0.9" />
      <circle
        r="4.5"
        fill="none"
        stroke="var(--inv-accent-orange)"
        strokeWidth="0.9"
        opacity="0.55"
      />
      <circle cx="-1.6" cy="-1.6" r="1.5" fill="#FFFFFF" opacity="0.5" />
    </g>
  );
}

/* ------------------------------------------------------------------
   Rama botánica de esquina: tallo curvo con hojas finas y un racimo de
   flora (rosa + brote + perlas). Se usa en las 4 esquinas de la portada
   (con rotaciones/espejos) y en tarjetas.
------------------------------------------------------------------ */
export function BotanicalCorner({ className = "" }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
    >
      <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        {/* Tallo principal */}
        <path d="M8 116 C 44 112, 72 96, 116 44" fill="none" opacity="0.85" />
        {/* Hojas */}
        <path
          d="M56 100 C 62 90, 72 84, 80 84 C 72 92, 64 98, 56 100 Z"
          fill="currentColor"
          stroke="none"
          opacity="0.9"
        />
        <path
          d="M84 72 C 90 62, 98 58, 106 58 C 98 66, 90 72, 84 72 Z"
          fill="currentColor"
          stroke="none"
          opacity="0.85"
        />
        <path
          d="M104 50 C 109 42, 116 38, 122 38 C 115 46, 108 50, 104 50 Z"
          fill="currentColor"
          stroke="none"
          opacity="0.8"
        />
        {/* Bayas */}
        <circle cx="70" cy="90" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="96" cy="62" r="1.4" fill="currentColor" stroke="none" />
      </g>
      {/* Flora XV */}
      <Rose x={116} y={44} s={1.1} />
      <Rosebud x={62} y={96} s={1} />
      <Pearl x={34} y={118} s={0.85} />
    </svg>
  );
}

/* ------------------------------------------------------------------
   Divisor botánico horizontal: filetes laterales, rama central
   simétrica con hojas y una rosa al centro flanqueada por dos perlas.
------------------------------------------------------------------ */
export function BotanicalDivider({ className = "" }) {
  return (
    <svg
      viewBox="0 0 640 64"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none block ${className}`}
    >
      <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        {/* Filetes laterales */}
        <path d="M24 32 H 246" opacity="0.5" />
        <path d="M394 32 H 616" opacity="0.5" />
      </g>
      {/* Diamantes junto a los filetes */}
      <rect
        x="249"
        y="29"
        width="6"
        height="6"
        transform="rotate(45 252 32)"
        fill="currentColor"
        opacity="0.6"
      />
      <rect
        x="385"
        y="29"
        width="6"
        height="6"
        transform="rotate(45 388 32)"
        fill="currentColor"
        opacity="0.6"
      />
      <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none">
        {/* Rama central: tallo y ramas curvas */}
        <path d="M320 34 C 319 27, 319 22, 320 16" opacity="0.9" />
        <path d="M320 38 C 305 38, 292 41, 278 38" opacity="0.8" />
        <path d="M320 38 C 335 38, 348 41, 362 38" opacity="0.8" />
      </g>
      <Leaf x={276} y={39} flip s={0.9} />
      <Leaf x={362} y={39} s={0.9} />
      <Pearl x={294} y={36} s={0.7} />
      <Pearl x={346} y={36} s={0.7} />
      {/* Rosa central (5 pétalos) */}
      <Rose x={320} y={18} s={1.15} />
    </svg>
  );
}

/* ------------------------------------------------------------------
   Floritura de párrafo: filetes cortos, hoja, brote rosa central y
   bayas.
------------------------------------------------------------------ */
export function Flourish({ className = "" }) {
  return (
    <svg
      viewBox="0 0 180 26"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none block ${className}`}
    >
      <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        <path d="M6 13 H 52" opacity="0.5" />
        <path d="M128 13 H 174" opacity="0.5" />
      </g>
      <rect
        x="86"
        y="9"
        width="8"
        height="8"
        transform="rotate(45 90 13)"
        fill="currentColor"
        opacity="0.85"
      />
      <Leaf x={46} y={13} flip s={0.7} />
      <Leaf x={134} y={13} s={0.7} />
      <circle cx="58" cy="13" r="1.3" fill="currentColor" opacity="0.75" />
      <circle cx="122" cy="13" r="1.3" fill="currentColor" opacity="0.75" />
      {/* Brote rosa central */}
      <Rosebud x={90} y={14} s={0.9} />
    </svg>
  );
}

/* ------------------------------------------------------------------
   Título de sección propio: eyebrow con filetes, título en serif (o
   script rosa con `script`) y separador botánico. Paleta rosa/dorado:
   eyebrow rosa, título en tinta profunda, orla botánica dorada.
------------------------------------------------------------------ */
export function WeddingSectionTitle({
  eyebrow,
  title,
  subtitle,
  script = false,
  className = "",
}) {
  const titleColor = script
    ? "text-[var(--inv-accent-pink)]"
    : "text-[var(--inv-text)]";

  return (
    <Reveal className={`text-center ${className}`}>
      <div className="mb-5 flex items-center justify-center gap-4">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-[var(--inv-accent-yellow)]" />
        <span className="text-[0.62rem] uppercase tracking-[0.5em] text-[var(--inv-accent-pink)] md:text-xs">
          {eyebrow}
        </span>
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-[var(--inv-accent-yellow)]" />
      </div>
      <h2
        className={`text-balance ${
          script
            ? "font-inv-script text-5xl leading-[1.35] md:text-6xl"
            : "font-inv-heading text-3xl md:text-5xl"
        } ${titleColor}`}
      >
        {title}
      </h2>
      <BotanicalDivider className="mx-auto mt-7 h-10 w-64 text-[var(--inv-botanical)] md:h-12 opacity-90" />
      {subtitle && (
        <p className="mx-auto mt-5 max-w-xl text-base font-light md:text-lg text-inv-text-soft">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

/* ------------------------------------------------------------------
   GoldFrame (nombre de export conservado por compatibilidad, ahora
   visualmente un marco botánico fino): doble borde dorado con esquinas
   recortadas y biseles diagonales. Decorativo (aria-hidden) y sin
   eventos de puntero; el contenido vive en la capa `relative`.
------------------------------------------------------------------ */
const FRAME_CUT_OUTER =
  "polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)";
const FRAME_CUT_INNER =
  "polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)";

export function GoldFrame({ children, className = "", accent = false }) {
  const outer = accent
    ? "border-[var(--inv-botanical)]/70"
    : "border-[var(--inv-botanical)]/25";
  const inner = accent
    ? "border-[var(--inv-accent-yellow)]/60"
    : "border-[var(--inv-botanical)]/15";
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-[inherit] border ${outer}`}
        style={{ clipPath: FRAME_CUT_OUTER }}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-[7px] rounded-[inherit] border ${inner}`}
        style={{ clipPath: FRAME_CUT_INNER }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-[11px] h-px w-5 origin-left -rotate-45 bg-[var(--inv-accent-yellow)] opacity-80"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-[11px] h-px w-5 origin-right rotate-45 bg-[var(--inv-accent-yellow)] opacity-80"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[11px] left-0 h-px w-5 origin-left rotate-45 bg-[var(--inv-accent-yellow)] opacity-80"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[11px] right-0 h-px w-5 origin-right -rotate-45 bg-[var(--inv-accent-yellow)] opacity-80"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
