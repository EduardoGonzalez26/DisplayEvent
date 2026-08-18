import { useEffect, useMemo, useState } from "react";
import { Reveal } from "./util.jsx";

function useCountdown(target) {
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

export default function Countdown({ date, time }) {
  const target = useMemo(
    () => new Date(`${date}T${time || "00:00:00"}`).getTime(),
    [date, time],
  );
  const { days, hours, minutes, seconds, done } = useCountdown(target);

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
            <div
              key={u.label}
              className="relative rounded-2xl border border-inv-primary/40 bg-inv-surface/90 backdrop-blur px-2 py-4 md:py-6 text-center shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-inv-primary/60 hover:shadow-[0_18px_40px_var(--inv-shadow-soft)]"
            >
              <div className="font-inv-heading text-3xl md:text-5xl text-gold-gradient tabular-nums">
                {String(u.value).padStart(2, "0")}
              </div>
              <div className="mt-2 text-[10px] md:text-xs uppercase tracking-[0.3em] text-inv-text-soft">
                {u.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}