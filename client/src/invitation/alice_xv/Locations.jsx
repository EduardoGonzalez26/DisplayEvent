import { motion, useReducedMotion } from "motion/react";
import { EASE, Reveal } from "../motion.jsx";
import { WeddingSectionTitle } from "./decor.jsx";

/* Numeración romana para las tarjetas. */
const ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/* Iconos inline (sin assets externos). */
function MapIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

function NavIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <path d="M5 11h14v7a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1a1.5 1.5 0 0 0-3 0v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" />
    </svg>
  );
}

/* ------------------------------------------------------------------
   Ubicaciones minimalistas (XV de Alice): tarjetas sin fondo pesado con
   borde dorado, numeración romana en script rosa, nombre serif y
   botones primarios dorados (texto blanco) + secundarios con borde
   dorado. Reutiliza la lógica de URLs seguras de shared/Locations
   (mismo filtro y paridad de null).
------------------------------------------------------------------ */
export default function Locations({ cfg, theme }) {
  // Sin `locations` no se muestra nada: el itinerario no es una ubicación.
  const raw = cfg.locations || [];
  const items = raw
    .filter((it) => it && (it.place || it.label))
    .map((it) => ({
      label: it.label,
      place: it.place,
      url: it.url || "",
      lat: it.lat,
      lng: it.lng,
    }));
  const reduced = useReducedMotion();
  if (items.length === 0) return null;

  const safeUrl = (url) => {
    if (!url) return null;
    try {
      const u = new URL(String(url));
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch {
      /* noop: solo se aceptan URLs absolutas http(s) */
    }
    return null;
  };

  const googleMapsUrl = (it) => {
    const custom = safeUrl(it.url);
    if (custom) return custom;
    if (it.lat && it.lng)
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${it.lat},${it.lng}`)}`;
    if (it.place)
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.place)}`;
    return null;
  };
  const wazeUrl = (it) => {
    // Si hay una URL custom válida, el botón "Google Maps" ya enlaza a ella;
    // no forzamos un enlace de Waze por nombre que la ignore.
    if (safeUrl(it.url)) return null;
    if (it.lat && it.lng)
      return `https://waze.com/ul?ll=${encodeURIComponent(`${it.lat},${it.lng}`)}&navigate=yes`;
    if (it.place)
      return `https://waze.com/ul?q=${encodeURIComponent(it.place)}&navigate=yes`;
    return null;
  };
  const googleUrl = (it) => googleMapsUrl(it);

  /* Mapa embebido sin API key: usa `place` y cae a `label`. Devuelve null
     si la ubicación no tiene ninguno de los dos (no se renderiza mapa). */
  const mapSrc = (it) => {
    const query = it.place || it.label;
    if (!query) return null;
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  };
  const mapTitle = (it) => `Mapa de ${it.label || it.place}`;

  /* Layout adaptativo según el número de ubicaciones:
     - 1 → tarjeta centrada a ancho completo (max-w-3xl).
     - 2 → dos columnas en pantallas medianas+.
     - 3+ → grid responsive de 1/2/3 columnas (mobile-first). */
  const gridClass =
    items.length === 1
      ? "mx-auto w-full max-w-3xl"
      : items.length === 2
        ? "grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8"
        : "grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3";

  return (
    <section className="relative overflow-hidden bg-inv-bg-alt2 px-4 py-8 md:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-c),transparent_60%)]" />

      <div className="relative mx-auto max-w-5xl">
        <WeddingSectionTitle
          eyebrow={theme?.labels?.locationsEyebrow ?? "Ubicaciones"}
          title={theme?.labels?.locations ?? "Cómo Llegar"}
          subtitle={
            theme?.labels?.locationsSubtitle ??
            "Encuentra cada recinto de la celebración y navega directo con tu app favorita."
          }
        />
        <Reveal>
          <motion.div
            className={gridClass}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14 } } }}
          >
            {items.map((it, i) => (
              <motion.article
                key={`${it.place || it.label || i}-${i}`}
                variants={{
                  hidden: { opacity: 0, y: 32 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
                }}
                whileHover={
                  reduced
                    ? undefined
                    : { y: -8, transition: { type: "spring", stiffness: 300, damping: 20 } }
                }
                className="group relative flex h-full flex-col rounded-[1.4rem] border border-[var(--inv-primary)]/35 bg-[var(--inv-surface)] p-7 shadow-[0_18px_50px_var(--inv-shadow-card)] transition-shadow duration-300 hover:shadow-[0_26px_70px_var(--inv-shadow-mid)] md:p-8"
              >
                {/* Filete interior fino amarillo */}
                <div
                  className="pointer-events-none absolute inset-[6px] rounded-[1.05rem] border border-[var(--inv-accent-yellow)]/45"
                  aria-hidden="true"
                />
                <span
                  className="font-inv-script text-5xl leading-none text-[var(--inv-accent-pink)]"
                  aria-hidden="true"
                >
                  {ROMANS[i] ?? i + 1}
                </span>
                <h3 className="mt-4 font-inv-heading text-2xl text-[var(--inv-text)]">
                  {it.label || `Ubicación ${i + 1}`}
                </h3>
                <p className="mt-1.5 font-light text-inv-text-soft">{it.place}</p>

                {mapSrc(it) && (
                  <div className="relative mt-5 overflow-hidden rounded-2xl border border-[var(--inv-botanical)]/35 shadow-[0_14px_36px_var(--inv-shadow-card)]">
                    <iframe
                      src={mapSrc(it)}
                      title={mapTitle(it)}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      className="block aspect-[4/3] w-full border-0 sm:aspect-[16/10]"
                    />
                    {/* Filete botánico sobre el mapa (no intercepta clics). */}
                    <span
                      className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-[var(--inv-accent-yellow)]/45"
                      aria-hidden="true"
                    />
                  </div>
                )}

                <div className="mt-auto flex flex-wrap gap-2.5 pt-7">
                  {googleUrl(it) && (
                    <>
                      <a
                        href={googleUrl(it)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--inv-primary)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--inv-on-accent)] shadow-md transition-all hover:bg-[var(--inv-accent)] hover:shadow-[0_10px_24px_var(--inv-shadow-ring)] active:scale-[.98]"
                      >
                        <MapIcon className="h-4 w-4" />
                        Google Maps
                      </a>
                      {wazeUrl(it) && (
                        <a
                          href={wazeUrl(it)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--inv-primary)]/70 px-3 py-2.5 text-center text-sm font-semibold text-[var(--inv-text-soft)] transition-all hover:border-[var(--inv-primary)] hover:bg-[var(--inv-accent-yellow)]/15 active:scale-[.98]"
                        >
                          <NavIcon className="h-4 w-4" />
                          Waze
                        </a>
                      )}
                    </>
                  )}
                </div>
              </motion.article>
            ))}
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
