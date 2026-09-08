import { motion, useReducedMotion } from "motion/react";
import { escapeRegExp } from "../shared/util.jsx";
import { Reveal } from "../motion.jsx";
import { BotanicalCorner, Flourish } from "./decor.jsx";

/* ------------------------------------------------------------------
   Carta editorial (Boda Jorge & Macarena): texto directo sobre marfil
   en verde botánico con orla botánica fina, resaltado limpio de la
   familia (un solo color, sin gradiente) y firma en Great Vibes rosa.
   Sin capitular (look editorial más limpio y estable; `float` +
   `text-balance` + itálica podían romper la alineación). Mismas props
   y fallbacks que shared/Message; siempre se renderiza.
------------------------------------------------------------------ */

/* Resalta el nombre de la familia en un solo color (rosa), sin el
   gradiente `text-gold-gradient` (amarillo→naranja→rosa) que en este
   tema resultaba chillón y descolocado. */
function highlightFamily(message, family) {
  if (!family) return message;
  const re = new RegExp(`(${escapeRegExp(family)})`, "gi");
  return message.split(re).map((part, i) =>
    part && part.toLowerCase() === family.toLowerCase() ? (
      <span key={i} className="font-semibold text-[var(--inv-accent-pink)]">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export default function Message({ cfg, family, theme }) {
  const message =
    cfg.message ||
    theme?.labels?.defaultMessage?.(family) ||
    `Familia ${family}, la alegría de contar con ustedes es inmensa. Nos encantaría compartir este día tan especial.`;

  const signature = theme?.resolvers?.signature?.(cfg) || cfg.celebrants || null;
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-inv-bg px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-c),transparent_60%)]" />

      <div className="relative mx-auto max-w-prose">
        <Reveal className="text-center">
          <div className="mb-8 flex items-center justify-center gap-4">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-[var(--inv-accent-yellow)]" />
            <span className="text-[0.62rem] uppercase tracking-[0.5em] text-[var(--inv-accent-pink)]">
              {theme?.labels?.message ?? "Una carta para ustedes"}
            </span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-[var(--inv-accent-yellow)]" />
          </div>

          {/* Orla botánica fina en las esquinas */}
          <div
            className="pointer-events-none absolute -left-3 -top-3 h-24 w-24 text-[var(--inv-botanical)]/40 md:h-28 md:w-28"
            aria-hidden="true"
          >
            <BotanicalCorner className="left-0 top-0 h-full w-full" />
          </div>
          <div
            className="pointer-events-none absolute -bottom-3 -right-3 h-24 w-24 rotate-180 text-[var(--inv-botanical)]/40 md:h-28 md:w-28"
            aria-hidden="true"
          >
            <BotanicalCorner className="left-0 top-0 h-full w-full" />
          </div>

          <Flourish className="mx-auto h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
          <p className="mt-8 font-inv-serif text-xl italic leading-[1.7] text-balance text-[var(--inv-text)] sm:text-2xl">
            {highlightFamily(message, family)}
          </p>
          <Flourish className="mx-auto mt-10 h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
        </Reveal>

        {signature && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
            whileInView={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
            className="mt-10 text-center"
          >
            <p className="mb-3 text-[0.62rem] uppercase tracking-[0.5em] text-inv-text-soft">
              {theme?.labels?.withLove ?? "Con cariño"}
            </p>
            <p className="font-inv-script text-5xl leading-[1.3] text-[var(--inv-accent-pink)] md:text-7xl">
              {signature}
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
