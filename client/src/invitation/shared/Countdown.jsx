import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Reveal, EASE } from "../motion.jsx";

export function useCountdown(target) {
  const calc = () => {
    const diff = Math.max(0, target - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      done: diff === 0,
    };
  };
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);

  return left;
}

function FlipNumber({ value, label, reduced }) {
  const text = String(value).padStart(2, "0");
  return (
    <motion.div
      className="relative rounded-2xl border border-inv-primary/40 bg-inv-surface/90 backdrop-blur px-2 py-4 md:py-6 text-center shadow-xl transition-shadow duration-300 hover:shadow-[0_18px_40px_var(--inv-shadow-soft)]"
      whileHover={reduced ? undefined : { y: -6, borderColor: "var(--inv-primary)" }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <div className="relative h-9 md:h-12 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={text}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: "60%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: "-60%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute inset-0 flex items-center justify-center font-inv-heading text-3xl md:text-5xl text-gold-gradient tabular-nums"
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
    <Reveal className="mt-6">
      <div className="relative max-w-2xl mx-auto">
        <div className="absolute -inset-3 rounded-3xl border border-inv-primary/15 pointer-events-none" />
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {units.map((u) => (
            <FlipNumber key={u.label} value={u.value} label={u.label} reduced={reduced} />
          ))}
        </div>
      </div>
    </Reveal>
  );
}