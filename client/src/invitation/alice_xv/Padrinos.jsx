import { motion, useReducedMotion } from "motion/react";
import { EASE, Reveal } from "../motion.jsx";
import { WeddingSectionTitle } from "./decor.jsx";

/* ------------------------------------------------------------------
   Padrinos (XV de Alice) — versión LOCAL de shared/Padrinos: padrinos
   en tarjetas con nombre en script rosa, cabecera `WeddingSectionTitle`
   local y acabado de tarjeta botánica (borde dorado, filete interior y
   diamante). Null si `cfg.padrinos` está vacío (misma paridad que
   shared/Padrinos).
------------------------------------------------------------------ */
export default function Padrinos({ cfg, theme }) {
  const padrinos = (Array.isArray(cfg.padrinos) ? cfg.padrinos : [])
    .map((p) => (p && typeof p === "object" ? p.name : p) || "")
    .map((p) => (p || "").trim())
    .filter(Boolean);
  const reduced = useReducedMotion();
  if (padrinos.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-inv-bg px-4 py-8 md:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-c),transparent_60%)]" />

      <div className="relative mx-auto max-w-4xl">
        <WeddingSectionTitle
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
              <motion.article
                key={`${name}-${i}`}
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
                  reduced
                    ? undefined
                    : { y: -6, transition: { type: "spring", stiffness: 300, damping: 18 } }
                }
                className="group relative rounded-[1.6rem] border border-[var(--inv-primary)]/35 bg-[var(--inv-surface)] px-7 py-6 text-center shadow-[0_16px_40px_var(--inv-shadow-card)] transition-shadow duration-300 hover:shadow-[0_24px_60px_var(--inv-shadow-mid)] md:px-9 md:py-7"
              >
                {/* Filete interior fino dorado */}
                <div
                  className="pointer-events-none absolute inset-[6px] rounded-[1.1rem] border border-[var(--inv-accent-yellow)]/45"
                  aria-hidden="true"
                />
                <span
                  className="absolute left-1/2 top-0 h-px w-14 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--inv-primary)]/70 to-transparent"
                  aria-hidden="true"
                />
                <svg
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  className="mx-auto mb-3 h-3 w-3 text-[var(--inv-primary)]/80"
                  aria-hidden="true"
                >
                  <path d="M6 0 8 6 6 12 4 6 6 0Z" />
                </svg>
                <span className="block font-inv-script text-3xl leading-[1.5] text-[var(--inv-accent-pink)] md:text-4xl">
                  {name}
                </span>
              </motion.article>
            ))}
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
