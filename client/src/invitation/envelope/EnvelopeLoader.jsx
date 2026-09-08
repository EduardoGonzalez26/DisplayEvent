import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "../motion.jsx";
import { Corner } from "../shared/util.jsx";

// Paleta de confeti: dorados + marfil + un azul noche suave. Los dorados
// y el marfil no chocan con ninguna paleta (rosa/lavanda/verde salvia).
const CONFETTI_COLORS = [
  "#d6c49b",
  "#e7c98c",
  "#f7e7bd",
  "#f2e4c2",
  "#d3a95c",
  "#b8873a",
  "#ab9268",
  "#fbfaf5",
  "#8fa8c8",
];

// Ráfaga suave: un estallido central + dos cañones laterales. El paquete
// se importa dinámicamente para no inflar el bundle de la invitación.
async function fireConfetti() {
  const confetti = (await import("canvas-confetti")).default;
  const base = { colors: CONFETTI_COLORS, disableForReducedMotion: true, zIndex: 9999 };
  confetti({
    ...base,
    particleCount: 90,
    spread: 100,
    origin: { x: 0.5, y: 0.62 },
    startVelocity: 34,
    scalar: 1,
    ticks: 200,
    gravity: 0.9,
  });
  confetti({
    ...base,
    angle: 60,
    origin: { x: 0, y: 0.85 },
    particleCount: 55,
    spread: 60,
    startVelocity: 42,
    ticks: 170,
    scalar: 0.9,
    drift: 0.5,
  });
  confetti({
    ...base,
    angle: 120,
    origin: { x: 1, y: 0.85 },
    particleCount: 55,
    spread: 60,
    startVelocity: 42,
    ticks: 170,
    scalar: 0.9,
    drift: -0.5,
  });
}

/* ------------------------------------------------------------------
   Polvo de estrellas dorado en las esquinas del sobre (eco del hero
   "azul noche"). Es invisible en los formatos que no definen
   --inv-envelope-accent (color: transparent).
------------------------------------------------------------------ */
const TWINKLES = [
  { top: "6%", left: "12%", size: 8, delay: 0 },
  { top: "4%", left: "82%", size: 6, delay: 1.3 },
  { top: "13%", left: "66%", size: 5, delay: 0.7 },
  { top: "86%", left: "10%", size: 6, delay: 0.5 },
  { top: "90%", left: "88%", size: 7, delay: 1.8 },
  { top: "76%", left: "70%", size: 5, delay: 1.0 },
];

function StarTwinkle({ top, left, size, delay, reduced }) {
  return (
    <motion.span
      className="pointer-events-none absolute"
      style={{ top, left, width: size, height: size, color: "var(--inv-envelope-accent, transparent)" }}
      aria-hidden="true"
      animate={
        reduced
          ? { opacity: 0.55 }
          : { opacity: [0.2, 0.95, 0.2], scale: [0.85, 1.1, 0.85] }
      }
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 3.4, repeat: Infinity, ease: "easeInOut", delay }
      }
    >
      <svg className="h-full w-full" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10Z" />
      </svg>
    </motion.span>
  );
}

