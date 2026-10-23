import { useEffect, useId, useMemo, useState } from "react";
import { Reveal } from "../motion.jsx";
import { Eyebrow, FlowerRule } from "./flora.jsx";
import { normalizeTrip } from "../schema/normalize.js";
import { buildModeLinks, citySlugFor } from "../../wedding/stayTravelLinks.js";

/* ------------------------------------------------------------------
   Viaje (v2) — independiente de Hospedaje.

   - Lee `cfg.trip` (normalizado en cliente; si falta, no se renderiza).
   - Llegada a España: fila estática si solo hay una ciudad (Madrid) o
     selector si el dato legado trae varias; cambia el destino del vuelo y
     el origen del tren/autobús.
   - Selector de salida (IATA) con opción "Otro" + input manual. Solo
     aplica a vuelos.
   - Fechas editables por el invitado; cada cambio regenera los links.
   - Un bloque por modo habilitado (avión / tren / autobús) con carrusel
     horizontal de proveedores. Sin fotos, precios ni logos oficiales.
----------------------------------------------------------------- */

const OTHER_ORIGIN = "__other";
const MODE_ORDER = ["flight", "train", "bus"];

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

function ModeIcon({ mode, className = "" }) {
  if (mode === "flight") {
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
        <path d="m2.5 11.5 19-7-7 19-3.2-7.3-8.8-4.7Z" />
        <path d="M11.3 16.2 21.5 4.5" />
      </svg>
    );
  }
  if (mode === "train") {
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
        <rect x="5" y="3.5" width="14" height="13" rx="3" />
        <path d="M5 10h14M8.5 20l1.5-3.5M15.5 20 14 16.5M9 6.5h6" />
        <circle cx="9.2" cy="13.2" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="14.8" cy="13.2" r="0.8" fill="currentColor" stroke="none" />
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
      <rect x="4" y="3.5" width="16" height="15" rx="3" />
      <path d="M4 10h16M8.5 18.5V21M15.5 18.5V21M8.5 6.5h7" />
      <circle cx="8.5" cy="14" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="14" r="0.8" fill="currentColor" stroke="none" />
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

function ModeBlock({ mode, title, note, links, emptyNotice, cta }) {
  return (
    <Reveal className="w-full">
      <div className="border-t border-[var(--inv-accent-border)] pt-6 text-left">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-[var(--inv-accent-border)] text-[var(--inv-text)]">
            <ModeIcon mode={mode} className="h-[18px] w-[18px]" />
          </span>
          <h3 className="m-0 font-inv-display text-[30px] font-normal leading-none text-[var(--inv-text)]">
            {title}
          </h3>
        </div>

        {note && (
          <p className="mb-0 mt-3 max-w-[600px] whitespace-pre-line text-[15px] leading-[1.65] text-[var(--inv-text-soft)]">
            {note}
          </p>
        )}

        {links.length > 0 ? (
          <div className="-mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {links.map((link) => (
              <a
                key={`${mode}-${link.id}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${cta}: ${link.label}`}
                className="group flex w-[210px] flex-none snap-start flex-col justify-between gap-4 border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] p-4 text-left transition-colors hover:border-[var(--inv-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 sm:w-[230px]"
              >
                <div className="min-w-0">
                  <div className="font-inv-display text-[24px] font-normal leading-none text-[var(--inv-text)]">
                    {link.label}
                  </div>
                  {link.note && (
                    <p className="mb-0 mt-2 text-[11px] leading-snug text-[var(--inv-text-muted)]">
                      {link.note}
                    </p>
                  )}
                </div>
                <span className="flex min-h-[32px] items-center justify-between gap-2 border-t border-[var(--inv-accent-border)] pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--inv-text)]">
                  {cta}
                  <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            ))}
          </div>
        ) : (
          <Notice className="mt-4">{emptyNotice}</Notice>
        )}
      </div>
    </Reveal>
  );
}

