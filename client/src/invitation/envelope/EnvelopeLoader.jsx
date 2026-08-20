import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "../motion.jsx";

// Paleta de confeti elegante: pasteles + dorados.
const CONFETTI_COLORS = [
  "#d6c49b",
  "#ab9268",
  "#b8873a",
  "#f2e4c2",
  "#e8c9b0",
  "#cfd8bd",
  "#f4d9c6",
  "#e7e0cf",
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
   Sobre digital: solapa, bolsillo, tarjeta y sello en CSS 3D.
   Se abre con tap o deslizando hacia arriba. Respeta
   prefers-reduced-motion (solo fade simple de opacidad).
------------------------------------------------------------------ */
export default function EnvelopeLoader({ monogram = "&", seal = "&", onOpen }) {
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

  if (done) return null;

  const moving = opening && !reduced;

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden"
      style={{ background: "var(--inv-bg, #f6f4ec)" }}
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

      <motion.div
        className="relative cursor-pointer"
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
              border: "1px solid var(--inv-accent-border, #e7ebdd)",
              background:
                "linear-gradient(180deg, var(--inv-surface,#fcfbf7) 0%, var(--inv-card,#f6f4ec) 100%)",
              boxShadow:
                "0 32px 60px -24px var(--inv-shadow-soft, rgba(62,70,51,0.35)), 0 2px 6px rgba(62,70,51,0.06)",
            }}
          />

          {/* Tarjeta interior (se desliza hacia arriba) */}
          <motion.div
            className="absolute inset-x-[8%] bottom-[5%] h-[84%] overflow-hidden rounded-[14px]"
            style={{
              border: "1px solid var(--inv-primary-light, #d6c49b)",
              background:
                "linear-gradient(165deg, var(--inv-bg-alt2,#fcfbf7) 0%, var(--inv-bg,#f6f4ec) 100%)",
              boxShadow: "0 14px 30px -12px var(--inv-shadow-mid, rgba(62,70,51,0.2))",
            }}
            animate={moving ? { y: "-80%", rotate: -4 } : {}}
            transition={{ delay: 0.36, duration: 0.7, ease: EASE }}
          >
            <div className="relative grid h-full w-full place-items-center">
              <span className="pointer-events-none font-inv-script text-5xl text-gold-gradient">
                {monogram}
              </span>
            </div>
          </motion.div>

          {/* Bolsillo frontal del sobre */}
          <div className="absolute inset-0 z-20" aria-hidden="true">
            <div
              className="absolute bottom-0 left-0 h-[56%] w-1/2"
              style={{
                background:
                  "linear-gradient(200deg, var(--inv-card,#f6f4ec) 0%, var(--inv-bg-alt,#e7ebdd) 100%)",
                clipPath: "polygon(0 0, 100% 100%, 0 100%)",
              }}
            />
            <div
              className="absolute bottom-0 right-0 h-[56%] w-1/2"
              style={{
                background:
                  "linear-gradient(160deg, var(--inv-card,#f6f4ec) 0%, var(--inv-bg-alt,#e7ebdd) 100%)",
                clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-[6%]"
              style={{ background: "var(--inv-card,#f6f4ec)" }}
            />
          </div>

          {/* Solapa (se levanta sobre el eje superior) */}
          <motion.div
            className="absolute inset-x-0 top-0 z-30 h-[56%] origin-top"
            style={{
              background:
                "linear-gradient(180deg, var(--inv-bg-alt,#e7ebdd) 0%, var(--inv-card,#f6f4ec) 100%)",
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              backfaceVisibility: "hidden",
              transformStyle: "preserve-3d",
            }}
            animate={moving ? { rotateX: -180 } : {}}
            transition={{ duration: 0.55, ease: [0.6, 0.05, 0.28, 0.99] }}
          />

          {/* Sello de cera */}
          <motion.div
            className="absolute left-1/2 top-1/2 z-40"
            style={{ x: "-50%", y: "-50%" }}
            aria-hidden="true"
          >
            <motion.div
              className="grid h-[52px] w-[52px] place-items-center rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 32% 28%, #f2e4c2 0%, #d3a95c 55%, #b8873a 100%)",
                boxShadow: "0 8px 22px -6px var(--inv-shadow-ring, rgba(171,146,104,0.5))",
              }}
              animate={moving ? { opacity: 0, scale: 0.45, y: 18 } : {}}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <span className="font-inv-script text-2xl text-inv-on-accent">{seal}</span>
            </motion.div>
          </motion.div>
        </div>

        <motion.p
          className="mt-9 text-center text-[0.65rem] uppercase tracking-[0.45em] text-inv-text-muted"
          animate={{ opacity: moving ? 0 : 1, y: moving ? 8 : 0 }}
          transition={{ duration: 0.3 }}
        >
          Toca o desliza hacia arriba para abrir
        </motion.p>
      </motion.div>
    </motion.div>
  );
}