/* ------------------------------------------------------------------
   Sobre digital: solapa, bolsillo, tarjeta y sello en CSS 3D.
   Se abre con tap o deslizando hacia arriba. Respeta
   prefers-reduced-motion (solo fade simple de opacidad).

   El look se controla con variables --inv-envelope-*: cada una lleva
   fallback al look clásico (marfil/salvia/dorado) para que los temas
   que no las definen conserven su apariencia actual.

   Centrado: el overlay (grid place-items-center) centra SOLO el sobre;
   el texto de ayuda es absolute (top-full) y no desplaza el centro.
------------------------------------------------------------------ */
export default function EnvelopeLoader({ monogram = "&", seal = "&", family, onOpen }) {
  const reduced = useReducedMotion();
  const started = useRef(false);
  const [opening, setOpening] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);

  const open = () => {
    if (started.current) return;
    started.current = true;
    setOpening(true);

    if (!reduced) window.setTimeout(fireConfetti, 520);
    window.setTimeout(() => setLeaving(true), reduced ? 80 : 720);
    window.setTimeout(
      () => {
        setDone(true);
        onOpen?.();
      },
      reduced ? 460 : 960,
    );
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  if (done) return null;

  const moving = opening && !reduced;

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden"
      style={{ background: "var(--inv-envelope-backdrop, var(--inv-bg, #f6f4ec))" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: leaving ? 0.55 : 0.3, ease: EASE }}
      role="dialog"
      aria-label="Abrir invitación"
    >
      {/* Resplandores radiales suaves del tema */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-a,rgba(171,146,104,0.3)),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--inv-radial-b,rgba(255,253,248,0.55)),transparent_65%)]" />
      </div>

      {/* Único elemento centrado: SOLO el sobre. La ayuda es absolute
          respecto a este wrapper, por lo que el sobre queda en el centro
          exacto (horizontal y vertical) de la pantalla. */}
      <motion.div
        className="envelope-focus relative cursor-pointer select-none rounded-[20px]"
        style={{ perspective: 1400 }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: leaving ? 1.1 : 1, y: moving ? -80 : 0 }}
        transition={{
          duration: leaving ? 0.6 : 0.55,
          ease: EASE,
          delay: leaving ? 0.1 : moving ? 0.42 : 0,
        }}
        drag={reduced ? false : "y"}
        dragElastic={0.12}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.y < -48) open();
        }}
        onTap={open}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Abrir invitación"
        whileTap={reduced ? undefined : { scale: 0.98 }}
      >
        <div
          className="relative"
          style={{ width: "min(74vw, 300px)", aspectRatio: "8 / 5", transformStyle: "preserve-3d" }}
        >
          {/* Panel trasero del sobre */}
          <div
            className="absolute inset-0 rounded-[20px]"
            style={{
              border: "1px solid var(--inv-envelope-border, var(--inv-accent-border, #e7ebdd))",
              background:
                "var(--inv-envelope-body, linear-gradient(180deg, var(--inv-surface,#fcfbf7) 0%, var(--inv-card,#f6f4ec) 100%))",
              boxShadow:
                "var(--inv-envelope-shadow, 0 32px 60px -24px var(--inv-shadow-soft, rgba(62,70,51,0.35)), 0 2px 6px rgba(62,70,51,0.06))",
            }}
          />

          {/* Tarjeta interior (se desliza hacia arriba al abrir) */}
          <motion.div
            className="absolute inset-x-[8%] bottom-[5%] h-[84%] overflow-hidden rounded-[14px]"
            style={{
              border: "1px solid var(--inv-envelope-card-border, var(--inv-primary-light, #d6c49b))",
              background:
                "var(--inv-envelope-card, linear-gradient(165deg, var(--inv-bg-alt2,#fcfbf7) 0%, var(--inv-bg,#f6f4ec) 100%))",
              boxShadow: "0 14px 30px -12px var(--inv-shadow-mid, rgba(62,70,51,0.2))",
            }}
            animate={moving ? { y: "-80%", rotate: -4 } : {}}
            transition={{ delay: 0.36, duration: 0.7, ease: EASE }}
          >
            <div className="relative grid h-full w-full place-items-center px-3">
              <div className="flex flex-col items-center text-center">
                <span className="pointer-events-none font-inv-script text-4xl md:text-5xl text-gold-gradient leading-none">
                  {monogram}
                </span>
                {family && (
                  <>
                    <span
                      className="mt-3 h-px w-12"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, var(--inv-envelope-card-divider, var(--inv-primary-light, #d6c49b)), transparent)",
                      }}
                    />
                    <span
                      className="mt-2.5 text-[0.52rem] uppercase tracking-[0.38em]"
                      style={{ color: "var(--inv-envelope-card-kicker, var(--inv-text-muted, #8e744a))" }}
                    >
                      Invitación para
                    </span>
                    <span className="mt-1 font-inv-script text-2xl md:text-3xl text-gold-gradient capitalize leading-tight">
                      {family}
                    </span>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Bolsillo frontal del sobre */}
          <div className="absolute inset-0 z-20 overflow-hidden rounded-[20px]" aria-hidden="true">
            <div
              className="absolute bottom-0 left-0 h-[56%] w-1/2"
              style={{
                background:
                  "var(--inv-envelope-pocket-l, linear-gradient(200deg, var(--inv-card,#f6f4ec) 0%, var(--inv-bg-alt,#e7ebdd) 100%))",
                clipPath: "polygon(0 0, 100% 100%, 0 100%)",
              }}
            />
            <div
              className="absolute bottom-0 right-0 h-[56%] w-1/2"
              style={{
                background:
                  "var(--inv-envelope-pocket-r, linear-gradient(160deg, var(--inv-card,#f6f4ec) 0%, var(--inv-bg-alt,#e7ebdd) 100%))",
                clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-[6%]"
              style={{ background: "var(--inv-envelope-pocket-strip, var(--inv-card,#f6f4ec))" }}
            />
          </div>

          {/* Solapa (se levanta sobre el eje superior) */}
          <motion.div
            className="absolute inset-x-0 top-0 z-30 h-[56%] origin-top"
            style={{
              background:
                "var(--inv-envelope-flap, linear-gradient(180deg, var(--inv-bg-alt,#e7ebdd) 0%, var(--inv-card,#f6f4ec) 100%))",
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              backfaceVisibility: "hidden",
              transformStyle: "preserve-3d",
            }}
            animate={moving ? { rotateX: -180 } : {}}
            transition={{ duration: 0.55, ease: [0.6, 0.05, 0.28, 0.99] }}
          >
            {/* Filo interior dorado del triángulo (solo si el tema lo define) */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                points="1.5,1 50,97.5 98.5,1"
                fill="none"
                stroke="var(--inv-envelope-flap-edge, transparent)"
                strokeWidth="1"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </motion.div>

          {/* Polvo de estrellas dorado en las esquinas */}
          <div className="pointer-events-none absolute inset-0 z-[35]" aria-hidden="true">
            {TWINKLES.map((s, i) => (
              <StarTwinkle key={i} {...s} reduced={reduced} />
            ))}
          </div>

          {/* Línea interior hairline del marco */}
          <div
            className="pointer-events-none absolute inset-[7px] z-[37] rounded-[14px]"
            aria-hidden="true"
            style={{ border: "1px solid var(--inv-envelope-border-inner, transparent)" }}
          />

          {/* Filetes dorados en las esquinas (Corner compartido) */}
          <div
            className="pointer-events-none absolute inset-0 z-[38] text-[var(--inv-envelope-corner,transparent)] opacity-80"
            aria-hidden="true"
          >
            <Corner className="top-[3px] left-[3px]" />
            <Corner className="top-[3px] right-[3px] rotate-90" />
            <Corner className="bottom-[3px] left-[3px] -rotate-90" />
            <Corner className="bottom-[3px] right-[3px] rotate-180" />
          </div>

          {/* Sello de cera dorado */}
          <motion.div
            className="absolute left-1/2 top-1/2 z-40"
            style={{ x: "-50%", y: "-50%" }}
            aria-hidden="true"
          >
            {/* Halo pulsante del sello (solo si el tema define --inv-envelope-seal-glow) */}
            <motion.div
              className="absolute inset-[-14px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, var(--inv-envelope-seal-glow, transparent) 0%, transparent 68%)",
              }}
              animate={
                moving
                  ? { opacity: 0 }
                  : reduced
                    ? { opacity: 0.45 }
                    : { opacity: [0.45, 1, 0.45], scale: [1, 1.14, 1] }
              }
              transition={
                moving
                  ? { duration: 0.25 }
                  : reduced
                    ? { duration: 0 }
                    : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
              }
            />
            <motion.div
              className="relative grid h-[52px] w-[52px] place-items-center rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 32% 28%, var(--inv-envelope-seal-a,#f2e4c2) 0%, var(--inv-envelope-seal-b,#d3a95c) 55%, var(--inv-envelope-seal-c,#b8873a) 100%)",
                boxShadow:
                  "var(--inv-envelope-seal-shadow, 0 8px 22px -6px var(--inv-shadow-ring, rgba(171,146,104,0.5)))",
              }}
              animate={moving ? { opacity: 0, scale: 0.4, y: 16 } : {}}
              transition={{ duration: 0.32, ease: EASE }}
            >
              <span
                className="font-inv-script text-2xl leading-none"
                style={{ color: "var(--inv-envelope-ink, var(--inv-on-accent, #381414))" }}
              >
                {seal}
              </span>
            </motion.div>
          </motion.div>
        </div>

        {/* Texto de ayuda: fuera del flujo de centrado (top-full) */}
        <motion.p
          className="pointer-events-none absolute inset-x-0 top-full mt-8 text-center text-[0.65rem] uppercase tracking-[0.45em]"
          style={{
            color: "var(--inv-envelope-hint, var(--inv-text-muted, #8e744a))",
            textShadow: "var(--inv-envelope-hint-halo, none)",
          }}
          animate={{ opacity: moving ? 0 : 1, y: moving ? 8 : 0 }}
          transition={{ duration: 0.3 }}
        >
          Toca o desliza hacia arriba para abrir
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
