import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { safeCssUrl } from "../shared/util.jsx";
import { EASE } from "../motion.jsx";
import { BotanicalCorner, Flourish } from "./decor.jsx";

/* Capitaliza la primera letra (los meses/días de `es-MX` llegan en minúscula). */
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* Iniciales de la quinceañera para el monograma ("Alice Renata" -> "AR"):
   primera letra de la primera palabra + primera letra de la ÚLTIMA palabra. */
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

/* Pétalos flotantes deterministas: mismo conjunto en cada render. */
function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const rng = seeded(42);
const FLOATERS = Array.from({ length: 12 }, (_, i) => ({
  top: `${(rng() * 80 + 6).toFixed(1)}%`,
  left: `${(rng() * 88 + 4).toFixed(1)}%`,
  size: 10 + rng() * 16,
  delay: rng() * 4,
  duration: 5 + rng() * 5,
  flip: rng() > 0.5,
  rotate: (rng() * 60 - 30).toFixed(0),
}));

/* Pétalo rosa flotante con deriva suave (respeta prefers-reduced-motion). */
function FloatingPetal({ top, left, size, delay, duration, flip, rotate, reduced }) {
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ top, left, width: size, height: size, rotate }}
      animate={
        reduced
          ? { opacity: 0.5 }
          : {
              opacity: [0.25, 0.55, 0.25],
              y: [0, -18, 0],
              rotate: [rotate, Number(rotate) + 14, rotate],
            }
      }
      transition={
        reduced
          ? { duration: 0 }
          : { duration, repeat: Infinity, ease: "easeInOut", delay }
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-full w-full"
        style={{ transform: flip ? "scaleX(-1)" : undefined }}
      >
        <path
          d="M3 20 C 10 19, 16 12, 21 3 C 12 6, 7 11, 3 20 Z"
          fill="var(--inv-accent-pink)"
          opacity="0.35"
        />
      </svg>
    </motion.span>
  );
}

const entrance = (i = 0, delayBase = 0) => ({
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE, delay: delayBase + i * 0.12 },
  },
});

