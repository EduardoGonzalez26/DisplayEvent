import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Ornament, safeCssUrl } from "../shared/util.jsx";
import Countdown from "./Countdown.jsx";
import { EASE } from "../motion.jsx";

/* Iniciales de la quinceañera para el monograma ("Alice Renata" -> "AR").
   Primera letra de la primera palabra + primera letra de la ÚLTIMA palabra. */
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
   Arte botánico dorado para el margen inferior: tallo horizontal con
   hojas simétricas, bayas y una flor central. Oro metálico vía gradiente.
------------------------------------------------------------------ */
function Leaf({ x, y, flip = false, s = 1 }) {
  return (
    <path
      d="M0 0 C 10 -1, 16 -12, 26 -18 C 16 -6, 14 0, 0 0 Z"
      transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}
      fill="url(#bot-gold)"
      opacity="0.85"
    />
  );
}

function BotanicalBorder({ className = "" }) {
  return (
    <svg
      viewBox="0 0 1200 130"
      className={`w-full ${className}`}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient
          id="bot-gold"
          x1="600"
          y1="0"
          x2="600"
          y2="130"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#efd9a0" />
          <stop offset="0.5" stopColor="#d3a95c" />
          <stop offset="1" stopColor="#b8873a" />
        </linearGradient>
      </defs>

      {/* Tallo principal */}
      <path
        d="M0 106 C 160 64, 320 96, 480 92 S 720 92, 900 88 S 1080 98, 1200 76"
        stroke="url(#bot-gold)"
        strokeWidth="1.6"
        opacity="0.6"
      />

      {/* Racimos laterales: hojas + bayas */}
      <Leaf x={180} y={92} s={1.1} />
      <Leaf x={216} y={86} flip s={1.1} />
      <circle cx={250} cy={90} r="2.4" fill="url(#bot-gold)" opacity="0.9" />
      <circle cx={266} cy={82} r="2" fill="url(#bot-gold)" opacity="0.75" />

      <Leaf x={920} y={86} s={1.1} flip />
      <Leaf x={956} y={92} s={1.1} />
      <circle cx={988} cy={84} r="2.4" fill="url(#bot-gold)" opacity="0.9" />
      <circle cx={1004} cy={90} r="2" fill="url(#bot-gold)" opacity="0.75" />

      {/* Motivo central: rama + flor */}
      <path
        d="M600 92 C 590 60, 618 30, 600 10"
        stroke="url(#bot-gold)"
        strokeWidth="1.4"
        opacity="0.85"
      />
      <Leaf x={596} y={46} s={0.9} />
      <Leaf x={604} y={40} flip s={0.9} />
      <g transform="translate(600 12)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <ellipse
            key={a}
            cx="0"
            cy="-8"
            rx="2.6"
            ry="6.5"
            transform={`rotate(${a})`}
            fill="url(#bot-gold)"
            opacity="0.92"
          />
        ))}
        <circle r="3.2" fill="#e9c87c" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------
   Hero XV premium (variante Alice): degradado lavanda + textura de papel,
   monograma "AR" en oro pulido, nombre serif + script, fecha larga y
   contador premium. La apertura (sobre) sincroniza las transiciones.
------------------------------------------------------------------ */
export default function AliceXvHero({ event, family, cfg, theme, reveal = true }) {
  const date = new Date(`${event.date}T00:00:00`);

  // Formato largo "27 de Mayo, 2024".
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString("es-MX", { month: "long" });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const year = date.getFullYear();
  const pretty = `${dayNum} de ${monthCap}, ${year}`;

  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 120]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -60]);

  const celebrantName = (cfg.celebrant_name || "").trim() || event.name;
  const monogram = initialsOf(celebrantName);
  const inviteLine = theme?.labels?.heroInvite || "Te Invitamos a Mis XV Años";
  const bgImage = safeCssUrl(cfg.hero_image);

  // Nombre: primera palabra en serif (Cormorant Garamond), el resto en
  // script (Dancing Script) con acabado dorado.
  const nameParts = celebrantName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  const entrance = (i = 0) => ({
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.9, ease: EASE, delay: 0.35 + i * 0.14 },
    },
  });

  return (
    <header
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-inv-bg"
    >
      {/* Fondo: degradado lavanda + textura de papel + arte botánico */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          {bgImage ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${bgImage}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-inv-bg/75 via-inv-bg/45 to-inv-bg/85" />
            </>
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{ background: "var(--inv-hero-fallback)" }}
              />
              <div className="paper-grain absolute inset-0 opacity-40 mix-blend-multiply" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-a),transparent_62%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--inv-radial-b),transparent_68%)]" />
            </>
          )}
        </motion.div>

        {/* Arte botánico dorado en el margen inferior */}
        <motion.div
          className="absolute inset-x-0 bottom-0 text-inv-primary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: reveal ? 1 : 0, y: reveal ? 0 : 20 }}
          transition={{ duration: 1.4, ease: EASE, delay: reveal ? 0.7 : 0 }}
        >
          <BotanicalBorder className="h-28 md:h-40 opacity-70" />
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 text-center px-6 py-20 md:py-28 max-w-3xl w-full"
        style={{ y: contentY }}
      >
        {/* Monograma "AR" en oro pulido */}
        <motion.div
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(0)}
        >
          <span
            className="monogram-gold font-inv-serif inline-block leading-none select-none"
            style={{ fontSize: "clamp(5.5rem, 22vw, 12rem)" }}
            aria-hidden="true"
          >
            {monogram}
          </span>
        </motion.div>

        {/* Nombre: serif + script */}
        <motion.h1
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(1)}
          className="mt-5 md:mt-7 leading-[1.1] text-balance"
        >
          <span className="font-inv-serif text-5xl md:text-7xl text-inv-text">
            {firstName}
          </span>
          {lastName && (
            <>
              {" "}
              <span className="font-inv-script text-6xl md:text-8xl text-gold-gradient">
                {lastName}
              </span>
            </>
          )}
        </motion.h1>

        <motion.div
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(1)}
        >
          <Ornament className="mt-6 md:mt-8" />
        </motion.div>

        {/* Texto de invitación */}
        <motion.p
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(2)}
          className="mt-6 md:mt-8 font-inv-serif italic text-xl md:text-2xl text-inv-text-soft text-balance"
        >
          {inviteLine}
        </motion.p>

        {/* Fecha larga */}
        <motion.div
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(3)}
          className="mt-8 md:mt-10"
        >
          <p className="font-inv-serif text-2xl md:text-4xl text-inv-text">
            {pretty}
          </p>
          {event.time && (
            <p className="mt-3 text-[0.7rem] uppercase tracking-[0.4em] text-inv-text-soft">
              {event.time}
            </p>
          )}
        </motion.div>

        {/* Contador premium */}
        {reveal && <Countdown date={event.date} time={event.time} />}

        <motion.p
          initial="hidden"
          animate={reveal ? "show" : "hidden"}
          variants={entrance(4)}
          className="mt-10 text-[0.65rem] uppercase tracking-[0.4em] text-inv-text-soft"
        >
          Invitación para&nbsp;la{" "}
          <span className="text-inv-text-soft font-semibold capitalize">{family}</span>
        </motion.p>
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
