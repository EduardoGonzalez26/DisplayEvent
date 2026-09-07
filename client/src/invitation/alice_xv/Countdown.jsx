import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useCountdown } from "../shared/Countdown.jsx";
import { Reveal, EASE } from "../motion.jsx";

/* ------------------------------------------------------------------
   Contador premium (Alice XV): panel único cohesivo con borde dorado,
   etiqueta "QUEDAN:" centrada y 4 cajas (Días/Horas/Minutos/Segundos)
   con dígitos sans-serif modernos. Reutiliza `useCountdown` compartido.
------------------------------------------------------------------ */
function UnitBox({ value, label, reduced }) {
  const text = String(value).padStart(2, "0");
  return (
    <motion.div
      className="rounded-xl border border-inv-primary/50 bg-inv-surface/80 backdrop-blur-sm px-2 py-3 md:py-5 text-center shadow-[0_14px_32px_var(--inv-shadow-soft)]"
      whileHover={reduced ? undefined : { y: -5 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div className="relative h-10 md:h-14 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={text}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: "55%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: "-55%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute inset-0 flex items-center justify-center font-inv-heading text-3xl md:text-5xl text-inv-primary-dark tabular-nums"
          >
            {text}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-2 text-[10px] md:text-xs uppercase tracking-[0.3em] text-inv-text-soft">
        {label}
      </div>
    </motion.div>
  );
}

export default function Countdown({ date, time }) {
  const target = useMemo(() => {
    if (!date) return null;
    const ts = new Date(`${date}T${time || "00:00:00"}`).getTime();
    return Number.isNaN(ts) ? null : ts;
  }, [date, time]);
  const { days, hours, minutes, seconds, done } = useCountdown(target);
  const reduced = useReducedMotion();

  if (target == null) return null;

  if (done) {
    return (
      <Reveal className="mt-8">
        <p className="text-center text-inv-text-soft tracking-[0.3em] uppercase text-sm">
          ¡Es hoy!
        </p>
      </Reveal>
    );
  }

  const units = [
    { label: "Días", value: days },
    { label: "Horas", value: hours },
    { label: "Minutos", value: minutes },
    { label: "Segundos", value: seconds },
  ];

  return (
    <Reveal className="mt-8 md:mt-10">
      <div className="relative max-w-xl mx-auto">
        {/* Panel cohesivo con doble borde dorado */}
        <div className="pointer-events-none absolute -inset-3 rounded-[1.6rem] border border-inv-primary/20" />
        <div className="rounded-2xl border border-inv-primary/40 bg-inv-surface/60 backdrop-blur-sm px-5 py-5 md:px-8 md:py-7">
          <p className="mb-5 text-center text-[0.65rem] md:text-xs uppercase tracking-[0.5em] text-inv-text-soft">
            Quedan:
          </p>
          <div className="grid grid-cols-4 gap-2 md:gap-3">
            {units.map((u) => (
              <UnitBox key={u.label} value={u.value} label={u.label} reduced={reduced} />
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
