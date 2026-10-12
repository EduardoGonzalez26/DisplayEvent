import { useCallback } from "react";
import { useReducedMotion } from "motion/react";

/* ------------------------------------------------------------------
   Navegación inferior (v2): pill fija con los accesos rápidos
   (Ubicación / Regalo / Confirmar). Sustituye a la columna lateral de
   puntos; aparece cuando el sobre se abre (`reveal`) y oculta los
   botones cuya sección no existe (los decide el layout).

   Salto de sección robusto:
   - El salto NO usa `scrollIntoView` sobre las tarjetas sticky: una
     tarjeta ya "clavada" en top reporta rect.top = 0 y no se desplazaría
     hacia arriba. Se calcula la posición de FLUJO (suma de alturas de
     hermanos anteriores, ignorando el offset sticky) y se hace scroll al
     contenedor scrolleable más cercano.
   - Respeta `prefers-reduced-motion`: scroll instantáneo.
------------------------------------------------------------------ */

/* Posición Y en coordenadas de documento sumando la cadena `offsetParent`.
   FIABLE solo para elementos NO sticky (contenedor scrolleable y padre de
   las tarjetas, ambos estáticos). */
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
   Las tarjetas son hermanos directos en su contenedor; su posición de
   flujo = suma de la altura (`offsetHeight`, que el sticky NO altera) de
   los hermanos anteriores + posición de flujo del contenedor padre. */
function flowTop(el) {
  let y = 0;
  for (let sib = el.previousElementSibling; sib; sib = sib.previousElementSibling) {
    const pos = getComputedStyle(sib).position;
    if (pos === "fixed" || pos === "absolute") continue;
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

export default function BottomNav({ items = [], reveal = true }) {
  const reduced = useReducedMotion();

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

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navegación de la invitación"
      className={`fixed left-1/2 bottom-[max(14px,env(safe-area-inset-bottom))] z-[60] flex -translate-x-1/2 items-stretch rounded-full border border-[#DDD5C8] bg-[rgba(255,253,249,0.94)] p-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] backdrop-blur-[10px] transition-opacity duration-700 ${
        reveal ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {items.map((item, i) => (
        <div key={item.id} className="flex items-stretch">
          {i > 0 && !item.primary && (
            <span
              aria-hidden="true"
              className="mx-1 my-3.5 w-px self-stretch bg-[#DDD5C8]"
            />
          )}
          <button
            type="button"
            onClick={() => scrollToId(item.id)}
            className={`min-h-[48px] whitespace-nowrap rounded-full px-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 ${
              item.primary
                ? "ml-1 bg-[#1C1B19] px-[18px] text-[#FAF7F2] hover:bg-[#3A3733]"
                : "bg-transparent text-[#1C1B19] hover:bg-[#1C1B19]/5"
            }`}
          >
            {item.label}
          </button>
        </div>
      ))}
    </nav>
  );
}
