import { useMemo, useState } from "react";
import { Drawing, Eyebrow, OrnamentRule } from "./index.js";
import { V3 } from "./assets.js";
import DateRangePicker from "./DateRangePicker.jsx";
import { SearchButton, SearchMeta, rangeLabel, dayMonth } from "./SearchCta.jsx";
import { buildModeLinks, safeHttpUrl } from "../../../wedding/stayTravelLinks.js";

// Fechas por defecto de los buscadores (3–12 jun); mandan sobre las del evento.
const DEFAULT_DATE_FROM = "2027-06-03";
const DEFAULT_DATE_TO = "2027-06-12";
const DEFAULT_INTRO =
  "Si venís desde México, aquí tenéis las mejores opciones para llegar a Granada. Elegid vuestra ciudad de salida y las fechas: los buscadores se actualizan solos.";

const EXTRA_ORIGINS = [
  { code: "MXP", label: "Milán – Malpensa" },
  { code: "YYZ", label: "Toronto – Pearson" },
  { code: "DEL", label: "Nueva Delhi – Indira Gandhi" },
];

// Aerolíneas con enlace directo a resultados (verificado 2026-11-22: abren
// la lista de vuelos con origen, destino y fechas ya puestos).
function yyyymmdd(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? { y: m[1], m: m[2], d: m[3] } : null;
}

function iberiaUrl({ origin, destination, dateFrom, dateTo, adults }) {
  const a = yyyymmdd(dateFrom);
  const b = yyyymmdd(dateTo);
  if (!a || !b) return "https://www.iberia.com/mx/";
  const q = new URLSearchParams({
    market: "MX",
    language: "es",
    appliesOMB: "false",
    splitEndCity: "false",
    initializedOMB: "true",
    flexible: "true",
    TRIP_TYPE: "2",
    BEGIN_CITY_01: origin,
    END_CITY_01: destination,
    BEGIN_DAY_01: a.d,
    BEGIN_MONTH_01: `${a.y}${a.m}`,
    BEGIN_YEAR_01: a.y,
    END_DAY_01: b.d,
    END_MONTH_01: `${b.y}${b.m}`,
    END_YEAR_01: b.y,
    FARE_TYPE: "R",
    ADT: String(adults || 1),
    CHD: "0",
    INF: "0",
    BNN: "0",
    YTH: "0",
    YCD: "0",
    BV_UseBVCookie: "no",
    boton: "Buscar",
    bookingMarket: "MX",
  });
  return `https://www.iberia.com/flights/?${q.toString()}#!/availability`;
}

function aeromexicoUrl({ origin, destination, dateFrom, dateTo, adults }) {
  if (!yyyymmdd(dateFrom) || !yyyymmdd(dateTo)) return "https://www.aeromexico.com/es-mx";
  // Tramos separados por punto (formato de los enlaces de Aeroméxico).
  const itinerary = `${origin}_${destination}_${dateFrom}.${destination}_${origin}_${dateTo}`;
  return `https://www.aeromexico.com/es-mx/reserva/opciones?itinerary=${itinerary}&leg=1&travelers=A${adults || 1}_C0_I0_PH0_PC0`;
}

const FLIGHT_EXTRA = [
  { id: "iberia", label: "Iberia", build: iberiaUrl },
  { id: "aeromexico", label: "Aeroméxico", build: aeromexicoUrl },
];

const MODE_COPY = {
  flight: "Vuelo internacional a Madrid y, desde ahí, conexión a Granada.",
  bus: "Desde Madrid, autobús directo a Granada: más económico, aunque el trayecto es más largo.",
};

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 15.5 13.5 11V5.5a1.5 1.5 0 0 0-3 0V11L3 15.5V17l7.5-2.2V19l-2 1.5V22l3.5-1 3.5 1v-1.5l-2-1.5v-4.2L21 17z" />
    </svg>
  );
}

function BusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="3" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 18v3M16 18v3M8 14h.01M16 14h.01" />
    </svg>
  );
}

