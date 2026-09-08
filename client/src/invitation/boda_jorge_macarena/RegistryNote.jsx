import { Reveal } from "../motion.jsx";
import { BotanicalCorner, Flourish } from "./decor.jsx";

/* ------------------------------------------------------------------
   "Nota manuscrita" (Boda Jorge & Macarena): tarjeta blanca #FFFFFF con
   esquinas botánicas y sombra suave verde, sobre fondo marfil. Texto
   serif itálico grande en verde. Misma paridad de null que
   shared/RegistryNote (sin título propio: el título de "Mesa de
   Regalos" lo aporta la sección Gifts que le sigue).
------------------------------------------------------------------ */
export default function RegistryNote({ cfg, theme }) {
  const text = (cfg.registry_note || "").trim();
  if (!text) return null;

  return (
    <section className="relative overflow-hidden bg-inv-bg px-4 py-8 md:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-b),transparent_58%)]" />

      <div className="relative mx-auto max-w-2xl">
        <Reveal>
          <div className="relative rounded-[1.8rem] bg-[var(--inv-card)] px-7 py-12 shadow-[0_30px_70px_var(--inv-shadow-soft)] sm:px-12 md:px-16 md:py-14">
            {/* Esquinas botánicas */}
            <div
              className="pointer-events-none absolute left-3 top-3 h-20 w-20 text-[var(--inv-botanical)]/45 md:h-24 md:w-24"
              aria-hidden="true"
            >
              <BotanicalCorner className="left-0 top-0 h-full w-full" />
            </div>
            <div
              className="pointer-events-none absolute bottom-3 right-3 h-20 w-20 rotate-180 text-[var(--inv-botanical)]/45 md:h-24 md:w-24"
              aria-hidden="true"
            >
              <BotanicalCorner className="left-0 top-0 h-full w-full" />
            </div>

            <Flourish className="mx-auto h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
            <p className="mt-8 text-center font-inv-serif text-xl italic leading-[1.8] text-balance text-[var(--inv-text)] sm:text-2xl md:text-[1.7rem]">
              {text}
            </p>
            <Flourish className="mx-auto mt-8 h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
