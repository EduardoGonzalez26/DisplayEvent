import { motion, useReducedMotion } from "motion/react";
import { SectionTitle } from "../shared/util.jsx";
import { EASE, Reveal } from "../motion.jsx";

export default function XvPadrinos({ cfg, theme }) {
  const padrinos = (Array.isArray(cfg.padrinos) ? cfg.padrinos : [])
    .map((p) => (p && typeof p === "object" ? p.name : p) || "")
    .map((p) => (p || "").trim())
    .filter(Boolean);
  const reduced = useReducedMotion();
  if (padrinos.length === 0) return null;

  return (
    <section className="py-24 px-4 bg-inv-bg">
      <div className="max-w-4xl mx-auto">
        <SectionTitle
          eyebrow={theme?.labels?.padrinosEyebrow || "Honor"}
          title={theme?.labels?.padrinosTitle || "Nuestros Padrinos"}
          subtitle={theme?.labels?.padrinosSubtitle}
        />
        <Reveal>
          <motion.div
            className="flex flex-wrap justify-center gap-4 md:gap-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          >
            {padrinos.map((name, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, scale: 0.9, y: 20 },
                  show: {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: EASE },
                  },
                }}
                whileHover={
                  reduced ? undefined : { y: -6, transition: { type: "spring", stiffness: 300, damping: 18 } }
                }
                className="relative rounded-[1.6rem] border border-inv-primary/30 bg-inv-surface px-7 py-6 md:px-9 md:py-7 text-center shadow-[0_16px_40px_var(--inv-shadow-card)] transition-shadow duration-300 hover:shadow-[0_24px_60px_var(--inv-shadow-soft)]"
              >
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-px bg-gradient-to-r from-transparent via-inv-primary/70 to-transparent" />
                <svg
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  className="mx-auto mb-3 w-3 h-3 text-inv-primary/80"
                  aria-hidden="true"
                >
                  <path d="M6 0 8 6 6 12 4 6 6 0Z" />
                </svg>
                <span className="block font-inv-script text-3xl md:text-4xl text-gold-gradient leading-[1.5]">
                  {name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}