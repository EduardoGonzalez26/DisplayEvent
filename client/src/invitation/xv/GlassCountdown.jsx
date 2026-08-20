import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useCountdown } from "../shared/Countdown.jsx";
import { Reveal, EASE } from "../motion.jsx";

/* ------------------------------------------------------------------
   Contador de cristal: paneles esmerilados con borde dorado y dígitos
   en huecos neumórficos esculpidos sobre la propia superficie de seda.
   Reemplaza al contador flip compartido dentro del hero de XV.
------------------------------------------------------------------ */
function GlassNumber({ value, label, reduced }) {
  const text = String(value).padStart(2, "0");
  return (
    <motion.div
      className="glass-panel rounded-2xl px-2 py-4 md:py-5 text-center shadow-[0_18px_40px_var(--inv-shadow-soft)]"
      whileHover={reduced ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div className="glass-numeral relative h-10 md:h-14 overflow-hidden rounded-xl">
        <AnimatePresence initial={false}>
          <motion.div
            key={text}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: "55%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: "-55%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute inset-0 flex items-center justify-center font-inv-heading text-3xl md:text-5xl text-gold-gradient tabular-nums"
          >
            {text}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-2.5 text-[10px] md:text-xs uppercase tracking-[0.3em] text-inv-text-soft">
        {label}
      </div>
    </motion.div>
  );
}

export default function GlassCountdown({ date, time }) {
  const target = useMemo(
    () => new Date(`${date}T${time || "00:00:00"}`).getTime(),
    [date, time],
  );
  const { days, hours, minutes, seconds, done } = useCountdown(target);
  const reduced = useReducedMotion();

  if (done) {
    return (
      <Reveal className="mt-6">
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
    <Reveal className="mt-8">
      <div className="relative max-w-2xl mx-auto">
        <div className="pointer-events-none absolute -inset-3 rounded-[1.9rem] border border-inv-primary/30" />
        <div className="pointer-events-none absolute -inset-[1.4rem] hidden sm:block rounded-[2.4rem] border border-inv-primary/15" />
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {units.map((u) => (
            <GlassNumber key={u.label} value={u.value} label={u.label} reduced={reduced} />
          ))}
        </div>
      </div>
    </Reveal>
  );
}