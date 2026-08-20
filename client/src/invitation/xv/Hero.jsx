import { Suspense, lazy, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { Corner, Ornament } from "../shared/util.jsx";
import GlassCountdown from "./GlassCountdown.jsx";
import { EASE } from "../motion.jsx";

const XvPearlsHero3D = lazy(() => import("../3d/XvPearlsHero3D.jsx"));

/* Iniciales de la quinceañera para el monograma ("Alice Renata" -> "AR"). */
const initialsOf = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "XV";
  const first = parts[0][0].toUpperCase();
  const last = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : "";
  return `${first}${last}`;
};

/* ------------------------------------------------------------------
   Monograma esculpido: cara de madreperla iridiscente (CSS) con canto
   dorado. Se ensambla a partir de fragmentos al abrir la invitación y
   se inclina suavemente siguiendo el ratón.
------------------------------------------------------------------ */
function Monogram({ letters, tiltX, tiltY, reveal, reduced }) {
  const rotX = useSpring(useTransform(tiltY, [-1, 1], [12, -12]), {
    stiffness: 55,
    damping: 16,
  });
  const rotY = useSpring(useTransform(tiltX, [-1, 1], [-14, 14]), {
    stiffness: 55,
    damping: 16,
  });

  return (
    <motion.div
      className="relative inline-block select-none"
      style={{
        perspective: 900,
        transformStyle: "preserve-3d",
        rotateX: reduced ? 0 : rotX,
        rotateY: reduced ? 0 : rotY,
      }}
      aria-hidden="true"
    >
      <span className="monogram-halo pointer-events-none absolute -inset-x-16 -inset-y-10 -z-10" />
      <div
        className="flex items-center justify-center font-inv-display leading-none tracking-[0.03em]"
        style={{ fontSize: "clamp(5.5rem, 21vw, 11rem)" }}
      >
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            className="monogram-pearl monogram-shimmer inline-block"
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.2, rotateY: i === 0 ? -150 : 150, x: i === 0 ? -80 : 80 }
            }
            animate={
              reduced
                ? { opacity: reveal ? 1 : 0 }
                : { opacity: reveal ? 1 : 0, scale: 1, rotateY: 0, x: 0 }
            }
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 15,
              delay: reveal ? 0.35 + i * 0.18 : 0,
            }}
          >
            {letter}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------
   Fondo de alta costura: seda rosa empolvada con pliegues realistas
   (gradientes + grano SVG) y un velo que se despliega al abrir.
------------------------------------------------------------------ */
function SilkBackdrop({ reveal, reduced, bgY }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        {/* Seda base */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(165deg, #ffe7e2 0%, #ffd8d2 42%, #f3b8b4 74%, #e8a3a1 100%)",
          }}
        />
        {/* Pliegues de seda */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 16% 8%, rgba(255,255,255,0.55), transparent 55%), radial-gradient(110% 100% at 86% 30%, rgba(214,129,122,0.4), transparent 52%), radial-gradient(130% 110% at 50% 108%, rgba(255,241,240,0.85), transparent 60%), radial-gradient(70% 55% at 30% 90%, rgba(240,170,166,0.5), transparent 60%)",
          }}
        />
        {/* Grano tejido de la seda */}
        <div
          className="silk-grain absolute inset-0 mix-blend-soft-light opacity-70"
          style={{ transform: "scale(1.15)" }}
        />
        {/* Velo que se despliega suavemente al abrir */}
        {!reduced && (
          <motion.div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, #fffaf6, #ffe9e4)" }}
            initial={{ opacity: reveal ? 0 : 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.3, ease: "easeOut", delay: reveal ? 0.15 : 0 }}
          />
        )}
      </motion.div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-a),transparent_62%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--inv-radial-b),transparent_68%)]" />
    </div>
  );
}