export default function Travel({ cfg, theme, variant = "invitation" }) {
  const labels = theme?.labels || {};
  const trip = useMemo(() => normalizeTrip(cfg?.trip), [cfg?.trip]);
  const uid = useId();
  const isCover = variant === "cover";

  const arrivals = trip.arrivals;
  const origins = trip.origins;
  const modes = trip.modes;

  const [arrivalCode, setArrivalCode] = useState(() => arrivals[0]?.code || "");
  const [originChoice, setOriginChoice] = useState(() => origins[0]?.code || OTHER_ORIGIN);
  const [customOrigin, setCustomOrigin] = useState("");
  const [dateFrom, setDateFrom] = useState(trip.date_from);
  const [dateTo, setDateTo] = useState(trip.date_to);

  useEffect(() => {
    setArrivalCode((prev) =>
      arrivals.some((a) => a.code === prev) ? prev : arrivals[0]?.code || ""
    );
  }, [arrivals]);

  useEffect(() => {
    setOriginChoice((prev) =>
      prev === OTHER_ORIGIN || origins.some((o) => o.code === prev)
        ? prev
        : origins[0]?.code || OTHER_ORIGIN
    );
  }, [origins]);

  useEffect(() => {
    setDateFrom(trip.date_from);
  }, [trip.date_from]);

  useEffect(() => {
    setDateTo(trip.date_to);
  }, [trip.date_to]);

  const hasContent = Boolean(
    trip.intro ||
      arrivals.length > 0 ||
      origins.length > 0 ||
      MODE_ORDER.some(
        (key) =>
          modes[key]?.enabled &&
          (modes[key].note || (modes[key].providers || []).length > 0)
      )
  );

  if (!trip.enabled || !hasContent) return null;

  const arrival = arrivals.find((a) => a.code === arrivalCode) || arrivals[0] || null;
  const destination = arrival?.code || "";
  const city = citySlugFor(destination) || citySlugFor(arrival?.label);
  const usingOther = originChoice === OTHER_ORIGIN || origins.length === 0;
  const resolvedOrigin = usingOther ? customOrigin : originChoice;
  const originValid = /^[A-Z]{3}$/.test(resolvedOrigin);

  const enabledModes = MODE_ORDER.filter((key) => modes[key]?.enabled);

  const modeMeta = {
    flight: {
      title: labels.travelFlightTitle || "Avión",
      note: modes.flight.note,
      empty: !origins.length
        ? labels.travelNoOrigins || "Muy pronto compartiremos los aeropuertos de salida."
        : !originValid
          ? labels.travelOriginInvalid ||
            "Escribe un código IATA de 3 letras para ver los vuelos."
          : labels.travelNoProviders || "Muy pronto compartiremos enlaces para este medio.",
      links:
        destination && originValid
          ? buildModeLinks("flight", {
              origin: resolvedOrigin,
              destination,
              dateFrom,
              dateTo,
              adults: trip.adults,
              providers: modes.flight.providers,
            })
          : [],
    },
    train: {
      title: labels.travelTrainTitle || "Tren",
      note: modes.train.note,
      empty: labels.travelNoProviders || "Muy pronto compartiremos enlaces para este medio.",
      links: city
        ? buildModeLinks("train", {
            from: city,
            date: dateFrom,
            providers: modes.train.providers,
          })
        : [],
    },
    bus: {
      title: labels.travelBusTitle || "Autobús",
      note: modes.bus.note,
      empty: labels.travelNoProviders || "Muy pronto compartiremos enlaces para este medio.",
      links: city
        ? buildModeLinks("bus", {
            from: city,
            date: dateFrom,
            providers: modes.bus.providers,
          })
        : [],
    },
  };

  const cta = labels.travelCta || "Buscar";
  const adultsLine =
    trip.adults === 1
      ? labels.travelAdultsOne || "1 adulto"
      : `${trip.adults} ${labels.travelAdultsMany || "adultos"}`;

  return (
    <div
      className={
        isCover
          ? "flex w-full flex-col gap-[22px] text-left"
          : "mx-auto flex w-full max-w-[820px] flex-col items-center gap-[22px] px-6 pb-[120px] pt-24 text-center"
      }
    >
      {!isCover && (
        <Reveal className="flex flex-col items-center gap-[22px]">
          <Eyebrow>{labels.travelEyebrow || "Para quienes vienen de lejos"}</Eyebrow>
          <FlowerRule kind="granado" />
          <h2 className="m-0 font-inv-display text-[clamp(36px,8vw,50px)] font-normal leading-[1.08] text-[var(--inv-text)]">
            {labels.travelTitle || "Viaje"}
          </h2>
        </Reveal>
      )}

      {trip.intro && (
        <Reveal
          delay={0.05}
          className={isCover ? "w-full" : "w-full max-w-[620px]"}
        >
          <p
            className={
              isCover
                ? "m-0 whitespace-pre-line text-[15px] leading-[1.8] text-[var(--inv-text-soft)]"
                : "m-0 whitespace-pre-line text-center text-[16px] leading-[1.75] text-[var(--inv-text-soft)]"
            }
          >
            {trip.intro}
          </p>
        </Reveal>
      )}

      {arrivals.length === 0 ? (
        <Reveal delay={0.1} className={isCover ? "w-full" : "w-full max-w-[620px] text-left"}>
          <Notice>
            {labels.travelNoArrivals ||
              "Muy pronto compartiremos las ciudades de llegada y las opciones de transporte."}
          </Notice>
        </Reveal>
      ) : (
        <>
          <Reveal
            delay={0.1}
            className={isCover ? "w-full" : "w-full max-w-[620px] text-left"}
          >
            <div className="flex flex-col gap-5 border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] p-5 sm:p-6">
              <div>
                <span className={LABEL_CLASS}>
                  {labels.travelArrivalLabel || "Ciudad de llegada"}
                </span>
                <div
                  className="mt-2 flex flex-wrap gap-2"
                  role="group"
                  aria-label={labels.travelArrivalLabel || "Ciudad de llegada"}
                >
                  {arrivals.length === 1 ? (
                    <p className="m-0 flex min-h-[44px] w-full items-center border border-[var(--inv-accent-border)] bg-[var(--inv-bg-alt)] px-4 text-[13px] text-[var(--inv-text)]">
                      Llegada:{" "}
                      <span className="ml-1 font-medium">
                        {arrivals[0].label || arrivals[0].code} (
                        {arrivals[0].code})
                      </span>
                    </p>
                  ) : (
                    arrivals.map((item) => {
                      const selected = item.code === destination;
                      return (
                        <button
                          key={item.code}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setArrivalCode(item.code)}
                          className={`min-h-[44px] border px-4 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 ${
                            selected
                              ? "border-[var(--inv-text)] bg-[var(--inv-text)] text-[var(--inv-on-accent)]"
                              : "border-[var(--inv-accent-border)] bg-transparent text-[var(--inv-text-soft)] hover:border-[var(--inv-text)]"
                          }`}
                        >
                          {item.label || item.code}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${uid}-origin`} className={LABEL_CLASS}>
                    {labels.travelOriginLabel || "Ciudad de salida"}
                  </label>
                  {origins.length > 0 ? (
                    <select
                      id={`${uid}-origin`}
                      value={usingOther ? OTHER_ORIGIN : originChoice}
                      onChange={(event) => setOriginChoice(event.target.value)}
                      className={FIELD_CLASS}
                    >
                      {origins.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label || item.code}
                        </option>
                      ))}
                      <option value={OTHER_ORIGIN}>
                        {labels.travelOtherOrigin || "Otro aeropuerto"}
                      </option>
                    </select>
                  ) : (
                    <input
                      id={`${uid}-origin`}
                      type="text"
                      value={customOrigin}
                      onChange={(event) =>
                        setCustomOrigin(
                          event.target.value
                            .toUpperCase()
                            .replace(/[^A-Z]/g, "")
                            .slice(0, 3)
                        )
                      }
                      placeholder={labels.travelOriginPlaceholder || "MEX"}
                      className={FIELD_CLASS}
                      autoComplete="off"
                      spellCheck={false}
                      aria-describedby={`${uid}-origin-hint`}
                    />
                  )}
                  {origins.length === 0 && (
                    <Notice className="mt-2">
                      {labels.travelNoOrigins ||
                        "Muy pronto compartiremos los aeropuertos de salida."}
                    </Notice>
                  )}
                </div>

                <div>
                  <label htmlFor={`${uid}-date-from`} className={LABEL_CLASS}>
                    {labels.travelDateFromLabel || "Llegada a España"}
                  </label>
                  <input
                    id={`${uid}-date-from`}
                    type="date"
                    value={dateFrom}
                    max={dateTo}
                    onChange={(event) => setDateFrom(event.target.value || trip.date_from)}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              {usingOther && origins.length > 0 && (
                <div>
                  <label htmlFor={`${uid}-origin-other`} className={LABEL_CLASS}>
                    {labels.travelOriginCodeLabel || "Código IATA"}
                  </label>
                  <input
                    id={`${uid}-origin-other`}
                    type="text"
                    value={customOrigin}
                    onChange={(event) =>
                      setCustomOrigin(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z]/g, "")
                          .slice(0, 3)
                      )
                    }
                    placeholder={labels.travelOriginPlaceholder || "MEX"}
                    maxLength={3}
                    className={FIELD_CLASS}
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby={`${uid}-origin-hint`}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${uid}-date-to`} className={LABEL_CLASS}>
                    {labels.travelDateToLabel || "Regreso"}
                  </label>
                  <input
                    id={`${uid}-date-to`}
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(event) => setDateTo(event.target.value || trip.date_to)}
                    className={FIELD_CLASS}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--inv-text-muted)]">
                    {adultsLine}
                  </p>
                </div>
              </div>

              <p
                id={`${uid}-origin-hint`}
                className="m-0 text-[11px] leading-snug text-[var(--inv-text-muted)]"
              >
                {labels.travelOriginHint ||
                  "El aeropuerto de salida solo aplica a los vuelos. Código IATA de 3 letras."}
              </p>
            </div>
          </Reveal>

          {enabledModes.length > 0 ? (
            <div className="flex w-full flex-col gap-7">
              {enabledModes.map((key) => {
                const meta = modeMeta[key];
                return (
                  <ModeBlock
                    key={key}
                    mode={key}
                    title={meta.title}
                    note={meta.note}
                    links={meta.links}
                    emptyNotice={meta.empty}
                    cta={cta}
                  />
                );
              })}
            </div>
          ) : (
            <Reveal
              delay={0.15}
              className={isCover ? "w-full" : "w-full max-w-[620px] text-left"}
            >
              <Notice>
                {labels.travelNoModes || "Muy pronto compartiremos las opciones de transporte."}
              </Notice>
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}
