import { Reveal } from "../motion.jsx";
import { Ramillete } from "./flora.jsx";
import { displayNames, initialsOf, monthYearLine, parseEventDate } from "./helpers.js";

/* ------------------------------------------------------------------
   Cierre (v2): foto B&N a sangre con degradado y la cita del tema;
   debajo, monograma circular (iniciales en orden de diseño M&J)
   flanqueado por dos ramilletes, la línea "lugar · mes año" y el pie
   de marca.

   - La cita sale de `theme.labels.closingQuote`.
   - La línea inferior combina `event.place` y el mes/año del evento.
   - Badge "Powered by Webi" (SOLO esta plantilla): enlace fijo a
     https://webi.mx en pestaña nueva + wordmark oscuro
     (`client/public/webi/logo-dark.svg`) porque el fondo del cierre es
     claro. `hideBrand` oculta la línea "DisplayEvent" (white-label por
     dominio propio), nunca el badge.
------------------------------------------------------------------ */
export default function Footer({ event, theme, cfg, hideBrand = false, photo }) {
  const labels = theme?.labels || {};
  const names = displayNames(cfg);
  const initials = initialsOf(cfg);
  const dateParts = parseEventDate(event?.date);
  const lowerLine = [String(event?.place || "").trim(), monthYearLine(dateParts)]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer className="flex min-h-[100svh] w-full flex-col bg-[var(--inv-bg-alt)]">
      {/* Bloque de foto con la cita */}
      <div className="relative flex min-h-[58svh] flex-1 items-end justify-center overflow-hidden bg-[#1C1B19]">
        {photo && (
          <img
            src={photo}
            alt={names.length ? names.join(" y ") : "Cierre"}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover [filter:grayscale(1)_contrast(1.05)]"
            style={{ objectPosition: "50% 30%" }}
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(20,19,18,0) 40%, rgba(20,19,18,0.75) 100%)",
          }}
        />
        <Reveal className="relative w-full max-w-[640px] px-7 pb-12">
          <p className="m-0 text-center font-inv-display text-[clamp(34px,9vw,58px)] font-[300] italic leading-[1.12] text-[#FAF7F2]">
            {labels.closingQuote || "Dos ciudades, un mismo camino."}
          </p>
        </Reveal>
      </div>

      {/* Monograma + pie */}
      <div className="flex flex-col items-center gap-[22px] px-5 pb-[120px] pt-16 text-center">
        <Reveal className="flex flex-col items-center">
          <div className="relative h-[150px] w-[150px]">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-[var(--inv-accent-border-strong)]"
            />
            <div className="absolute inset-2 flex items-center justify-center rounded-full border border-[var(--inv-accent-border)] font-inv-display text-[48px] font-[300] text-[var(--inv-text)]">
              {initials[0] || "&"}
              {initials[1] ? (
                <>
                  <span className="mx-1 text-[30px] italic">&amp;</span>
                  {initials[1]}
                </>
              ) : null}
            </div>

            {/* Ramilletes en las esquinas (cuadrante inferior-izquierdo y
                superior-derecho, como el mock). */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute"
              style={{ left: -52, bottom: -52, width: 90, height: 90 }}
            >
              <div
                style={{
                  width: 200,
                  height: 200,
                  transform: "translateY(90px) scale(0.45,-0.45)",
                  transformOrigin: "0 0",
                }}
              >
                <Ramillete />
              </div>
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute"
              style={{ right: -52, top: -52, width: 90, height: 90 }}
            >
              <div
                style={{
                  width: 200,
                  height: 200,
                  transform: "translateX(90px) scale(-0.45,0.45)",
                  transformOrigin: "0 0",
                }}
              >
                <Ramillete />
              </div>
            </div>
          </div>

          {lowerLine && (
            <p className="mb-0 mt-16 text-xs font-medium uppercase tracking-[0.34em] text-[var(--inv-primary)]">
              {lowerLine}
            </p>
          )}

          {!hideBrand && (
            <p className="mb-0 mt-[22px] text-[0.6rem] uppercase tracking-[0.45em] text-[var(--inv-text-muted)]">
              DisplayEvent
            </p>
          )}

          {/* Badge publicitario (solo esta plantilla). */}
          <a
            href="https://webi.mx"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2.5 opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
          >
            <span className="text-[0.55rem] uppercase tracking-[0.35em] text-[var(--inv-text-muted)]">
              Powered by
            </span>
            <img
              src={`${import.meta.env.BASE_URL}webi/logo-dark.svg`}
              alt="Webi"
              width={58}
              height={24}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-6 w-auto"
            />
          </a>
        </Reveal>
      </div>
    </footer>
  );
}
