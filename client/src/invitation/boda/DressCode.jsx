import { motion, useReducedMotion } from "motion/react";
import { SectionTitle } from "../shared/util.jsx";
import { EASE, Reveal } from "../motion.jsx";

export default function BodaDressCode({ cfg }) {
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
    <section className="py-24 px-4 bg-inv-bg">
      <div className="max-w-4xl mx-auto">
        <SectionTitle eyebrow="Dress Code" title="Código de Vestimenta" />
        <Reveal>
          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          >
            {items.map((item, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, scale: 0.85 },
                  show: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE } },
                }}
                whileHover={reduced ? undefined : { y: -4, transition: { type: "spring", stiffness: 300, damping: 18 } }}
                className="flex items-center gap-3 rounded-2xl border border-inv-primary/30 bg-inv-surface px-6 py-4 transition-colors duration-300 hover:border-inv-primary/50"
              >
                <DressIcon name={item.icon} />
                <span className="font-inv-heading text-lg text-inv-text-soft">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
        {cfg.dress_note && (
          <Reveal className="mt-8 text-center text-inv-text-soft font-light italic">
            {cfg.dress_note}
          </Reveal>
        )}
      </div>
    </section>
  );
}

function DressIcon({ name }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    className: "w-8 h-8 text-inv-primary",
  };
  switch (name) {
    case "tie":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M9 3h6l2 4-4 4 2 8-3 2-3-2 2-8-4-4z" strokeLinejoin="round" />
        </svg>
      );
    case "gown":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path
            d="M12 3c2 0 3 1 3 3 0 1-1 2-3 4s-3-3-3-4c0-2 1-3 3-3z"
            strokeLinejoin="round"
          />
          <path d="M9 6l-4 6 5 9h4l5-9-4-6" strokeLinejoin="round" />
        </svg>
      );
    case "formal":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M6 3h5l-1 5h3l6-2v4l-8 12-8-12V6l4 2z" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeLinejoin="round" />
        </svg>
      );
  }
}