/* ------------------------------------------------------------------
   Hero XV premium: monograma madreperla, seda, perlas 3D y paneles de
   cristal con filigrana dorada. La apertura (sobre) sincroniza el
   ensamblaje del monograma, el despliegue de la seda y la flotación
   de las perlas.
------------------------------------------------------------------ */
export default function XvHero({ event, family, cfg, theme, reveal = true }) {
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

  // Ratón normalizado (-1..1) para el parallax de perlas y la inclinación
  // del monograma, medido sobre todo el hero.
  const pointerRef = useRef({ x: 0, y: 0 });
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const onPointerMove = (e) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    pointerRef.current = { x, y };
    tiltX.set(x);
    tiltY.set(y);
  };

  const celebrantName = (cfg.celebrant_name || "").trim() || event.name;
  const kicker = (cfg.kicker || "").trim() || theme?.labels?.defaultKicker;
  const monogram = initialsOf(celebrantName);
  const parents = Array.isArray(cfg.parents)
    ? cfg.parents
        .map((p) => (p && typeof p === "object" ? p.name : p) || "")
        .map((p) => (p || "").trim())
        .filter(Boolean)
    : [];

  const entrance = (i = 0) => ({
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.9, ease: EASE, delay: 0.5 + i * 0.14 },
    },
  });

  return (
    <header
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-inv-bg"
      onPointerMove={onPointerMove}
    >
      <SilkBackdrop reveal={reveal} reduced={reduced} bgY={bgY} />

      {/* Perlas y orbes dorados en planos de profundidad */}
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <XvPearlsHero3D pointer={pointerRef} active={reveal} />
        </Suspense>
      </div>

      {/* Marco de filigrana dorada con esquinas ornamentales */}
      <div
        className="pointer-events-none absolute inset-4 md:inset-8 z-[2] rounded-[1.6rem] text-inv-primary/70"
        style={{
          border: "1px solid rgba(171,146,104,0.5)",
          outline: "1px solid rgba(171,146,104,0.22)",
          outlineOffset: 6,
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: reveal ? 1 : 0 }}
          transition={{ duration: 1.6, ease: EASE, delay: reveal ? 0.6 : 0 }}
        >
          <Corner className="top-0 left-0" />
          <Corner className="top-0 right-0 rotate-90" />
          <Corner className="bottom-0 left-0 -rotate-90" />
          <Corner className="bottom-0 right-0 rotate-180" />
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 text-center px-5 py-24 md:py-28 max-w-3xl w-full"
        style={{ y: contentY }}
      >
        <motion.p
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(0)}
          className="glass-panel mx-auto inline-block rounded-full px-5 py-2 text-[0.62rem] uppercase tracking-[0.5em] text-inv-text-soft"
        >
          {kicker}
        </motion.p>

        <div className="mt-4 md:mt-6">
          <Monogram
            letters={[...monogram]}
            tiltX={tiltX}
            tiltY={tiltY}
            reveal={reveal}
            reduced={reduced}
          />
        </div>

        <motion.h1
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(1)}
          className="hero-title-glow mt-2 font-inv-script text-5xl md:text-7xl leading-[1.3] text-gold-gradient text-balance"
        >
          {celebrantName}
        </motion.h1>

        {parents.length > 0 && (
          <motion.div
            initial="hidden"
            animate={reveal ? "show" : "hidden"}
            variants={entrance(2)}
            className="glass-panel mx-auto mt-8 max-w-lg rounded-[1.5rem] px-6 py-4"
          >
            <p className="text-[0.7rem] uppercase tracking-[0.3em] text-inv-text-soft">
              {theme?.labels?.parentsLine?.(parents) ||
                `Con el amor de sus padres · ${parents.join(" y ")}`}
            </p>
          </motion.div>
        )}

        <motion.div
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(3)}
          className="glass-panel mx-auto mt-4 flex max-w-md items-center justify-center gap-6 rounded-2xl px-6 py-4"
        >
          <div className="flex items-end justify-center gap-3">
            <span className="font-inv-heading hero-title-glow text-5xl md:text-6xl font-semibold text-inv-text-light tabular-nums">
              {day}
            </span>
            <span className="text-left text-sm leading-tight pb-1.5">
              <span className="block hero-text-shadow uppercase tracking-[0.28em] text-inv-text-muted">
                {month}
              </span>
              <span className="block hero-text-shadow text-inv-text text-lg">{year}</span>
            </span>
          </div>
          <span className="hidden sm:block h-px w-10 bg-gradient-to-r from-transparent to-inv-primary/60" />
          <p className="hero-text-shadow text-[0.65rem] uppercase tracking-[0.2em] text-inv-text-soft text-left">
            {pretty}
            <span className="block mt-1 text-inv-text">{event.time}</span>
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(3)}
        >
          <Ornament className="mt-8" />
        </motion.div>

        <motion.p
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(4)}
          className="hero-text-shadow mt-5 text-[0.65rem] uppercase tracking-[0.4em] text-inv-text-soft"
        >
          Invitación para&nbsp;la{" "}
          <span className="text-inv-text-soft font-semibold capitalize">{family}</span>
        </motion.p>

        {/* Contador de cristal integrado en el hero */}
        {reveal && <GlassCountdown date={event.date} time={event.time} />}
      </motion.div>

      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-inv-text-muted/80 text-2xl animate-float-slow"
        initial={{ opacity: 0 }}
        animate={{ opacity: reveal ? 1 : 0 }}
        transition={{ duration: 1, delay: 1.6 }}
        aria-hidden="true"
      >
        ↓
      </motion.div>
    </header>
  );
}