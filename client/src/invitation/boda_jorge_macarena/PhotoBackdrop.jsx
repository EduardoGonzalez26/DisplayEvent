import { useMemo } from "react";

/* ------------------------------------------------------------------
   Fondo de fotos determinista (Boda Jorge & Macarena).

   Reparte un número fijo de fotos de `cfg.gallery` como una capa
   ABSOLUTA DENTRO de cada tarjeta del layout.

   Distribución por REJILLA con jitter (no puramente aleatoria):
   - Se divide la tarjeta en celdas (3×3 por defecto) y se OMITE la celda
     central para que el texto respire; las 8 celdas perimetrales alojan
     8 fotos (una por celda).
   - Cada foto se centra en SU celda con un jitter pequeño (±15% del
     tamaño de celda), así que varía sin salirse de su zona ni amontonarse.
   - Tamaño, rotación y opacidad se derivan del generador `seeded`
     determinista (mismo `seed` por tarjeta → misma disposición).

   - Capa por tarjeta: `absolute inset-0` — queda ENTRE el fondo opaco de
     la tarjeta y el contenido (debajo del texto).
   - `seed` distinto por tarjeta para variar la disposición.
   - Sin animación: es un fondo estático (barato) y respeta
     `prefers-reduced-motion` de forma natural.
   - No interactivo ni legible para lectores de pantalla: `aria-hidden`,
     `pointer-events-none`, `alt=""`.
   - Carga inmediata (`loading="eager"`): son fotos de fondo que deben
     verse desde el primer pintado (nada de carga perezosa).
   - Opacidad sutil (~0.14–0.24): van DETRÁS del texto, deben dejar
     leer el contenido sin perjudicar el contraste.
   - `overflow-hidden` recorta lo que sobresale de la tarjeta.
------------------------------------------------------------------ */

/* Generador pseudoaleatorio determinista (mismo patrón que Hero.jsx). */
function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/* Rejillas candidatas. `omit` son las celdas centrales que se reservan
   para el contenido. Se elige la primera cuya capacidad perimetral
   alcance el `count` solicitado; 3×3 cubre los 8 huecos por defecto. */
const GRID_PRESETS = [
  { cols: 3, rows: 3, omit: [[1, 1]] }, // 8 huecos
  { cols: 3, rows: 4, omit: [[1, 1], [1, 2]] }, // 10 huecos
  { cols: 4, rows: 4, omit: [[1, 1], [1, 2], [2, 1], [2, 2]] }, // 12 huecos
];

/* Celdas perimetrales (en orden fila a fila) de una rejilla. */
function perimeterCells({ cols, rows, omit }) {
  const blocked = new Set(omit.map(([c, r]) => `${c}:${r}`));
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (!blocked.has(`${c}:${r}`)) cells.push({ c, r });
    }
  }
  return cells;
}

export default function PhotoBackdrop({ images, seed = 0, count = 8 }) {
  const items = useMemo(() => {
    const list = Array.isArray(images)
      ? images.filter((s) => typeof s === "string" && s.trim())
      : [];
    if (list.length === 0) return [];

    const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 8;
    const rng = seeded(seed);

    const grid =
      GRID_PRESETS.find((g) => perimeterCells(g).length >= n) ??
      GRID_PRESETS[GRID_PRESETS.length - 1];
    const cells = perimeterCells(grid);
    const cellW = 100 / grid.cols;
    const cellH = 100 / grid.rows;

    // Reparte `n` fotos de forma pareja por el perímetro (sin repetir celda
    // mientras haya huecos suficientes).
    const picked = Array.from({ length: n }, (_, i) => {
      const idx = Math.min(
        cells.length - 1,
        Math.round((i * cells.length) / n)
      );
      return cells[idx];
    });

    return picked.map((cell, i) => {
      const size = Math.round(90 + rng() * 110); // 90–200px
      // Jitter ±15% del tamaño de celda alrededor del centro de la celda:
      // rompe la rigidez de la cuadrícula sin provocar clustering.
      const jx = (rng() * 2 - 1) * 0.15 * cellW;
      const jy = (rng() * 2 - 1) * 0.15 * cellH;
      const centerX = (cell.c + 0.5) * cellW + jx;
      const centerY = (cell.r + 0.5) * cellH + jy;
      return {
        src: list[i % list.length], // cicla si hay menos fotos que huecos
        left: `calc(${centerX.toFixed(2)}% - ${size / 2}px)`,
        top: `calc(${centerY.toFixed(2)}% - ${size / 2}px)`,
        size,
        rotate: (rng() * 20 - 10).toFixed(1), // -10°..10°
        opacity: +(0.14 + rng() * 0.1).toFixed(2), // 0.14–0.24
      };
    });
  }, [images, seed, count]);

  if (items.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {items.map((it, i) => (
        <img
          key={`${i}-${it.src}`}
          src={it.src}
          alt=""
          loading="eager"
          draggable={false}
          className="absolute rounded-2xl object-cover"
          style={{
            top: it.top,
            left: it.left,
            width: it.size,
            height: it.size,
            transform: `rotate(${it.rotate}deg)`,
            opacity: it.opacity,
          }}
        />
      ))}
    </div>
  );
}
