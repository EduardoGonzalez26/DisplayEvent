import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Corner, Ornament } from "../shared/util.jsx";
import { EASE } from "../motion.jsx";

const entrance = (i = 0) => ({
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE, delay: i * 0.14 },
  },
});

export default function BabyShowerHero({ event, family, cfg, theme }) {
  const date = new Date(`${event.date}T00:00:00`);
  const pretty = date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const month = date.toLocaleDateString("es-MX", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();

  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 120]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -60]);

  const parents = Array.isArray(cfg.parents)
    ? cfg.parents
        .map((p) => (p && typeof p === "object" ? p.name : p) || "")
        .map((p) => (p || "").trim())
        .filter(Boolean)
    : [];
  const mainNames = parents.join(" & ");
  const genderLabel = cfg.gender ? theme?.labels?.genderLabel?.(cfg.gender) : null;

  return (
    <header className="relative min-h-screen flex items-center justify-center overflow-hidden bg-inv-bg">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          <div
            className="absolute inset-0 h-full w-full bg-cover bg-center hero-zoom"
            style={{
              backgroundImage: cfg.hero_image
                ? `url('${cfg.hero_image}')`
                : "var(--inv-hero-fallback)",
            }}
          />
        </motion.div>
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-inv-bg/80 via-inv-bg/50 to-inv-bg/90"
          style={{ y: bgY }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-a),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--inv-radial-b),transparent_68%)]" />
      </div>

      {/* Marco decorativo en esquinas */}
      <motion.div
        className="absolute inset-4 md:inset-8 pointer-events-none text-inv-primary/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, ease: EASE, delay: 0.5 }}
      >
        <Corner className="top-0 left-0" />
        <Corner className="top-0 right-0 rotate-90" />
        <Corner className="bottom-0 left-0 -rotate-90" />
        <Corner className="bottom-0 right-0 rotate-180" />
      </motion.div>

      <motion.div
        className="relative z-10 text-center px-6 py-24 max-w-3xl w-full"
        initial="hidden"
        animate="show"
        style={{ y: contentY }}
      >
        <motion.h1
          variants={entrance(0)}
          className="hero-title-glow font-inv-script text-6xl md:text-8xl leading-[1.3] text-gold-gradient text-balance"
        >
          {mainNames || event.name}
        </motion.h1>
        {mainNames && event.name && (
          <motion.p
            variants={entrance(1)}
            className="hero-text-shadow mt-5 text-[0.65rem] uppercase tracking-[0.4em] text-inv-text-soft"
          >
            {event.name}
          </motion.p>
        )}
        {genderLabel && (
          <motion.p
            variants={entrance(1)}
            className="hero-text-shadow mt-4 text-sm tracking-[0.2em] text-inv-text-soft"
          >
            {genderLabel}
          </motion.p>
        )}

        <motion.p
          variants={entrance(2)}
          className="hero-text-shadow mt-9 text-[0.65rem] uppercase tracking-[0.4em] text-inv-text-soft"
        >
          Invitación para&nbsp;la <span className="text-inv-text-soft font-semibold capitalize">{family}</span>
        </motion.p>

        <motion.div
          variants={entrance(3)}
          className="mt-10 flex items-center justify-center gap-6"
        >
          <span className="hidden sm:block h-px w-12 bg-gradient-to-r from-transparent to-inv-primary/50" />
          <div className="flex items-end justify-center gap-3">
            <span className="font-inv-heading hero-title-glow text-6xl md:text-7xl font-semibold text-inv-text-light tabular-nums">
              {day}
            </span>
            <span className="text-left text-sm leading-tight pb-2">
              <span className="block hero-text-shadow uppercase tracking-[0.28em] text-inv-text-muted">
                {month}
              </span>
              <span className="block hero-text-shadow text-inv-text text-lg">{year}</span>
            </span>
          </div>
          <span className="hidden sm:block h-px w-12 bg-gradient-to-l from-transparent to-inv-primary/50" />
        </motion.div>

        <motion.div variants={entrance(4)}>
          <Ornament className="mt-10" />
        </motion.div>

        <motion.p
          variants={entrance(4)}
          className="hero-text-shadow mt-5 text-[0.7rem] uppercase tracking-[0.28em] text-inv-text-soft"
        >
          {pretty} · {event.time}
        </motion.p>
      </motion.div>

      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-inv-text-muted/80 text-2xl animate-float-slow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.4 }}
        aria-hidden="true"
      >
        ↓
      </motion.div>
    </header>
  );
}