/* Modo de transporte (siempre desplegado). */
function TravelMode({ mode }) {
  return (
    <div className="mjv3-mode" data-open="true">
      <h3 className="mjv3-mode-heading">
        <span className="mjv3-mode-head">
          <span className="mjv3-mode-icon" aria-hidden="true">
            {mode.key === "flight" ? <PlaneIcon /> : <BusIcon />}
          </span>
          <span className="mjv3-mode-title">{mode.title}</span>
          <span className="mjv3-mode-line" aria-hidden="true" />
        </span>
      </h3>
      <div className="mjv3-mode-body">
        <p className="mjv3-mode-desc">{mode.desc}</p>
        <div className="mjv3-provider-grid">
          {mode.providers.map((provider) => (
            <a
              key={provider.id}
              className="mjv3-provider-card"
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>
                <span className="mjv3-provider-name">{provider.label}</span>
                {provider.note ? (
                  <span className="mjv3-provider-note">{provider.note}</span>
                ) : null}
                <SearchMeta lines={[mode.route, provider.datesPrefilled ? mode.dates : ""]} />
              </span>
              <SearchButton />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function providerCards(mode, ctx, extras = []) {
  const links = buildModeLinks(mode, ctx);
  const seen = new Set(links.map((link) => link.id));
  const extraLinks = extras
    .filter((extra) => !seen.has(extra.id))
    .map((extra) => ({
      id: extra.id,
      label: extra.label,
      url: safeHttpUrl(extra.build(ctx)),
      datesPrefilled: true,
      note: "",
    }))
    .filter((extra) => extra.url);
  // Aerolíneas primero (son las que más se usan), luego comparadores.
  return [...extraLinks, ...links];
}

export default function TravelSection({ cfg }) {
  const trip = cfg?.trip || {};
  const origins = Array.isArray(trip.origins) ? trip.origins : [];
  // Ciudades de salida: las del evento + las de invitados de otros países.
  const originList = [...(origins.length ? origins : [{ code: "MEX", label: "CDMX – Benito Juárez" }])];
  for (const extra of EXTRA_ORIGINS) {
    if (!originList.some((place) => place.code === extra.code)) originList.push(extra);
  }
  // Decisión v3: la llegada a España está fijada en Madrid.
  const arrival = { code: "MAD", label: "Madrid" };
  const adults = Math.max(1, Number(trip.adults) || 1);

  const [origin, setOrigin] = useState(() => originList[0]?.code || "MEX");
  const [dateFrom, setDateFrom] = useState(
    () => DEFAULT_DATE_FROM
  );
  const [dateTo, setDateTo] = useState(
    () => DEFAULT_DATE_TO
  );

  const modes = trip.modes || {};
  const enabledModes = ["flight", "bus"].filter(
    (key) => modes[key]?.enabled
  );

  const builtModes = useMemo(
    () =>
      enabledModes.map((key) => {
        const mode = modes[key] || {};
        const providers = providerCards(
          key,
          {
            origin,
            destination: arrival.code || "MAD",
            dateFrom,
            dateTo,
            from: arrival.code || "MAD",
            date: dateFrom,
            adults,
            // Todos los buscadores (la selección del evento dejaba solo
            // algunos): aerolíneas, comparadores y autobuses.
            providers: undefined,
          },
          key === "flight" ? FLIGHT_EXTRA : []
        );
        return {
          key,
          route: key === "flight" ? `${origin} → ${arrival.code || "MAD"}` : "Madrid → Granada",
          dates: key === "flight" ? rangeLabel(dateFrom, dateTo) : dayMonth(dateFrom),
          title: key === "flight" ? "Avión" : "Autobús",
          desc: String(mode.note || "").trim() || MODE_COPY[key],
          providers,
        };
      }),
    [arrival.code, dateFrom, dateTo, enabledModes, modes, origin, adults]
  );

  if (!trip.enabled) return null;

  return (
    <div className="mjv3-stack">
      <div className="mjv3-drawing mjv3-drawing--small">
        <Drawing
          src={V3.p9}
          alt="Macarena y Jorge frente a la Torre Eiffel"
          ratio="864 / 1280"
          rotate={-1.17}
        />
      </div>
      <Eyebrow>Para quienes vienen de lejos</Eyebrow>
      <OrnamentRule />
      <h2 className="mj-display">Viaje</h2>
      <p className="mj-copy mjv3-travel-intro">
        {String(trip.intro || "").trim() || DEFAULT_INTRO}
      </p>

      <div className="mjv3-travel-card">
        <div className="mjv3-route-row">
          <label className="mjv3-route-from">
            <span className="mjv3-field-label"><span className="mjv3-lbl-long">Ciudad de </span>salida</span>
            <select
              className="mjv3-field"
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
            >
              {originList.map((place) => (
                <option key={place.code} value={place.code}>
                  {place.label || place.code}
                </option>
              ))}
            </select>
          </label>
          <span className="mjv3-route-arrow" aria-hidden="true">
            →
          </span>
          <div className="mjv3-route-to">
            <span className="mjv3-field-label"><span className="mjv3-lbl-long">Ciudad de </span>llegada</span>
            <span className="mjv3-route-city">{arrival.label || "Madrid"}</span>
          </div>
        </div>

        <div className="mjv3-travel-fields">
          <DateRangePicker
            start={dateFrom}
            end={dateTo}
            startLabel="Llegada a España"
            endLabel="Regreso"
            onChange={({ start, end }) => {
              setDateFrom(start);
              setDateTo(end);
            }}
          />
        </div>
      </div>

      {builtModes.length ? (
        <div className="mjv3-travel-modes">
          {builtModes.map((mode) => (
            <TravelMode key={mode.key} mode={mode} />
          ))}
        </div>
      ) : (
        <p className="mjv3-muted-note">
          Muy pronto compartiremos las opciones de transporte.
        </p>
      )}
    </div>
  );
}
