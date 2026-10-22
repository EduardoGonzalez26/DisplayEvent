import { lazy, Suspense, useEffect, useId, useMemo, useState } from "react";
import { Reveal } from "../motion.jsx";
import { Eyebrow, FlowerRule } from "./flora.jsx";
import { normalizeStay } from "../schema/normalize.js";
import { buildStayUrl, STAY_PLATFORMS } from "../../wedding/stayTravelLinks.js";
import { mapsSearchUrl, safeHttpUrl } from "./helpers.js";

// Leaflet toca `window`/`document` al importarse: se carga en un chunk
// perezoso solo cuando Hospedaje se renderiza en el navegador. Así el build
// (y un eventual SSR del resto de la invitación) no evalúa Leaflet.
const ZoneMap = lazy(() => import("./ZoneMap.jsx"));

/* ------------------------------------------------------------------
   Hospedaje (v2) — sección independiente de Viaje.

   - Lee `cfg.stay`; sin `enabled` no se renderiza.
   - Mapa Leaflet/OSM de la zona (solo lectura) + enlace a Google Maps.
   - Fechas de llegada/salida editables por el invitado: los links de
     cada tarjeta se regeneran al cambiarlas.
   - Tarjetas de plataformas (sin logos oficiales, fotos ni precios).
     `auto: true` construye la búsqueda con zona/fechas; `auto: false`
     usa la URL manual validada como http(s).
----------------------------------------------------------------- */

const FIELD_CLASS =
  "mt-1.5 min-h-[46px] w-full min-w-0 border border-[var(--inv-accent-border)] bg-[var(--inv-bg-alt)] px-3 py-2.5 text-[15px] text-[var(--inv-text)] outline-none transition-colors focus-visible:border-[var(--inv-text)] focus-visible:ring-2 focus-visible:ring-[var(--inv-ring)]";

const LABEL_CLASS =
  "block text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--inv-text-muted)]";

function ArrowIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function PlatformIcon({ platform, className = "" }) {
  if (platform === "airbnb") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        <circle cx="8" cy="8" r="4" />
        <path d="m11 11 9 9M17 17l2-2M19 19l2-2" />
      </svg>
    );
  }
  if (platform === "trivago") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" />
      </svg>
    );
  }
  if (platform === "google_hotels") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        <path d="M12 21s7-6.1 7-11a7 7 0 0 0-14 0c0 4.9 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18" />
      <path d="M6 10V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3M13 10V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3" />
    </svg>
  );
}

function Notice({ children, className = "" }) {
  return (
    <p
      className={`m-0 border border-dashed border-[var(--inv-accent-border-strong)] bg-[var(--inv-bg-alt)] px-4 py-3 text-sm leading-relaxed text-[var(--inv-text-muted)] ${className}`}
    >
      {children}
    </p>
  );
}

