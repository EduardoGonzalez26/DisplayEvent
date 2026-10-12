/* ------------------------------------------------------------------
   Flora del tema "boda_jorge_macarena" (v2): traducción fiel a SVG
   React de las flores del mock (`Flor.dc.html`) y del ramillete
   (`Ramillete.dc.html`). Los colores se toman de las variables
   `--inv-flor-*` del tema (con fallback a los valores exactos del
   mock), de modo que otro formato pueda adoptar el arte cambiando vars.

   - `<Flor kind>`: dalia (amarilla), bugambilia (rosa) o granado
     (naranja con corona). Ocupa el 100% de su contenedor.
   - `<Ramillete>`: rama de hojas marfil con racimo de flores; tamaño
     base 200×200 px (se escala con `scale`/transform del contenedor).

   Todos los ornamentos son decorativos (`aria-hidden`).
------------------------------------------------------------------ */

const DALIA_PETALS = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);
const DALIA_CORE = Array.from({ length: 10 }, (_, i) => 18 + i * 36);

function Dalia({ className, style }) {
  return (
    <svg
      viewBox="-50 -50 100 100"
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible", ...style }}
    >
      <g
        fill="var(--inv-flor-dalia, #F6DC95)"
        stroke="var(--inv-flor-dalia-line, #D39A2E)"
        strokeWidth="0.8"
      >
        {DALIA_PETALS.map((a) => (
          <ellipse key={a} cx="0" cy="-28" rx="7.5" ry="16" transform={`rotate(${a})`} />
        ))}
      </g>
      <g
        fill="var(--inv-flor-dalia-2, #EDBA4A)"
        stroke="var(--inv-flor-dalia-line, #C98A22)"
        strokeWidth="0.7"
      >
        {DALIA_CORE.map((a) => (
          <ellipse key={a} cx="0" cy="-15" rx="5" ry="10" transform={`rotate(${a})`} />
        ))}
      </g>
      <circle cx="0" cy="0" r="7" fill="var(--inv-flor-dalia-core, #C98A22)" />
      <circle cx="-2" cy="-2" r="1.2" fill="var(--inv-flor-dalia, #F6DC95)" />
      <circle cx="2.5" cy="1" r="1" fill="var(--inv-flor-dalia, #F6DC95)" />
      <circle cx="-1" cy="3" r="0.9" fill="var(--inv-flor-dalia, #F6DC95)" />
    </svg>
  );
}

const BUG_PETAL = "M0 0 C-15 -9 -18 -33 0 -45 C18 -33 15 -9 0 0Z";
const BUG_VEIN = "M0 -3 L0 -38 M0 -16 L-7 -24 M0 -16 L7 -24 M0 -26 L-5 -32 M0 -26 L5 -32";

function Bugambilia({ className, style }) {
  return (
    <svg
      viewBox="-50 -50 100 100"
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible", ...style }}
    >
      <g
        fill="var(--inv-flor-bug, #F4C9D7)"
        stroke="var(--inv-flor-bug-line, #C85A82)"
        strokeWidth="0.9"
      >
        {[0, 120, 240].map((a) => (
          <path key={a} d={BUG_PETAL} transform={`rotate(${a})`} />
        ))}
      </g>
      <g
        fill="none"
        stroke="var(--inv-flor-bug-line, #C85A82)"
        strokeWidth="0.6"
        opacity="0.55"
      >
        {[0, 120, 240].map((a) => (
          <path key={a} d={BUG_VEIN} transform={`rotate(${a})`} />
        ))}
      </g>
      <g
        fill="var(--inv-flor-bug-heart, #FFF8E6)"
        stroke="var(--inv-flor-bug-heart-line, #E0A93A)"
        strokeWidth="0.7"
      >
        <circle cx="0" cy="-4" r="3" />
        <circle cx="-3.6" cy="2.4" r="3" />
        <circle cx="3.6" cy="2.4" r="3" />
      </g>
    </svg>
  );
}

function Granado({ className, style }) {
  return (
    <svg
      viewBox="-50 -50 100 100"
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible", ...style }}
    >
      <g
        fill="var(--inv-flor-gra, #F2A68A)"
        stroke="var(--inv-flor-gra-line, #C8553A)"
        strokeWidth="0.8"
      >
        {[-58, 58, -29, 29, 0].map((a, i) => (
          <ellipse
            key={a}
            cx="0"
            cy={a === 0 ? -18 : -16}
            rx="10"
            ry={a === 0 ? 18 : 17}
            transform={`rotate(${a} 0 6)`}
          />
        ))}
      </g>
      <g
        stroke="var(--inv-flor-gra-stamen-line, #B5482F)"
        strokeWidth="0.6"
        fill="var(--inv-flor-gra-stamen, #E8AE3A)"
      >
        <path d="M0 4 L0 -14" transform="rotate(-24 0 4)" />
        <path d="M0 4 L0 -16" transform="rotate(-8 0 4)" />
        <path d="M0 4 L0 -16" transform="rotate(8 0 4)" />
        <path d="M0 4 L0 -14" transform="rotate(24 0 4)" />
        <circle cx="-6.4" cy="-10.6" r="1.6" strokeWidth="0" />
        <circle cx="-2.3" cy="-15.5" r="1.6" strokeWidth="0" />
        <circle cx="2.3" cy="-15.5" r="1.6" strokeWidth="0" />
        <circle cx="6.4" cy="-10.6" r="1.6" strokeWidth="0" />
      </g>
      <path
        d="M-10 4 L-12 34 L-6 28 L0 37 L6 28 L12 34 L10 4 C4 9 -4 9 -10 4Z"
        fill="var(--inv-flor-gra-crown, #D2603F)"
        stroke="var(--inv-flor-gra-crown-line, #A8432F)"
        strokeWidth="0.9"
      />
      <path
        d="M-5 10 L-6 28 M5 10 L6 28"
        stroke="var(--inv-flor-gra-crown-line, #A8432F)"
        fill="none"
        strokeWidth="0.5"
        opacity="0.6"
      />
    </svg>
  );
}

