import { motion, useReducedMotion } from "motion/react";
import { EASE } from "../motion.jsx";
import { WeddingSectionTitle } from "./decor.jsx";

/* ------------------------------------------------------------------
   Itinerario minimalista (Boda Jorge & Macarena): timeline vertical con
   línea fina amarilla (izquierda en móvil, centro en desktop), nodos de
   anillo verde fino con número, tarjetas SIN fondo con borde izquierdo
   naranja (móvil) o inferior naranja (desktop), hora en rosa/naranja y
   título serif verde. En desktop los momentos alternan lados; stagger
   reveal. Null si no hay items (misma paridad que shared/Itinerary).
------------------------------------------------------------------ */
export default function Itinerary({ cfg, theme }) {
  const items = (cfg.itinerary || []).map((it) => ({
    label: it.label,
    time: it.time,
  }));
  const reduced = useReducedMotion();
  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-inv-bg px-4 py-8 md:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-c),transparent_58%)]" />

      <div className="relative mx-auto max-w-3xl">
        <WeddingSectionTitle
          eyebrow={theme?.labels?.itineraryEyebrow ?? "Horarios"}
          title={theme?.labels?.itinerary ?? "Itinerario de la Celebración"}
          subtitle={
            theme?.labels?.itinerarySubtitle ??
            "Los momentos que viviremos juntos durante la celebración."
          }
        />

        <div className="relative mt-14 md:mt-16">
          {/* Línea fina amarilla animada */}
          <motion.div
            className="pointer-events-none absolute bottom-4 left-[21px] top-2 w-px md:left-1/2 md:-translate-x-1/2"
            style={{ background: "var(--inv-accent-yellow)" }}
            initial={reduced ? { opacity: 0.5 } : { opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 0.5, scaleY: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.6, ease: EASE }}
          />

          <motion.div
            className="space-y-12 md:space-y-20"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.16 } } }}
          >
            {items.map((it, i) => {
              const left = i % 2 === 0;
              return (
                <motion.div
                  key={`${it.label || it.time || i}-${i}`}
                  variants={{
                    hidden: { opacity: 0, x: reduced ? 0 : left ? -28 : 28 },
                    show: {
                      opacity: 1,
                      x: 0,
                      transition: { duration: 0.75, ease: EASE },
                    },
                  }}
                  className="relative md:flex md:items-center"
                >
                  {/* Nodo: anillo verde fino con número */}
                  <div className="absolute left-[21px] top-2 z-10 -translate-x-1/2 md:left-1/2">
                    <div className="grid h-10 w-10 place-items-center rounded-full border border-[var(--inv-botanical)]/70 bg-[var(--inv-bg)] font-inv-heading text-sm tabular-nums text-[var(--inv-text)] md:h-12 md:w-12 md:text-base">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  </div>

                  {/* Contenido: alterna lados en desktop, centrado en móvil.
                      Borde izquierdo naranja en móvil, inferior en desktop. */}
                  <div
                    className={`border-l-2 border-[var(--inv-primary)] pl-14 md:w-1/2 md:border-l-0 md:border-b-2 md:border-b-[var(--inv-primary)] md:pb-6 md:pl-0 ${
                      left ? "md:pr-16 md:text-right" : "md:ml-auto md:pl-16"
                    }`}
                  >
                    {it.time && (
                      <span className="inline-block text-[0.7rem] uppercase tracking-[0.3em] tabular-nums text-[var(--inv-accent-pink)] md:text-xs">
                        {it.time}
                      </span>
                    )}
                    <h3 className="mt-2 font-inv-heading text-2xl text-[var(--inv-text)] md:text-3xl">
                      {it.label || `Momento ${i + 1}`}
                    </h3>
                    <div
                      className={`mt-3 h-px w-10 bg-gradient-to-r from-transparent to-[var(--inv-primary)]/70 ${
                        left
                          ? "md:ml-auto md:bg-gradient-to-l md:from-[var(--inv-primary)]/70 md:to-transparent"
                          : ""
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
