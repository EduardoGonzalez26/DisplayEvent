/* ------------------------------------------------------------------
   Fondo de foto a pantalla completa (Boda Jorge & Macarena).

   UNA foto de `cfg.gallery` por tarjeta, a sangre (full-bleed) dentro de
   la hoja, en BLANCO Y NEGRO (`grayscale`) y con un SCRIM de degradado
   encima para que el contenido (tinta cálida del tema) siga legible.

   - `object-cover` + `absolute inset-0`: la foto cubre toda la hoja; el
     `overflow-hidden` del papel recorta el sobrante en cualquier
     proporción/pantalla.
   - `grayscale`: la foto es decorativa; funciona como textura B&N.
   - Scrim: degradado VERTICAL del color `--inv-photo-scrim` (papel del
     tema, claro). Fuerte en los bordes (88%) y algo más suave al centro
     (72%): la foto se intuye como textura y la tinta oscura conserva AA
     incluso en el peor caso de una foto blanca.
   - Sin imagen (o cadena vacía) → NO renderiza nada: la hoja cae a su
     fondo sólido de siempre.
   - No interactivo ni anunciado: `aria-hidden`, `pointer-events-none`,
     `alt=""`, `draggable={false}`.
   - Carga: `priority` (primera tarjeta visible) usa `loading="eager"`; el
     resto `loading="lazy"` + `decoding="async"`.
   - Estático: sin animación (compatible con `prefers-reduced-motion`).
------------------------------------------------------------------ */

export default function SectionPhoto({
  src,
  scrim = "var(--inv-photo-scrim, #FBF8F3)",
  priority = false,
}) {
  if (!src || typeof src !== "string" || !src.trim()) return null;

  // Degradado: fuerte en los bordes, algo más suave al centro. Se compone
  // con `color-mix` para conservar el color de papel del tema y rebajarlo
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
