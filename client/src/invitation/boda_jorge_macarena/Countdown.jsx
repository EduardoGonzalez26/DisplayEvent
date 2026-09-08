import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useCountdown } from "../shared/Countdown.jsx";
import { EASE } from "../motion.jsx";
import { Flourish, GoldFrame } from "./decor.jsx";

/* ------------------------------------------------------------------
   Cuenta regresiva (Boda Jorge & Macarena): tarjeta blanca elegante con
   marco botánico `GoldFrame` (accent) y sombra verde suave, coherente
   con las tarjetas de Ubicaciones/Nota de regalos. Números GRANDES en
   Playfair Display verde (`--inv-text`, tabular), etiquetas minúsculas
   itálicas rosas y separadores verticales amarillos finos (1px). Header
   "Faltan" como eyebrow (líneas amarillas + uppercase rosa) anclado con
   un `Flourish` pequeño. Reutiliza `useCountdown` compartido.

   IMPORTANTE: el bloque se renderiza SIEMPRE visible, sin `Reveal` ni
   `whileInView`. Es la PRIMERA pieza que aparece al scrollear (el
   contenido marfil tapa la portada sticky) y el IntersectionObserver de
   `Reveal` no disparaba su entrada al viewport, dejándolo en
   `opacity: 0`. El dígito se pinta en flujo normal (sin `absolute
   inset-0` ni `AnimatePresence`), con un cross-fade sutil que nunca baja
   a `opacity: 0`, de modo que el número siempre sea visible y actualice
   cada segundo. Respeta `prefers-reduced-motion`.
------------------------------------------------------------------ */
function Unit({ value, label, reduced, last = false }) {
  const text = String(value).padStart(2, "0");
  return (
    <div
      className={`flex flex-col items-center gap-2.5 px-1 text-center md:gap-3 md:px-2 ${
        last ? "" : "border-r border-[var(--inv-accent-yellow)]"
      }`}
    >
      <motion.span
        key={text}
        initial={reduced ? false : { opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="font-inv-heading text-4xl font-medium tabular-nums leading-none text-[var(--inv-text)] md:text-6xl"
      >
        {text}
      </motion.span>
      <div className="font-inv-serif text-xs lowercase italic tracking-wide text-[var(--inv-accent-pink)] md:text-sm">
        {label}
      </div>
    </div>
  );
}

export default function Countdown({ date, time, theme }) {
  const target = useMemo(() => {
    if (!date) return null;
    const ts = new Date(`${date}T${time || "00:00:00"}`).getTime();
    return Number.isNaN(ts) ? null : ts;
  }, [date, time]);
  const { days, hours, minutes, seconds, done } = useCountdown(target);
  const reduced = useReducedMotion();

  if (target == null) return null;

  const label = theme?.labels?.countdown ?? "Faltan";

  /* Tarjeta compartida por el estado normal y el estado "¡Es hoy!" para
     mantener la coherencia visual (mismo marco, radio y sombra). */
  const frameClassName =
    "mx-auto max-w-2xl rounded-[1.8rem] bg-[var(--inv-surface)] shadow-[0_30px_70px_var(--inv-shadow-card)]";

  /* Estado "¡Es hoy!": misma tarjeta/marco botánico, script rosa. */
  if (done) {
    return (
      <GoldFrame accent className={frameClassName}>
        <div className="px-5 py-6 text-center sm:px-8 md:px-12 md:py-8">
          <Flourish className="mx-auto h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
          <p className="mt-6 font-inv-script text-5xl leading-[1.35] text-[var(--inv-accent-pink)] md:text-6xl">
            ¡Es hoy!
          </p>
          <p className="mt-3 text-[0.65rem] uppercase tracking-[0.4em] text-inv-text-soft md:text-xs">
            El gran día ha llegado
          </p>
          <Flourish className="mx-auto mt-6 h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
        </div>
      </GoldFrame>
    );
  }

  const units = [
    { label: "días", value: days },
    { label: "horas", value: hours },
    { label: "minutos", value: minutes },
    { label: "segundos", value: seconds },
  ];

  return (
    <GoldFrame accent className={frameClassName}>
      <div className="px-5 py-6 sm:px-8 md:px-12 md:py-8">
        {/* Header "Faltan": eyebrow presente (rosa + líneas amarillas) y
            anclado con una floritura botánica. */}
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <span
            aria-hidden="true"
            className="h-px w-10 bg-gradient-to-r from-transparent to-[var(--inv-accent-yellow)]"
          />
          <span className="text-[0.7rem] uppercase tracking-[0.45em] text-[var(--inv-accent-pink)] md:text-xs md:tracking-[0.5em]">
            {label}
          </span>
          <span
            aria-hidden="true"
            className="h-px w-10 bg-gradient-to-l from-transparent to-[var(--inv-accent-yellow)]"
          />
        </div>
        <Flourish className="mx-auto mt-5 h-6 w-44 text-[var(--inv-botanical)] opacity-80" />

        <div className="mt-7 grid grid-cols-4 md:mt-9">
          {units.map((u, i) => (
            <Unit
              key={u.label}
              value={u.value}
              label={u.label}
              reduced={reduced}
              last={i === units.length - 1}
            />
          ))}
        </div>
      </div>
    </GoldFrame>
  );
}
