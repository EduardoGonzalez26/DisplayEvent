import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useCountdown } from "../shared/Countdown.jsx";
import { Reveal, EASE } from "../motion.jsx";
import { Flourish } from "./decor.jsx";

/* ------------------------------------------------------------------
   Cuenta regresiva minimalista tipográfica (Boda Jorge & Macarena):
   números GRANDES y DELGADOS en verde botánico sobre marfil, etiquetas
   en minúscula itálica rosa y separadores verticales finos amarillos
   entre unidades. Sin cajas. Reutiliza `useCountdown` compartido.
------------------------------------------------------------------ */
function Unit({ value, label, reduced, last = false }) {
  const text = String(value).padStart(2, "0");
  return (
    <div
      className={`relative flex flex-col items-center gap-2 px-2 text-center md:px-3 ${
        last ? "" : "border-r border-[var(--inv-accent-yellow)]/70"
      }`}
    >
      <div className="relative h-12 overflow-hidden md:h-16">
        <AnimatePresence initial={false}>
          <motion.div
            key={text}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: "55%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: "-55%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute inset-0 flex items-center justify-center font-inv-body text-4xl font-light tabular-nums text-[var(--inv-text)] md:text-6xl"
          >
            {text}
          </motion.div>
        </AnimatePresence>
      </div>
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

  /* Estado "¡Es hoy!": elegante y tipográfico. */
  if (done) {
    return (
      <Reveal>
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
      </Reveal>
    );
  }

  const units = [
    { label: "días", value: days },
    { label: "horas", value: hours },
    { label: "minutos", value: minutes },
    { label: "segundos", value: seconds },
  ];

  return (
    <Reveal>
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
    </Reveal>
  );
}
