import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useCountdown } from "../shared/Countdown.jsx";
import { safeCssUrl } from "../shared/util.jsx";
import { Ramillete } from "./flora.jsx";
import { displayNames, longDateLine, parseEventDate } from "./helpers.js";

/* ------------------------------------------------------------------
   Portada del diseño v2: foto B&N a sangre con degradado oscuro,
   nombres inmensos en Cormorant (novia & novio apilados), fecha y lugar
   en microtexto, cuenta regresiva inline sobre hairline y cue "Desliza".
   Ramillete de esquina superior izquierda y rama inferior.

   Props:
   - `event`: fecha/hora/lugar.
   - `cfg`: hero_image + gallery (portada) y nombres de la pareja.
   - `reveal`: la entrada (fade + scale de foto + flor) se dispara cuando
     el sobre se abre (mismo comportamiento del mock).
------------------------------------------------------------------ */

const pad2 = (n) => String(n).padStart(2, "0");

/* Unidad de la cuenta regresiva: número Cormorant 38 y etiqueta
   microtexto; separador vertical hairline entre columnas. */
function CountdownUnit({ value, label, first = false }) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${
        first ? "" : "border-l border-[rgba(250,247,242,0.2)]"
      }`}
    >
      <div className="font-inv-display text-[38px] font-[300] leading-none tabular-nums">
        {value}
      </div>
      <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#E6DFD3]">
        {label}
      </div>
    </div>
  );
}

export default function Hero({ event, cfg, reveal = true, theme }) {
  const reduced = useReducedMotion();
  const labels = theme?.labels || {};

  const names = displayNames(cfg);
  const title = names.length ? names : [String(event?.name || "").trim()].filter(Boolean);
  const titleA = title[0] || "";
  const titleB = title[1] || "";

  const dateParts = parseEventDate(event?.date);
  const dateLine = longDateLine(dateParts);

  const gallery = (cfg?.gallery || []).filter(
    (s) => typeof s === "string" && s.trim()
  );
  const bgImage = safeCssUrl(cfg?.hero_image) || safeCssUrl(gallery[0]) || "";

  const target = useMemo(() => {
    if (!event?.date) return null;
    const ts = new Date(`${event.date}T${event.time || "00:00:00"}`).getTime();
    return Number.isNaN(ts) ? null : ts;
  }, [event?.date, event?.time]);
  const { days, hours, minutes, seconds } = useCountdown(target);
  const hasCountdown = target != null;

  const alt = names.length ? names.join(" y ") : event?.name || "Portada";

  return (
    <section data-sheet id="portada" className="sticky top-0" style={{ zIndex: 0 }}>
      <div
        data-paper
        className="relative flex min-h-[100svh] flex-col items-center justify-end overflow-hidden bg-[var(--inv-hero-fallback)] text-[#FAF7F2] will-change-transform"
      >
        {/* Capa de oscurecimiento que aplica el motor de tarjetas apiladas */}
        <div
          data-shade
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[6] bg-[#0E0D0C] opacity-0"
        />

        {bgImage && (
          <motion.img
            src={bgImage}
            alt={alt}
            loading="eager"
            decoding="async"
            draggable={false}
            initial={{ scale: reduced ? 1 : 1.08 }}
            animate={{ scale: reveal ? 1 : reduced ? 1 : 1.08 }}
            transition={{ duration: reduced ? 0 : 2.6, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute inset-0 h-full w-full object-cover [filter:grayscale(1)_contrast(1.05)_brightness(0.92)]"
            style={{ objectPosition: "50% 35%" }}
          />
        )}

        {/* Velo del diseño: claro arriba, profundo abajo para sostener la tinta */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(20,19,18,0.35) 0%, rgba(20,19,18,0.05) 32%, rgba(20,19,18,0.25) 55%, rgba(20,19,18,0.82) 100%)",
          }}
        />

        {/* Ramillete de la esquina superior izquierda */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[34px] -top-[34px] z-[2] origin-top-left"
          initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.6, rotate: -18 }}
          animate={
            reveal
              ? reduced
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, rotate: 0 }
              : undefined
          }
          transition={{ duration: reduced ? 0 : 1.6, ease: [0.2, 0.8, 0.2, 1], delay: reduced ? 0 : 0.4 }}
        >
          <div className="origin-top-left scale-[0.72]">
            <Ramillete />
          </div>
        </motion.div>

        {/* Contenido */}
        <motion.div
          className="relative z-[3] flex w-full max-w-[760px] flex-col items-center gap-[22px] self-center px-6 pb-32 pt-24 text-center"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
          animate={reveal ? (reduced ? { opacity: 1 } : { opacity: 1, y: 0 }) : undefined}
          transition={{ duration: reduced ? 0 : 1.4, ease: [0.2, 0.7, 0.2, 1], delay: reduced ? 0 : 0.3 }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.4em] text-[#EFE8DC]">
            {labels.heroEyebrow || "Nos casamos"}
          </p>

          <h1 className="m-0 flex flex-col items-center font-inv-display text-[clamp(62px,17vw,136px)] font-[300] leading-[0.92] tracking-[-0.01em]">
            {titleB ? (
              <>
                <span>{titleA}</span>
                <span className="font-[300] italic leading-[1.2] text-[0.5em]">&amp;</span>
                <span>{titleB}</span>
              </>
            ) : (
              <span>{titleA}</span>
            )}
          </h1>

          {dateLine && (
            <div className="flex items-center gap-[14px]">
              <span aria-hidden="true" className="h-px w-9 bg-[rgba(250,247,242,0.55)]" />
              <div className="text-sm font-normal uppercase tracking-[0.28em]">
                {dateLine}
              </div>
              <span aria-hidden="true" className="h-px w-9 bg-[rgba(250,247,242,0.55)]" />
            </div>
          )}

          {event?.place && (
            <div className="-mt-2.5 text-xs font-medium uppercase tracking-[0.36em] text-[#EFE8DC]">
              {event.place}
            </div>
          )}

          {hasCountdown && (
            <div className="mt-2.5 grid w-full max-w-[400px] grid-cols-4 border-t border-[rgba(250,247,242,0.3)] pt-5">
              <CountdownUnit value={days} label="Días" first />
              <CountdownUnit value={pad2(hours)} label="Horas" />
              <CountdownUnit value={pad2(minutes)} label="Min" />
              <CountdownUnit value={pad2(seconds)} label="Seg" />
            </div>
          )}

          <div className="mt-1.5 flex flex-col items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-[#E6DFD3]">
            {labels.heroScroll || "Desliza"}
            <span aria-hidden="true" className="h-[22px] w-px bg-[rgba(250,247,242,0.5)]" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
