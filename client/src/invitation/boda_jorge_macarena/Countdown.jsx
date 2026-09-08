import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useCountdown } from "../shared/Countdown.jsx";
import { EASE } from "../motion.jsx";
import { Flourish } from "./decor.jsx";

/* ------------------------------------------------------------------
   Cuenta regresiva minimalista tipográfica (Boda Jorge & Macarena):
   números GRANDES y DELGADOS en verde botánico sobre marfil, etiquetas
   en minúscula itálica rosa y separadores verticales finos amarillos
   entre unidades. Sin cajas. Reutiliza `useCountdown` compartido.

   IMPORTANTE: el bloque se renderiza SIEMPRE visible, sin `Reveal` ni
   `whileInView`. Este contador flota con margen negativo sobre el
   cierre del hero y el IntersectionObserver de `Reveal` no disparaba su
   entrada al viewport, por lo que se quedaba en `opacity: 0` (parecía
   "no funcionar"). El dígito se pinta en flujo normal (sin `absolute
   inset-0` ni `AnimatePresence`), con un cross-fade sutil que nunca
   baja a `opacity: 0`, de modo que el número siempre sea visible y
   actualice cada segundo.
------------------------------------------------------------------ */
function Unit({ value, label, reduced, last = false }) {
  const text = String(value).padStart(2, "0");
  return (
    <div
      className={`flex flex-col items-center gap-2 px-2 text-center md:px-3 ${
        last ? "" : "border-r border-[var(--inv-accent-yellow)]/70"
      }`}
    >
      <motion.span
        key={text}
        initial={reduced ? false : { opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="font-inv-body text-4xl font-light tabular-nums leading-none text-[var(--inv-text)] md:text-6xl"
      >
        {text}
      </motion.span>
      <div className="font-inv-serif text-sm lowercase italic tracking-wide text-[var(--inv-accent-pink)] md:text-base">
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

  /* Estado "¡Es hoy!": elegante y tipográfico, siempre visible. */
  if (done) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <Flourish className="mx-auto h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
        <p className="mt-5 font-inv-script text-5xl leading-[1.4] text-[var(--inv-accent-pink)] md:text-6xl">
          ¡Es hoy!
        </p>
        <p className="mt-2 text-[0.62rem] uppercase tracking-[0.4em] text-inv-text-soft">
          El gran día ha llegado
        </p>
        <Flourish className="mx-auto mt-6 h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
      </div>
    );
  }

  const units = [
    { label: "días", value: days },
    { label: "horas", value: hours },
    { label: "minutos", value: minutes },
    { label: "segundos", value: seconds },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header "Faltan" */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--inv-accent-yellow)]" />
        <p className="text-[0.62rem] uppercase tracking-[0.5em] text-inv-text-soft md:text-xs">
          {label}
        </p>
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--inv-accent-yellow)]" />
      </div>
      <div className="grid grid-cols-4">
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
  );
}
