import { motion, useReducedMotion } from "motion/react";
import { EASE, Reveal } from "../motion.jsx";
import { Flourish, WeddingSectionTitle } from "./decor.jsx";

/* ------------------------------------------------------------------
   Dress Code botánico (Boda Jorge & Macarena): medallones finos con
   icono de línea verde, anillo naranja/amarillo y etiqueta verde; la
   nota se muestra como cita itálica centrada con floritura botánica.
   Copia los iconos SVG y la paridad de null de shared/DressCode (acepta
   array o string con saltos de línea).
------------------------------------------------------------------ */
export default function DressCode({ cfg, theme }) {
  const raw = cfg.dress_code || [];
  const items = Array.isArray(raw)
    ? raw
    : raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label) => ({ label }));
  const reduced = useReducedMotion();
  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-inv-bg px-4 py-8 md:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-c),transparent_60%)]" />

      <div className="relative mx-auto max-w-4xl">
        <WeddingSectionTitle
          eyebrow={theme?.labels?.dressCodeEyebrow ?? "Dress Code"}
          title={theme?.labels?.dressCode ?? "Código de Vestimenta"}
        />
        <Reveal>
          <motion.div
            className="flex flex-wrap justify-center gap-x-12 gap-y-10 md:gap-x-16"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          >
            {items.map((item, i) => (
              <motion.div
                key={`${item.label || item.icon || i}-${i}`}
                variants={{
                  hidden: { opacity: 0, scale: 0.85 },
                  show: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE } },
                }}
                whileHover={
                  reduced
                    ? undefined
                    : { y: -5, transition: { type: "spring", stiffness: 300, damping: 18 } }
                }
                className="group flex flex-col items-center gap-4 text-center"
              >
                {/* Medallón: icono en anillo naranja/amarillo fino */}
                <div className="relative grid h-24 w-24 place-items-center">
                  <div
                    className="absolute inset-0 rounded-full border border-[var(--inv-accent-yellow)]/60"
                    aria-hidden="true"
                  />
                  <div
                    className="absolute inset-2 rounded-full border border-[var(--inv-primary)]/70 bg-[var(--inv-surface)] shadow-[0_10px_30px_var(--inv-shadow-card)] transition-shadow duration-300 group-hover:shadow-[0_14px_40px_var(--inv-shadow-mid)]"
                    aria-hidden="true"
                  />
                  <DressIcon name={item.icon} className="relative h-9 w-9 text-[var(--inv-botanical)]" />
                </div>
                <span className="font-inv-heading text-lg text-[var(--inv-text)] md:text-xl">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>

        {cfg.dress_note && (
          <Reveal className="mt-14">
            <blockquote className="mx-auto max-w-2xl text-center">
              <span
                className="font-inv-script text-6xl leading-none text-[var(--inv-accent-pink)] md:text-7xl"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <p className="font-inv-serif text-xl italic leading-relaxed text-inv-text-soft md:text-2xl">
                {cfg.dress_note}
              </p>
              <Flourish className="mx-auto mt-6 h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
            </blockquote>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* Iconos de vestimenta (mismo set de shared/DressCode, coloreados
   con `currentColor` vía className). */
function DressIcon({ name, className = "" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    className,
  };
  switch (name) {
    case "tie":
      return (
        <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 3h6l2 4-4 4 2 8-3 2-3-2 2-8-4-4z" strokeLinejoin="round" />
        </svg>
      );
    case "gown":
      return (
        <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3c2 0 3 1 3 3 0 1-1 2-3 4s-3-3-3-4c0-2 1-3 3-3z"
            strokeLinejoin="round"
          />
          <path d="M9 6l-4 6 5 9h4l5-9-4-6" strokeLinejoin="round" />
        </svg>
      );
    case "formal":
      return (
        <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h5l-1 5h3l6-2v4l-8 12-8-12V6l4 2z" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" strokeLinejoin="round" />
        </svg>
      );
  }
}
