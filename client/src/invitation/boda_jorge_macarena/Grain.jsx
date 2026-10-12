/* ------------------------------------------------------------------
   Textura de papel del diseño v2: grano fino SVG (feTurbulence) fijo
   sobre la página, en `multiply` y opacidad baja. Es puramente
   decorativo (no interactúa). Se usa en la composición y en el sobre
   editorial.
------------------------------------------------------------------ */

const GRAIN_IMAGE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .3 0 0 0 0 .25 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function GrainOverlay({ zIndex = 102 }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 opacity-[0.55] mix-blend-multiply"
      style={{ zIndex, backgroundImage: GRAIN_IMAGE }}
    />
  );
}