export function Flor({ kind = "dalia", className = "", style }) {
  if (kind === "bugambilia") return <Bugambilia className={className} style={style} />;
  if (kind === "granado") return <Granado className={className} style={style} />;
  return <Dalia className={className} style={style} />;
}

/* ------------------------------------------------------------------
   Ramillete: tallos finos de tinta con hojas marfil y cinco flores
   (dalia grande al alba, bugambilia arriba, granado a la izquierda,
   dalia pequeña y bugambilia abajo a la derecha). Base de 200×200 px.
------------------------------------------------------------------ */
const LEAF = "M0 0 C6 -8 18 -8 26 0 C18 8 6 8 0 0Z";
const LEAF_SMALL = "M0 0 C5 -7 15 -7 22 0 C15 7 5 7 0 0Z";
const LEAF_VEIN = "M0 0 L26 0";
const LEAF_VEIN_SMALL = "M0 0 L22 0";

export function Ramillete({ className = "", style }) {
  return (
    <div className={`relative ${className}`} style={{ width: 200, height: 200, ...style }}>
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: 200, height: 200, overflow: "visible" }}
      >
        <g
          fill="none"
          stroke="var(--inv-stem, #2B2926)"
          strokeWidth="0.8"
          opacity="0.75"
        >
          <path d="M42 42 C80 70 118 112 168 182" />
          <path d="M96 56 C122 78 146 92 188 106" />
          <path d="M46 102 C70 132 84 160 92 196" />
          <path d="M120 112 C132 110 140 102 146 96" />
        </g>
        <g
          fill="var(--inv-leaf, #FAF7F2)"
          stroke="var(--inv-stem, #2B2926)"
          strokeWidth="0.8"
        >
          <path d={LEAF} transform="translate(112 104) rotate(36)" />
          <path d={LEAF} transform="translate(138 140) rotate(-20)" />
          <path d={LEAF_SMALL} transform="translate(150 96) rotate(-40)" />
          <path d={LEAF_SMALL} transform="translate(70 138) rotate(110)" />
          <path d={LEAF_SMALL} transform="translate(84 168) rotate(40)" />
        </g>
        <g
          fill="none"
          stroke="var(--inv-stem, #2B2926)"
          strokeWidth="0.5"
          opacity="0.6"
        >
          <path d={LEAF_VEIN} transform="translate(112 104) rotate(36)" />
          <path d={LEAF_VEIN} transform="translate(138 140) rotate(-20)" />
          <path d={LEAF_VEIN_SMALL} transform="translate(70 138) rotate(110)" />
        </g>
      </svg>
      <Flor
        kind="bugambilia"
        style={{ position: "absolute", left: 84, top: 20, width: 50, height: 50 }}
      />
      <Flor
        kind="granado"
        style={{ position: "absolute", left: 22, top: 80, width: 50, height: 50 }}
      />
      <Flor kind="dalia" style={{ position: "absolute", left: 8, top: 8, width: 70, height: 70 }} />
      <Flor kind="dalia" style={{ position: "absolute", left: 176, top: 96, width: 22, height: 22 }} />
      <Flor
        kind="bugambilia"
        style={{ position: "absolute", left: 150, top: 164, width: 28, height: 28 }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
   Primitivas tipográficas del diseño v2 (reutilizables por secciones).
------------------------------------------------------------------ */

/* Eyebrow: microtexto en mayúsculas, tracking amplio, gris cálido. */
export function Eyebrow({ children, className = "" }) {
  return (
    <p
      className={`text-[11px] font-medium uppercase tracking-[0.34em] text-[var(--inv-text-muted)] ${className}`}
    >
      {children}
    </p>
  );
}

/* Divisor con flor al centro entre dos filetes finos. */
export function FlowerRule({ kind = "bugambilia", className = "" }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 ${className}`}
      aria-hidden="true"
    >
      <span className="h-px w-9 bg-[var(--inv-accent-border-strong)]" />
      <span className="inline-flex h-5 w-5">
        <Flor kind={kind} />
      </span>
      <span className="h-px w-9 bg-[var(--inv-accent-border-strong)]" />
    </div>
  );
}
