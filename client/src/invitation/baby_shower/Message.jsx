import { motion, useReducedMotion } from "motion/react";
import { Ornament, highlightMessage } from "../shared/util.jsx";
import { EASE } from "../motion.jsx";

export default function BabyShowerMessage({ cfg, family, theme }) {
  const message =
    cfg.message ||
    theme?.labels?.defaultMessage?.(family) ||
    `Familia ${family}, queremos compartir con ustedes la llegada de nuestro bebé. Su compañía será nuestro mejor regalo.`;

  const parents = Array.isArray(cfg.parents)
    ? cfg.parents
        .map((p) => (p && typeof p === "object" ? p.name : p) || "")
        .map((p) => (p || "").trim())
        .filter(Boolean)
    : [];
  const signature = (parents.length ? parents.join(" & ") : null) || cfg.celebrants || null;
  const reduced = useReducedMotion();

  return (
    <section className="relative py-24 md:py-32 px-6 bg-inv-bg overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--inv-radial-c),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-y-0 -left-24 w-64 rounded-full bg-inv-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-y-0 -right-24 w-64 rounded-full bg-inv-primary/10 blur-3xl" />

      <motion.div
        className="relative max-w-2xl mx-auto"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14 } } }}
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
          }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-inv-primary/60" />
          <span className="text-inv-text-muted text-[0.6rem] tracking-[0.5em] uppercase">
            Un mensaje para ustedes
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-inv-primary/60" />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 26, scale: 0.98 },
            show: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.9, ease: EASE },
            },
          }}
          className="relative rounded-[2rem] border border-inv-primary/30 bg-gradient-to-b from-inv-surface to-inv-bg backdrop-blur-sm px-6 md:px-12 py-12 md:py-16 shadow-[0_30px_80px_var(--inv-shadow-mid)]"
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-inv-primary/70 to-transparent" />

          <p className="mt-2 font-inv-serif text-2xl md:text-[2rem] leading-[1.7] text-inv-text-muted italic text-balance">
            {highlightMessage(message, family)}
          </p>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
          }}
          className="mt-10 flex justify-center"
        >
          <Ornament />
        </motion.div>

        {signature && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            whileInView={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
            className="mt-8 text-center"
          >
            <p className="text-[0.62rem] uppercase tracking-[0.45em] text-inv-text-soft mb-2">
              Con cariño
            </p>
            <p className="font-inv-script text-4xl md:text-6xl text-gold-gradient leading-[1.4]">
              {signature}
            </p>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}