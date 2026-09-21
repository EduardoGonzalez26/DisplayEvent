import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Reveal } from "../motion.jsx";
import { BotanicalDivider, Flourish } from "./decor.jsx";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ------------------------------------------------------------------
   Cierre botánico (Boda Jorge & Macarena): tarjeta final sobre verde
   noche con divisor botánico, "Con todo nuestro cariño", nombres de la
   pareja en script rosa, fecha larga + hora + recinto en marfil y la
   línea discreta "DisplayEvent". Acepta `cfg` opcional para firmar con
   los nombres de la pareja (el layout lo pasa; sin él degrada a
   event.name).

   Badge publicitario "Powered by Webi" (SOLO esta plantilla): último
   elemento del cierre, enlace sin subrayado a https://webi.mx en
   pestaña nueva. Usa `client/public/webi/logo-light.svg` (wordmark claro)
   porque el fondo efectivo del cierre ahora es oscuro: la tarjeta tiene
   `bg-inv-bg-alt` (verde noche) y, si lleva foto, va en B&N con scrim
   oscuro. La URL se construye con `import.meta.env.BASE_URL` (convención
   de assets en `public/`). El texto "Powered by" es contenido de marca
   fijo: NO vive en `theme.labels` ni en el schema.
------------------------------------------------------------------ */
export default function Footer({ event, theme, cfg }) {
  const reduced = useReducedMotion();
  // Drift sutil del divisor botánico. La tarjeta final es sticky, así que
  // no usamos `useScroll({ target })` (offsetTop no refleja el pinning) y
  // derivamos del scroll global con un desplazamiento pequeño.
  const { scrollYProgress } = useScroll();
  const dividerY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -14]);

  const couple = cfg?.couple || {};
  const names = [String(couple.nameA || "").trim(), String(couple.nameB || "").trim()]
    .filter(Boolean)
    .join(" & ");

  const date = new Date(`${event.date}T00:00:00`);
  const day = date.getDate();
  const month = cap(date.toLocaleDateString("es-MX", { month: "long" }));
  const year = date.getFullYear();
  const weekday = cap(date.toLocaleDateString("es-MX", { weekday: "long" }));

  const details = [weekday, `${day} de ${month}`, `${year}`, event.time, event.place]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer className="relative overflow-hidden px-6 py-10 text-center md:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-c),transparent_65%)]" />

      <div className="relative mx-auto max-w-3xl">
        <Reveal>
          <motion.div
            className="pointer-events-none"
            aria-hidden="true"
            style={{ y: dividerY }}
          >
            <BotanicalDivider className="mx-auto h-12 w-72 text-[var(--inv-botanical)] opacity-90 md:h-14 md:w-96" />
          </motion.div>
          <p className="mt-8 text-[0.65rem] uppercase tracking-[0.5em] text-[var(--inv-accent-pink)] md:text-xs">
            {theme?.labels?.withLove ?? "Con todo nuestro cariño"}
          </p>
          <p className="mt-4 font-inv-script text-5xl leading-[1.3] text-balance text-[var(--inv-accent-pink)] md:text-7xl">
            {names || event.name}
          </p>
          <Flourish className="mx-auto mt-8 h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
          <div
            className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-[var(--inv-accent-yellow)] to-transparent"
            aria-hidden="true"
          />
          <p className="mx-auto mt-8 max-w-xl font-inv-serif text-lg text-[var(--inv-text-soft)] md:text-xl">
            {details}
          </p>
          <p className="mt-4 text-[0.6rem] uppercase tracking-[0.45em] text-[var(--inv-text-muted)]">
            DisplayEvent
          </p>
          {/* Badge publicitario (solo esta plantilla): nombre accesible
              "Powered by Webi" (texto visible + alt). Sin aria-label. */}
          <a
            href="https://webi.mx"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2.5 opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-accent-yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--inv-bg-alt)]"
          >
            <span className="text-[0.55rem] uppercase tracking-[0.35em] text-[var(--inv-text-muted)]">
              Powered by
            </span>
            <img
              src={`${import.meta.env.BASE_URL}webi/logo-light.svg`}
              alt="Webi"
              width={58}
              height={24}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-6 w-auto"
            />
          </a>
        </Reveal>
      </div>
    </footer>
  );
}
