import { Reveal } from "../motion.jsx";
import { BotanicalDivider, Flourish } from "./decor.jsx";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ------------------------------------------------------------------
   Cierre botánico (Boda Jorge & Macarena): tarjeta final sobre marfil
   con divisor botánico, "Con todo nuestro cariño", nombres de la pareja
   en script rosa, fecha larga + hora + recinto en verde y la línea
   discreta "DisplayEvent". Acepta `cfg` opcional para firmar con los
   nombres de la pareja (el layout lo pasa; sin él degrada a event.name).
------------------------------------------------------------------ */
export default function Footer({ event, theme, cfg }) {
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
    <footer className="relative overflow-hidden bg-inv-bg-alt px-6 py-10 text-center md:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-c),transparent_65%)]" />

      <div className="relative mx-auto max-w-3xl">
        <Reveal>
          <BotanicalDivider className="mx-auto h-12 w-72 text-[var(--inv-botanical)] opacity-90 md:h-14 md:w-96" />
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
        </Reveal>
      </div>
    </footer>
  );
}