export default function Stay({ cfg, theme, variant = "invitation" }) {
  const labels = theme?.labels || {};
  const stay = useMemo(() => normalizeStay(cfg?.stay), [cfg?.stay]);
  const uid = useId();
  const isCover = variant === "cover";

  const [checkin, setCheckin] = useState(stay.checkin);
  const [checkout, setCheckout] = useState(stay.checkout);

  useEffect(() => {
    setCheckin(stay.checkin);
  }, [stay.checkin]);

  useEffect(() => {
    setCheckout(stay.checkout);
  }, [stay.checkout]);

  if (!stay.enabled) return null;

  const zoneLabel = stay.zone.label || "Granada";
  const mapHref = mapsSearchUrl(zoneLabel);
  const cta = labels.stayCta || "Buscar hospedaje";

  const cards = stay.cards.map((card) => {
    const platformKey = String(card.platform || "").toLowerCase();
    const platformMeta = STAY_PLATFORMS[platformKey];
    const platformName =
      platformMeta?.label || labels.stayPlatformFallback || "Hospedaje";
    const href = card.auto
      ? buildStayUrl(platformKey, {
          zone: stay.zone,
          checkin,
          checkout,
          adults: 1,
        })
      : safeHttpUrl(card.url);

    return {
      ...card,
      platformKey,
      platformName,
      href: href || "",
      showTitle:
        String(card.title || "").trim() &&
        String(card.title || "").trim().toLowerCase() !== platformName.toLowerCase(),
    };
  });

  return (
    <div
      className={
        isCover
          ? "flex w-full flex-col gap-[22px] text-left"
          : "mx-auto flex w-full max-w-[760px] flex-col items-center gap-[22px] px-6 pb-[120px] pt-24 text-center"
      }
    >
      {!isCover && (
        <Reveal className="flex flex-col items-center gap-[22px]">
          <Eyebrow>{labels.stayEyebrow || "La estancia"}</Eyebrow>
          <FlowerRule kind="bugambilia" />
          <h2 className="m-0 font-inv-display text-[clamp(36px,8vw,50px)] font-normal leading-[1.08] text-[var(--inv-text)]">
            {labels.stayTitle || "Hospedaje"}
          </h2>
        </Reveal>
      )}

      {stay.intro && (
        <Reveal
          delay={0.05}
          className={isCover ? "w-full" : "w-full max-w-[600px]"}
        >
          <p
            className={
              isCover
                ? "m-0 whitespace-pre-line text-[15px] leading-[1.8] text-[var(--inv-text-soft)]"
                : "m-0 whitespace-pre-line text-center text-[16px] leading-[1.75] text-[var(--inv-text-soft)]"
            }
          >
            {stay.intro}
          </p>
        </Reveal>
      )}

      <Reveal delay={0.08} className={isCover ? "w-full" : "w-full max-w-[620px]"}>
        <div className="w-full text-left">
          <Suspense
            fallback={
              <div
                aria-hidden="true"
                className="h-[260px] w-full border border-[var(--inv-accent-border)] bg-[var(--inv-bg-alt)] sm:h-[300px]"
              />
            }
          >
            <ZoneMap
              center={stay.zone}
              radiusKm={stay.zone.radius_km}
              label={zoneLabel}
              readOnly
              className="w-full"
            />
          </Suspense>
          <div className="-mt-px flex flex-col gap-3 border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className={LABEL_CLASS}>
                {labels.stayZoneLabel || "Zona sugerida"}
              </span>
              <p className="mb-0 mt-1 text-[15px] leading-snug text-[var(--inv-text)]">
                {zoneLabel}
              </p>
            </div>
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] flex-none items-center gap-2 self-start text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--inv-text)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 sm:self-auto"
            >
              {labels.stayMapLink || "Abrir en Google Maps"}
              <ArrowIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </Reveal>

      <Reveal
        delay={0.12}
        className={isCover ? "w-full" : "w-full max-w-[620px] text-left"}
      >
        <div className="grid grid-cols-1 gap-4 border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <label htmlFor={`${uid}-checkin`} className={LABEL_CLASS}>
              {labels.stayDateInLabel || "Llegada"}
            </label>
            <input
              id={`${uid}-checkin`}
              type="date"
              value={checkin}
              max={checkout}
              onChange={(event) => setCheckin(event.target.value || stay.checkin)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-checkout`} className={LABEL_CLASS}>
              {labels.stayDateOutLabel || "Salida"}
            </label>
            <input
              id={`${uid}-checkout`}
              type="date"
              value={checkout}
              min={checkin}
              onChange={(event) => setCheckout(event.target.value || stay.checkout)}
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </Reveal>

      {cards.length > 0 ? (
        <Reveal delay={0.16} className="w-full">
          <div
            role="group"
            aria-label={labels.stayCardsLabel || "Opciones de hospedaje"}
            className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {cards.map((card, index) => (
              <div
                key={`${card.id || card.platformKey || "card"}-${index}`}
                className="flex w-[230px] flex-none snap-start flex-col justify-between gap-4 border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] p-4 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--inv-text-muted)]">
                    <PlatformIcon
                      platform={card.platformKey}
                      className="h-4 w-4 flex-none text-[var(--inv-text)]"
                    />
                    <span className="truncate">{card.platformName}</span>
                  </div>
                  {card.showTitle && (
                    <h3 className="mb-0 mt-2 font-inv-display text-[24px] font-normal leading-none text-[var(--inv-text)]">
                      {card.title}
                    </h3>
                  )}
                  {card.description && (
                    <p className="mb-0 mt-2 text-[13px] leading-[1.55] text-[var(--inv-text-muted)]">
                      {card.description}
                    </p>
                  )}
                </div>

                {card.href ? (
                  <a
                    href={card.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${cta}: ${card.title || card.platformName}`}
                    className="group flex min-h-[38px] items-center justify-between gap-2 border-t border-[var(--inv-accent-border)] pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--inv-text)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
                  >
                    {cta}
                    <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="flex min-h-[38px] cursor-not-allowed items-center justify-between gap-2 border-t border-[var(--inv-accent-border)] pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--inv-text-dim)]"
                  >
                    {cta}
                    <ArrowIcon className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      ) : (
        <Reveal
          delay={0.16}
          className={isCover ? "w-full" : "w-full max-w-[620px] text-left"}
        >
          <Notice>
            {labels.stayEmptyNotice || "Muy pronto compartiremos opciones de hospedaje."}
          </Notice>
        </Reveal>
      )}
    </div>
  );
}
