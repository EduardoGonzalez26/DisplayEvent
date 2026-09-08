import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { safeCssUrl } from "../shared/util.jsx";
import { EASE } from "../motion.jsx";
import { BotanicalCorner, Flourish } from "./decor.jsx";

/* Capitaliza la primera letra (los meses/días de `es-MX` llegan en minúscula). */
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* Monograma de la pareja: primeras letras de ambos nombres ("Jorge & Macarena" -> "J & M"). */
const initialsOf = (a, b) =>
  [a, b]
    .map((n) => String(n || "").trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .join(" & ");

/* Hojas/pétalos flotantes deterministas: mismo conjunto en cada render. */
function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const rng = seeded(96);
const FLOATERS = Array.from({ length: 10 }, (_, i) => ({
  top: `${(rng() * 80 + 6).toFixed(1)}%`,
  left: `${(rng() * 88 + 4).toFixed(1)}%`,
  size: 10 + rng() * 16,
  delay: rng() * 4,
  duration: 5 + rng() * 5,
  flip: rng() > 0.5,
  rotate: (rng() * 60 - 30).toFixed(0),
}));

/* Hoja flotante sutil con deriva suave (respeta prefers-reduced-motion). */
function FloatingLeaf({ top, left, size, delay, duration, flip, rotate, reduced }) {
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ top, left, width: size, height: size, rotate }}
      animate={
        reduced
          ? { opacity: 0.5 }
          : { opacity: [0.25, 0.6, 0.25], y: [0, -16, 0], rotate: [rotate, Number(rotate) + 14, rotate] }
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

/* Nombres con entrada letra a letra (desvanecimiento escalonado si se
   prefiere movimiento reducido: solo opacidad del bloque completo). */
function AnimatedLetters({ text, delay = 0, reduced }) {
  if (reduced) return <span>{text}</span>;
  return Array.from(text).map((ch, i) => (
    <motion.span
      key={`${i}-${ch}`}
      aria-hidden="true"
      className="inline-block whitespace-pre"
      initial={{ opacity: 0, y: 26, rotate: -5, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE, delay: delay + i * 0.05 }}
    >
      {ch}
    </motion.span>
  ));
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
   Portada botánica: `hero_image` etérea con overlay marfil al 60%, o
   degradado marfil como fallback. Flora de esquina (granada/bugambilia),
   hojas flotantes, nombres INMENSOS en Great Vibes rosa, fecha/hora en
   Playfair verde separadas por líneas finas amarillas, y scroll cue.
------------------------------------------------------------------ */
export default function BodaJorgeMacarenaHero({ event, family, cfg, reveal = true }) {
  const date = new Date(`${event.date}T00:00:00`);
  const day = date.getDate();
  const month = cap(date.toLocaleDateString("es-MX", { month: "long" }));
  const year = date.getFullYear();
  const weekday = cap(date.toLocaleDateString("es-MX", { weekday: "long" }));

  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 120]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -60]);

  const couple = cfg.couple || {};
  const nameA = String(couple.nameA || "").trim();
  const nameB = String(couple.nameB || "").trim();
  const mainNames = [nameA, nameB].filter(Boolean).join(" & ");
  const monogram = initialsOf(nameA, nameB);
  const kicker = String(cfg.kicker || "").trim();
  const tagline = String(cfg.tagline || "").trim();
  const bgImage = safeCssUrl(cfg.hero_image);
  const heroTitle = mainNames || event.name;

  return (
    <header
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: "var(--inv-hero-fallback)" }}
    >
      {/* Fondo con parallax: foto etérea con overlay marfil o degradado claro */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          {bgImage ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${bgImage}')` }}
              />
              {/* Overlay marfil al 60%: imagen etérea de fondo */}
              <div className="absolute inset-0 bg-[#FDFBF7]/60" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#FDFBF7]/30 via-[#FDFBF7]/40 to-[#FDFBF7]/70" />
            </>
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{ background: "var(--inv-hero-fallback)" }}
              />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-a),transparent_62%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,var(--inv-radial-b),transparent_55%)]" />
            </>
          )}
        </motion.div>
        {/* Hojas flotantes en su propia capa */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {FLOATERS.map((f, i) => (
            <FloatingLeaf key={i} {...f} reduced={reduced} />
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

      {/* Línea hairline interior fina (amarillo 1px) */}
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
        className="relative z-10 w-full max-w-3xl px-6 pb-28 pt-24 text-center md:pb-32 md:pt-28"
        initial="hidden"
        animate={reveal ? "show" : "hidden"}
        style={{ y: contentY }}
      >
        {/* Monograma + kicker */}
        <motion.div variants={entrance(0)} className="flex flex-col items-center gap-3">
          {monogram && (
            <span
              aria-hidden="true"
              className="font-inv-serif text-3xl tracking-[0.25em] text-[var(--inv-botanical)] md:text-4xl"
            >
              {monogram}
            </span>
          )}
          {kicker && (
            <p className="text-[0.62rem] uppercase tracking-[0.55em] text-[var(--inv-primary)] md:text-xs">
              {kicker}
            </p>
          )}
        </motion.div>

        {/* Nombres INMENSOS en Great Vibes rosa con entrada letra a letra */}
        <motion.h1
          variants={entrance(1, 0.3)}
          aria-label={heroTitle}
          className="mt-8 font-inv-script text-6xl leading-[1.2] text-balance text-[var(--inv-accent-pink)] sm:text-8xl md:text-[7rem]"
        >
          <AnimatedLetters text={heroTitle} delay={0.3} reduced={reduced} />
        </motion.h1>

        <motion.div variants={entrance(2)}>
          <Flourish className="mx-auto mt-10 h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
        </motion.div>

        {tagline && (
          <motion.p
            variants={entrance(2)}
            className="mt-8 font-inv-serif text-lg italic text-balance text-[var(--inv-text-soft)] md:text-2xl"
          >
            {tagline}
          </motion.p>
        )}

        {/* Fecha/hora: tipografía Playfair verde, separada por líneas amarillas 1px */}
        <motion.div variants={entrance(3)} className="mt-12">
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center justify-center gap-5">
              <span className="h-px w-10 bg-[var(--inv-accent-yellow)]" aria-hidden="true" />
              <p className="font-inv-heading text-2xl text-[var(--inv-text)] md:text-3xl">
                {weekday}
              </p>
              <span className="h-px w-10 bg-[var(--inv-accent-yellow)]" aria-hidden="true" />
            </div>
            <p className="font-inv-heading text-4xl font-medium tabular-nums text-[var(--inv-text)] md:text-5xl">
              <span className="text-[var(--inv-primary)]">{day}</span> de {month},{" "}
              <span className="text-[var(--inv-text-muted)]">{year}</span>
            </p>
            {event.time && (
              <>
                <span className="h-px w-24 bg-[var(--inv-accent-yellow)]" aria-hidden="true" />
                <p className="text-sm uppercase tracking-[0.35em] tabular-nums text-[var(--inv-text-soft)] md:text-base">
                  {event.time}
                </p>
              </>
            )}
          </div>
        </motion.div>

        <motion.p
          variants={entrance(4)}
          className="mt-12 text-[0.62rem] uppercase tracking-[0.4em] text-[var(--inv-text-muted)] md:text-xs"
        >
          Invitación para&nbsp;la{" "}
          <span className="font-semibold capitalize text-[var(--inv-accent-pink)]">
            {family}
          </span>
        </motion.p>
      </motion.div>

      {/* Scroll cue "Desliza" */}
      <motion.div
        className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[var(--inv-primary)] md:bottom-20"
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
