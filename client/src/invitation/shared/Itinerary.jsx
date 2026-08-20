import { motion, useReducedMotion } from "motion/react";
import { SectionTitle } from "./util.jsx";
import { EASE, Reveal } from "../motion.jsx";

export default function ItinerarySection({ cfg }) {
  const items = (cfg.itinerary || []).map((it) => ({
    label: it.label,
    time: it.time,
  }));
  const reduced = useReducedMotion();
  if (items.length === 0) return null;

  return (
    <section className="py-24 px-4 bg-inv-bg-alt">
      <div className="max-w-3xl mx-auto">
        <SectionTitle
          eyebrow="Horarios"
          title="Nuestro Itinerario"
          subtitle="Los momentos que viviremos juntos durante la celebración."
        />
        <div className="relative">
          <motion.div
            className="absolute left-6 md:left-7 top-3 bottom-3 w-px origin-top pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, var(--inv-primary), var(--inv-primary) 85%, transparent)",
              opacity: 0.45,
            }}
            initial={reduced ? { scaleY: 1 } : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 1.4, ease: EASE }}
          />
          <motion.div
            className="space-y-10"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.16 } } }}
          >
            {items.map((it, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, x: -24 },
                  show: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.7, ease: EASE },
                  },
                }}
                className="flex items-start gap-5 md:gap-8 group"
              >
                <motion.div
                  whileHover={reduced ? undefined : { scale: 1.12 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  className="relative z-10 grid place-items-center w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full border border-inv-primary/60 bg-inv-surface ring-4 ring-inv-ring font-inv-heading text-base md:text-lg text-gold-gradient"
                >
                  {String(i + 1).padStart(2, "0")}
                </motion.div>
                <div className="pt-1.5">
                  {it.time && (
                    <div className="text-inv-text-soft text-[0.7rem] tracking-[0.3em] uppercase">
                      {it.time}
                    </div>
                  )}
                  <h3 className="mt-1.5 font-inv-heading text-2xl md:text-3xl text-inv-text-soft">
                    {it.label || `Momento ${i + 1}`}
                  </h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}