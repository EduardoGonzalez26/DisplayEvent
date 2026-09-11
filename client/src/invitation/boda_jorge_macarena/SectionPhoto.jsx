/* ------------------------------------------------------------------
   Fondo de foto a pantalla completa (Boda Jorge & Macarena).

   UNA foto de `cfg.gallery` por sección, a sangre (full-bleed) dentro de
   la tarjeta, en BLANCO Y NEGRO (`grayscale`) y con un SCRIM de degradado
   encima para que el contenido (tinta verde del tema) siga perfectamente
   legible.

   - `object-cover` + `absolute inset-0`: la foto cubre toda la tarjeta; el
     `overflow-hidden` de la tarjeta recorta el sobrante en cualquier
     proporción/pantalla.
   - `grayscale`: la foto es decorativa; funciona como textura B&N.
   - Scrim: degradado VERTICAL del color de fondo del tema (`--inv-bg`,
     marfil cálido), con opacidad fuerte arriba/abajo (~94%) y algo menor
     al centro (~80%). Así la foto se intuye sin quedar tapada, pero el
     contraste tinta verde / marfil se conserva (peor caso ≈ 5.7:1).
   - Sin imagen (o cadena vacía) → NO renderiza nada: la tarjeta cae a su
     fondo sólido de siempre.
   - No interactivo ni anunciado: `aria-hidden`, `pointer-events-none`,
     `alt=""`, `draggable={false}`.
   - Carga inmediata (`loading="eager"`): es fondo, debe verse al primer
     pintado (nada de lazy).
   - Estático: sin animación (compatible con `prefers-reduced-motion`).
------------------------------------------------------------------ */

export default function SectionPhoto({ src, scrim = "var(--inv-bg)" }) {
  if (!src || typeof src !== "string" || !src.trim()) return null;

  // Degradado: fuerte en los bordes, algo más suave al centro. Se compone
  // con `color-mix` para conservar el color de fondo del tema y rebajarlo
  // solo en opacidad. `transparent` alfa no se usa para evitar el fringe
  // oscuro que produce interpolar hacia negro.
  const overlay =
    "linear-gradient(180deg, " +
    `color-mix(in srgb, ${scrim} 94%, transparent) 0%, ` +
    `color-mix(in srgb, ${scrim} 80%, transparent) 42%, ` +
    `color-mix(in srgb, ${scrim} 80%, transparent) 58%, ` +
    `color-mix(in srgb, ${scrim} 94%, transparent) 100%)`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <img
        src={src}
        alt=""
        loading="eager"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover grayscale"
      />
      <div className="absolute inset-0" style={{ backgroundImage: overlay }} />
    </div>
  );
}
