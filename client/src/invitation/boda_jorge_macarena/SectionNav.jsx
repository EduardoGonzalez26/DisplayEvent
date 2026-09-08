import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/* ------------------------------------------------------------------
   Navegación lateral flotante de la plantilla "Boda de Jorge & Macarena".

   - Izquierda: columna de "puntos" (uno por sección VISIBLE) con scrollspy:
      resalta el punto de la sección activa. Hover/foco muestran un tooltip.
   - Derecha: botón circular "Confirmaciones" (RSVP) que, cuando la
      sección activa ES `rsvpId`, se convierte en "volver arriba".

   Robustez:
   - Scrollspy con `getBoundingClientRect()` (relativo al viewport) y
     escucha `scroll` en fase de captura sobre `document`: funciona tanto
     con scroll de ventana como con contenedores internos (vista previa
     del editor).
   - El salto a sección NO usa `scrollIntoView` sobre las tarjetas sticky:
      una tarjeta ya "clavada" en top-0 reporta rect.top = 0 y no se
      desplazaría hacia arriba. Se calcula la posición de FLUJO (ignora el
      offset sticky) y se hace scroll al contenedor scrolleable más cercano.
      Ojo: `offsetTop` de un sticky YA clavado devuelve la posición visual
      (clavada), no la de flujo; por eso se usa `flowTop` (suma de alturas
      de hermanos anteriores), no `offsetTop` directo.
   - Respeta `prefers-reduced-motion`: scroll instantáneo y sin
     animaciones de transform/translación.
------------------------------------------------------------------ */

// La sección activa es la última cuyo borde superior queda por encima del
// 40% de la altura del viewport (umbral elegido por el efecto de tarjetas).
const ACTIVE_RATIO = 0.4;

/* Posición Y en coordenadas de documento sumando la cadena `offsetParent`.
   FIABLE solo para elementos NO sticky: en un sticky ya "clavado", `offsetTop`
   reporta la posición visual (clavada), no la de flujo. Se usa para el
   contenedor scrolleable y para el padre de las tarjetas (ambos estáticos). */
function docTop(el) {
  let y = 0;
  let node = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return y;
}

/* Posición Y de FLUJO de una tarjeta sticky, ignorando el offset sticky.
   Las tarjetas son hermanos directos en su contenedor, así que su posición de
   flujo = suma de la altura (`offsetHeight`, que el sticky NO altera) de los
   hermanos anteriores + la posición de flujo del contenedor padre (estático).
   Esto es correcto tanto con la tarjeta clavada (subir) como sin clavar (bajar). */
function flowTop(el) {
  let y = 0;
  for (let sib = el.previousElementSibling; sib; sib = sib.previousElementSibling) {
    y += sib.offsetHeight;
  }
  if (el.parentElement) y += docTop(el.parentElement);
  return y;
}

/* Contenedor scrolleable más cercano a `el` (o la raíz de la página). */
function scrollContainerOf(el) {
  let node = el && el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(overflowY)) return node;
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

export default function SectionNav({
  sections,
  rsvpId = "confirmaciones",
  topId = "inicio",
}) {
  const reduced = useReducedMotion();
  const [activeId, setActiveId] = useState(null);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const scrollToId = useCallback(
    (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const behavior = reduced ? "auto" : "smooth";
      const container = scrollContainerOf(el);
      const target = flowTop(el);

      if (
        container &&
        container !== document.documentElement &&
        container !== document.body
      ) {
        const base = docTop(container);
        container.scrollTo({ top: Math.max(0, target - base), behavior });
      } else {
        window.scrollTo({ top: Math.max(0, target), behavior });
      }
    },
    [reduced]
  );

  useEffect(() => {
    let raf = 0;
    let ticking = false;

    const compute = () => {
      ticking = false;
      const threshold = window.innerHeight * ACTIVE_RATIO;
      let current = null;
      for (const s of sectionsRef.current) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) current = s.id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(compute);
    };

    compute();
    // Fase de captura: capta scroll de ventana Y de contenedores internos.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const atRsvp = activeId === rsvpId;

  return (
    <>
      {/* Columna de puntos — izquierda */}
      <nav
        aria-label="Secciones de la invitación"
        className="fixed left-3 top-1/2 z-[100] -translate-y-1/2 md:left-5"
      >
        <ul className="flex flex-col items-center gap-2.5 md:gap-3">
          {sections.map((s) => {
            const active = activeId === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => scrollToId(s.id)}
                  aria-label={`Ir a ${s.label}`}
                  aria-current={active ? "true" : undefined}
                  className="group relative flex h-7 w-7 items-center justify-center focus-visible:outline-none"
                >
                  <span
                    className={`block rounded-full transition-colors duration-200 ${
                      active
                        ? "h-3 w-3 border border-[var(--inv-accent-yellow)] bg-[var(--inv-primary)] shadow-[0_0_0_4px_var(--inv-shadow-ring)]"
                        : "h-2 w-2 border border-[var(--inv-accent-yellow)]/70 bg-[var(--inv-bg)]/60 group-hover:border-[var(--inv-primary)]/70 group-hover:bg-[var(--inv-accent-yellow)]/40"
                    }`}
                  />
                  {/* tooltip (solo en pantallas con cursor) */}
                  <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-full border border-[var(--inv-accent-yellow)]/40 bg-[var(--inv-surface)] px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--inv-text)] opacity-0 shadow-[0_8px_20px_var(--inv-shadow-card)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Botón RSVP / volver arriba — derecha */}
      <button
        type="button"
        onClick={() => (atRsvp ? scrollToId(topId) : scrollToId(rsvpId))}
        aria-label={atRsvp ? "Volver arriba" : "Ir a confirmaciones"}
        title={atRsvp ? "Volver arriba" : "Ir a confirmaciones"}
        className="fixed right-3 top-1/2 z-[100] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--inv-accent-yellow)]/60 bg-[var(--inv-primary)] text-[var(--inv-on-accent)] shadow-[0_12px_30px_var(--inv-shadow-ring)] transition-colors duration-200 hover:bg-[var(--inv-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-accent-yellow)] focus-visible:ring-offset-2 md:right-5 md:h-12 md:w-12"
      >
        {atRsvp ? (
          <UpIcon className="h-5 w-5" />
        ) : (
          <EnvelopeIcon className="h-5 w-5" />
        )}
      </button>
    </>
  );
}

/* Ícono de sobre (confirmaciones) en línea fina. */
function EnvelopeIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 7.5 12 13l8.5-5.5" />
    </svg>
  );
}

/* Ícono de flecha hacia arriba (volver arriba) en línea fina. */
function UpIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 19V5" />
      <path d="M5.5 11.5 12 5l6.5 6.5" />
    </svg>
  );
}