/* ------------------------------------------------------------------
   Portada (XV de Alice): `hero_image` etérea con overlay rosa/blanco, o
   degradado rosa pastel como fallback. Flora de esquina (rosas/perlas),
   pétalos flotantes, monograma "AR" en oro pulido, nombre en serif +
   script, línea de invitación, fecha/hora separadas por filetes dorados
   y scroll cue. Sin contador (es una tarjeta aparte).
------------------------------------------------------------------ */
export default function AliceXvHero({ event, family, cfg, theme, reveal = true }) {
  const date = new Date(`${event.date}T00:00:00`);
  const day = date.getDate();
  const month = cap(date.toLocaleDateString("es-MX", { month: "long" }));
  const year = date.getFullYear();
  const weekday = cap(date.toLocaleDateString("es-MX", { weekday: "long" }));

  const reduced = useReducedMotion();
  // Ref al propio <header> (el sticky lo posiciona visualmente, pero
  // useScroll mide vía offsetTop/offsetParent, así que el progreso no se
  // corrompe con el sticky). `scrollYProgress` va de 0 (portada visible)
  // a 1 (portada completamente tapada por el contenido que sube).
  const headerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: headerRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 120]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -60]);
  // Fade/scale sutil del contenido al ser tapado (efecto premium).
  const contentOpacity = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 0.4]);
  const contentScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 0.96]);

  const celebrantName = (cfg.celebrant_name || "").trim() || event.name;
  const monogram = initialsOf(celebrantName);
  const inviteLine = theme?.labels?.heroInvite || "Te Invitamos a Mis XV Años";
  const bgImage = safeCssUrl(cfg.hero_image);

  // Nombre: primera palabra en serif (Cormorant Garamond), el resto en
  // script (Dancing Script) con acabado dorado.
  const nameParts = celebrantName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  return (
    <header
      ref={headerRef}
      className="relative flex h-dvh items-center justify-center overflow-hidden"
      style={{ background: "var(--inv-hero-fallback)" }}
    >
      {/* Fondo con parallax: foto etérea con overlay rosa/blanco o degradado claro */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          {bgImage ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${bgImage}')` }}
              />
              {/* Overlay rosa/blanco al 60%: imagen etérea de fondo */}
              <div className="absolute inset-0 bg-[#FDF1F5]/60" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#FDF1F5]/30 via-[#FDF1F5]/45 to-[#FDF1F5]/75" />
            </>
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{ background: "var(--inv-hero-fallback)" }}
              />
              <div className="paper-grain absolute inset-0 opacity-30 mix-blend-multiply" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-a),transparent_62%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,var(--inv-radial-b),transparent_55%)]" />
            </>
          )}
        </motion.div>
        {/* Pétalos flotantes en su propia capa */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {FLOATERS.map((f, i) => (
            <FloatingPetal key={i} {...f} reduced={reduced} />
          ))}
        </div>
      </div>

      {/* Flora botánica en las 4 esquinas */}
      <div
        className="pointer-events-none absolute inset-0 text-[var(--inv-botanical)]"
        aria-hidden="true"
      >
        <BotanicalCorner className="left-0 top-0 h-40 w-40 opacity-70 md:h-60 md:w-60" />
        <BotanicalCorner className="right-0 top-0 h-40 w-40 -scale-x-100 opacity-70 md:h-60 md:w-60" />
        <BotanicalCorner className="bottom-0 left-0 h-40 w-40 -scale-y-100 opacity-70 md:h-60 md:w-60" />
        <BotanicalCorner className="bottom-0 right-0 h-40 w-40 rotate-180 opacity-70 md:h-60 md:w-60" />
      </div>

      {/* Línea hairline interior fina (dorada 1px) */}
      <motion.div
        className="pointer-events-none absolute inset-3 md:inset-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.8, ease: EASE, delay: 0.4 }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 border border-[var(--inv-accent-yellow)]/35" />
        <div className="absolute inset-[10px] border border-[var(--inv-accent-yellow)]/15" />
      </motion.div>

      <motion.div
        className="relative z-10 w-full max-w-3xl px-6 pb-20 pt-14 text-center md:pb-32 md:pt-28"
        initial="hidden"
        animate={reveal ? "show" : "hidden"}
        style={{ y: contentY, opacity: contentOpacity, scale: contentScale }}
      >
        {/* Monograma "AR" en oro pulido */}
        <motion.div variants={entrance(0)}>
          <span
            aria-hidden="true"
            className="monogram-gold font-inv-serif inline-block select-none leading-none"
            style={{ fontSize: "clamp(4.5rem, 20vw, 10rem)" }}
          >
            {monogram}
          </span>
        </motion.div>

        {/* Nombre: serif + script */}
        <motion.h1
          variants={entrance(1, 0.25)}
          aria-label={celebrantName}
          className="mt-4 leading-[1.1] text-balance md:mt-6"
        >
          <span className="font-inv-serif text-5xl text-[var(--inv-text)] md:text-7xl">
            {firstName}
          </span>
          {lastName && (
            <>
              {" "}
              <span className="font-inv-script text-6xl text-gold-gradient md:text-8xl">
                {lastName}
              </span>
            </>
          )}
        </motion.h1>

        <motion.div variants={entrance(2)}>
          <Flourish className="mx-auto mt-6 h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
        </motion.div>

        {/* Línea de invitación */}
        <motion.p
          variants={entrance(2)}
          className="mt-5 font-inv-serif text-xl italic text-balance text-[var(--inv-text-soft)] md:text-2xl"
        >
          {inviteLine}
        </motion.p>

        {/* Fecha/hora separadas por filetes dorados 1px */}
        <motion.div variants={entrance(3)} className="mt-7">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-5">
              <span className="h-px w-10 bg-[var(--inv-accent-yellow)]" aria-hidden="true" />
              <p className="font-inv-heading text-lg text-[var(--inv-text)] md:text-2xl">
                {weekday}
              </p>
              <span className="h-px w-10 bg-[var(--inv-accent-yellow)]" aria-hidden="true" />
            </div>
            <p className="font-inv-heading text-3xl font-medium tabular-nums text-[var(--inv-text)] md:text-5xl">
              <span className="text-[var(--inv-primary)]">{day}</span> de {month},{" "}
              <span className="text-[var(--inv-text-muted)]">{year}</span>
            </p>
            {event.time && (
              <>
                <span className="h-px w-24 bg-[var(--inv-accent-yellow)]" aria-hidden="true" />
                <p className="text-xs uppercase tracking-[0.35em] tabular-nums text-[var(--inv-text-soft)] md:text-base">
                  {event.time}
                </p>
              </>
            )}
          </div>
        </motion.div>

        <motion.p
          variants={entrance(4)}
          className="mt-7 text-[0.62rem] uppercase tracking-[0.4em] text-[var(--inv-text-muted)] md:text-xs"
        >
          Invitación para&nbsp;la{" "}
          <span className="font-semibold capitalize text-[var(--inv-accent-pink)]">
            {family}
          </span>
        </motion.p>
      </motion.div>

      {/* Scroll cue "Desliza" */}
      <motion.div
        className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[var(--inv-primary)] md:bottom-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: reveal ? 1 : 0 }}
        transition={{ duration: 1, delay: 1.8 }}
        aria-hidden="true"
      >
        <span className="text-[0.55rem] uppercase tracking-[0.45em] opacity-80">Desliza</span>
        <span className="animate-float-slow text-2xl">↓</span>
      </motion.div>
    </header>
  );
}
