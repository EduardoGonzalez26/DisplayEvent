/* ------------------------------------------------------------------
   Fondo de foto a pantalla completa (Boda Jorge & Macarena).

   UNA foto de `cfg.gallery` por tarjeta, a sangre (full-bleed) dentro de
   la tarjeta, en BLANCO Y NEGRO (`grayscale`) y con un SCRIM de degradado
   oscuro encima para que el contenido (tinta marfil del tema) siga
   perfectamente legible.

   - `object-cover` + `absolute inset-0`: la foto cubre toda la tarjeta; el
     `overflow-hidden` de la tarjeta recorta el sobrante en cualquier
     proporción/pantalla.
   - `grayscale`: la foto es decorativa; funciona como textura B&N.
   - Scrim: degradado VERTICAL del color más oscuro del tema
     (`--inv-bg-alt2`, verde noche), con opacidad fuerte arriba/abajo (88%)
     y algo menor al centro (72%). Al ser un tema oscuro el scrim puede ser
     más "claro" (menos opaco) que el marfil anterior: la foto se aprecia
     más (28% central vs 20%) y el texto marfil conserva AA incluso en el
     peor caso de una foto blanca: marfil ≈7.4:1, soft ≈6.0:1 y
     muted ≈4.6:1 al centro del scrim.
   - Sin imagen (o cadena vacía) → NO renderiza nada: la tarjeta cae a su
     fondo sólido de siempre.
   - No interactivo ni anunciado: `aria-hidden`, `pointer-events-none`,
     `alt=""`, `draggable={false}`.
   - Carga: `priority` (primera tarjeta visible) usa `loading="eager"`; el
     resto `loading="lazy"` + `decoding="async"` para no descargar todas
     las fotos de fondo a la vez.
   - Estático: sin animación (compatible con `prefers-reduced-motion`).
------------------------------------------------------------------ */

export default function SectionPhoto({
  src,
  scrim = "var(--inv-bg-alt2)",
  priority = false,
}) {
  if (!src || typeof src !== "string" || !src.trim()) return null;

  // Degradado: fuerte en los bordes, algo más suave al centro. Se compone
  // con `color-mix` para conservar el color de fondo del tema y rebajarlo
  // solo en opacidad. `transparent` alfa no se usa como extremo para evitar
  // el fringe oscuro que produce interpolar hacia negro.
  const overlay =
    "linear-gradient(180deg, " +
    `color-mix(in srgb, ${scrim} 88%, transparent) 0%, ` +
    `color-mix(in srgb, ${scrim} 72%, transparent) 42%, ` +
    `color-mix(in srgb, ${scrim} 72%, transparent) 58%, ` +
    `color-mix(in srgb, ${scrim} 88%, transparent) 100%)`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <img
        src={src}
        alt=""
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover grayscale"
      />
      <div className="absolute inset-0" style={{ backgroundImage: overlay }} />
    </div>
  );
}
