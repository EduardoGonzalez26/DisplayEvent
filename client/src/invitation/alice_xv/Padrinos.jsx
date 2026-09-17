import { motion, useReducedMotion } from "motion/react";
import { EASE, Reveal } from "../motion.jsx";
import { WeddingSectionTitle } from "./decor.jsx";

/* ------------------------------------------------------------------
   Padres y Padrinos (XV de Alice) — versión LOCAL de shared/Padrinos
   ampliada a DOS grupos en la misma tarjeta: primero los padres y
   después los padrinos, cada uno con su sub-encabezado y sus tarjetas
   con nombre en script rosa (acabado botánico: borde dorado, filete
   interior y diamante).

   - `nameList(value)`: normalización tolerante de listas de nombres
     (strings u objetos `{ name }`, trim, sin vacíos). Se exporta para
     que AliceXvLayout replique la MISMA condición de visibilidad sin
     duplicar el saneo (el layout ya importa el componente).
   - Render condicional por grupo: un grupo vacío no deja encabezado
     huérfano. `return null` SOLO si ambas listas están vacías (el
     layout omite entonces la tarjeta y su punto de navegación).
------------------------------------------------------------------- */

/* Normaliza una lista de nombres: acepta strings u objetos `{ name }`,
   recorta y descarta vacíos. Exportado para reutilizarlo en el layout. */
export function nameList(value) {
  return (Array.isArray(value) ? value : [])
    .map((p) => (p && typeof p === "object" ? p.name : p) || "")
    .map((p) => (p || "").trim())
    .filter(Boolean);
}

/* Sub-encabezado de grupo: mismo lenguaje visual del eyebrow de
   `WeddingSectionTitle` (mayúsculas, tracking amplio, rosa y filetes
   dorados laterales) pero un punto más pequeño para no competir con la
   cabecera de sección. Sin divisor botánico completo. */
function GroupHeading({ children }) {
  return (
    <Reveal className="mb-5 text-center md:mb-6">
      <h3 className="flex items-center justify-center gap-3 md:gap-4">
        <span
          className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--inv-accent-yellow)]/80 md:w-10"
          aria-hidden="true"
        />
        <span className="text-[0.56rem] uppercase tracking-[0.42em] text-[var(--inv-accent-pink)] md:text-[0.7rem]">
          {children}
        </span>
        <span
          className="h-px w-8 bg-gradient-to-l from-transparent to-[var(--inv-accent-yellow)]/80 md:w-10"
          aria-hidden="true"
        />
      </h3>
    </Reveal>
  );
}

/* Tarjeta de nombre: MISMO acabado que la versión de un solo grupo
   (borde dorado, filete interior, diamante SVG, script rosa y hover con
   elevación). Se reutiliza en ambos grupos. */
function NameCard({ name, reduced }) {
  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        show: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { duration: 0.6, ease: EASE },
        },
      }}
      whileHover={
        reduced
          ? undefined
          : { y: -6, transition: { type: "spring", stiffness: 300, damping: 18 } }
      }
      className="group relative rounded-[1.6rem] border border-[var(--inv-primary)]/35 bg-[var(--inv-surface)] px-7 py-6 text-center shadow-[0_16px_40px_var(--inv-shadow-card)] transition-shadow duration-300 hover:shadow-[0_24px_60px_var(--inv-shadow-mid)] md:px-9 md:py-7"
    >
      {/* Filete interior fino dorado */}
      <div
        className="pointer-events-none absolute inset-[6px] rounded-[1.1rem] border border-[var(--inv-accent-yellow)]/45"
        aria-hidden="true"
      />
      <span
        className="absolute left-1/2 top-0 h-px w-14 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--inv-primary)]/70 to-transparent"
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 12 12"
        fill="currentColor"
        className="mx-auto mb-3 h-3 w-3 text-[var(--inv-primary)]/80"
        aria-hidden="true"
      >
        <path d="M6 0 8 6 6 12 4 6 6 0Z" />
      </svg>
      <span className="block font-inv-script text-3xl leading-[1.5] text-[var(--inv-accent-pink)] md:text-4xl">
        {name}
      </span>
    </motion.article>
  );
}

/* Grupo de nombres: sub-encabezado + fila de tarjetas con stagger
   propio (cada grupo entra en cascada cuando aparece en viewport). */
function NameGroup({ title, names, reduced, className = "" }) {
  if (names.length === 0) return null;
  return (
    <div className={className}>
      <GroupHeading>{title}</GroupHeading>
      <Reveal>
        <motion.div
          className="flex flex-wrap justify-center gap-4 md:gap-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        >
          {names.map((name, i) => (
            <NameCard key={`${name}-${i}`} name={name} reduced={reduced} />
          ))}
        </motion.div>
      </Reveal>
    </div>
  );
}

export default function Padrinos({ cfg, theme }) {
  const parents = nameList(cfg.parents);
  const padrinos = nameList(cfg.padrinos);
  const reduced = useReducedMotion();
  if (parents.length === 0 && padrinos.length === 0) return null;

  const groupBase = "mt-8 md:mt-10";

  return (
    <section className="relative overflow-hidden bg-inv-bg px-4 py-8 md:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-c),transparent_60%)]" />

      <div className="relative mx-auto max-w-4xl">
        <WeddingSectionTitle
          eyebrow={theme?.labels?.padrinosEyebrow || "Con amor"}
          title={theme?.labels?.padrinosTitle || "Mis Padres y Padrinos"}
          subtitle={
            theme?.labels?.padrinosSubtitle ||
            "Quienes me acompañan en este camino, con todo su cariño y apoyo."
          }
        />

        {/* Grupo 1 — padres */}
        {parents.length > 0 && (
          <NameGroup
            className={groupBase}
            title={theme?.labels?.parentsGroupTitle || "Mis Padres"}
            names={parents}
            reduced={reduced}
          />
        )}

        {/* Grupo 2 — padrinos (separación clara respecto al grupo anterior) */}
        {padrinos.length > 0 && (
          <NameGroup
            className={parents.length > 0 ? "mt-10 md:mt-14" : groupBase}
            title={theme?.labels?.padrinosGroupTitle || "Mis Padrinos"}
            names={padrinos}
            reduced={reduced}
          />
        )}
      </div>
    </section>
  );
}
