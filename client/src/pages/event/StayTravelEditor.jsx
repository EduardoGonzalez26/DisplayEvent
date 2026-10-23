import { lazy, Suspense, useId, useMemo } from "react";
import { Button } from "../../components/ui.jsx";
import { getField, setField } from "../../invitation/schema/fields.js";
import { DEFAULT_STAY_CARDS, withUid } from "../../invitation/schema/normalize.js";
import {
  BUS_PROVIDERS,
  FLIGHT_PROVIDERS,
  STAY_PLATFORMS,
  TRAIN_PROVIDERS,
  buildStayUrl,
  safeHttpUrl,
} from "../../wedding/stayTravelLinks.js";

/* ------------------------------------------------------------------
   Editor de las secciones Viaje (`trip`) y Hospedaje (`stay`) de la
   plantilla boda_jorge_macarena.

   - Todo se escribe en el formulario del editor con `setField` (dot-path)
     y `setForm`; no se persiste nada por sí solo.
   - `serializeForm` normaliza y limpia `_uid`; las tarjetas conservan su
     `id` como parte del contrato público.
   - Las advertencias son informativas: nunca bloquean "Guardar cambios"
   - Leaflet se carga en un chunk perezoso, igual que en la invitación.
----------------------------------------------------------------- */

const ZoneMap = lazy(() =>
  import("../../invitation/boda_jorge_macarena/ZoneMap.jsx")
);

const ORIGIN_MAX = 20;
const STAY_CARD_MAX = 12;
const RADIUS_MIN = 0.5;
const RADIUS_MAX = 20;
const CUSTOM_PLATFORM = "custom";

const DEFAULT_CENTER = { lat: 37.1761, lng: -3.5881 };
const DEFAULT_ZONE_LABEL = "Alhambra, Granada";

const ARRIVAL_OPTIONS = [
  { code: "MAD", label: "Madrid" },
  { code: "BCN", label: "Barcelona" },
];

const TRIP_MODES = [
  {
    id: "flight",
    title: "Avión",
    toggleLabel: "Mostrar avión",
    notePlaceholder:
      "Vuelo internacional a Madrid o Barcelona; desde ahí continúa a Granada.",
    providers: FLIGHT_PROVIDERS,
  },
  {
    id: "train",
    title: "Tren",
    toggleLabel: "Mostrar tren",
    notePlaceholder:
      "Tren de alta velocidad a Granada. Una opción cómoda y céntrica.",
    providers: TRAIN_PROVIDERS,
  },
  {
    id: "bus",
    title: "Autobús",
    toggleLabel: "Mostrar autobús",
    notePlaceholder:
      "Autobús interurbano a Granada. Más económico, con trayectos más largos.",
    providers: BUS_PROVIDERS,
  },
];

const STAY_PLATFORM_OPTIONS = [
  ...Object.values(STAY_PLATFORMS).map((platform) => ({
    value: platform.id,
    label: platform.label,
  })),
  { value: CUSTOM_PLATFORM, label: "Personalizada" },
];

const STAY_CARD_DEFAULTS = Object.fromEntries(
  DEFAULT_STAY_CARDS.map((card) => [card.platform, card])
);

const IATA_RE = /^[A-Z]{3}$/;

const MAP_THEME_STYLE = {
  "--inv-accent-border": "#374151",
  "--inv-surface": "#030712",
  "--inv-text-muted": "#9ca3af",
};

const FALLBACK_INPUT_CLS =
  "w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-400";

let customCardSeq = 0;

function str(value) {
  return value == null ? "" : String(value);
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toDayValue(value) {
  const raw = str(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function cleanCode(value) {
  return str(value)
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
}

function platformKey(value) {
  const key = str(value).toLowerCase();
  return STAY_PLATFORMS[key] ? key : CUSTOM_PLATFORM;
}

function cardIdFor(platform) {
  if (STAY_PLATFORMS[platform]) return platform;
  customCardSeq += 1;
  return `${CUSTOM_PLATFORM}-${Date.now().toString(36)}-${customCardSeq}`;
}

function newStayCard(platform) {
  const key = platformKey(platform);
  if (key === CUSTOM_PLATFORM) {
    return withUid({
      id: cardIdFor(CUSTOM_PLATFORM),
      platform: CUSTOM_PLATFORM,
      title: "",
      description: "",
      url: "",
      auto: false,
    });
  }
  const defaults = STAY_CARD_DEFAULTS[key] || {};
  return withUid({
    id: defaults.id || cardIdFor(key),
    platform: key,
    title: defaults.title || "",
    description: defaults.description || "",
    url: "",
    auto: true,
  });
}

function zoneIsValid(zone) {
  const lat = Number(zone?.lat);
  const lng = Number(zone?.lng);
  const radius = Number(zone?.radius_km);
  return (
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    Number.isFinite(radius) &&
    radius >= 0.1 &&
    radius <= 50
  );
}

function WarningList({ title, items }) {
  if (!items.length) return null;
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3"
    >
      <p className="text-sm font-medium text-amber-300">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-200/90">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function DateWarning({ id, children }) {
  return (
    <p
      id={id}
      role="status"
      className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
    >
      {children}
    </p>
  );
}

export default function StayTravelEditor({
  form,
  setForm,
  inputCls = FALLBACK_INPUT_CLS,
}) {
  const uid = useId();

  const stay = form?.stay || {};
  const zone = stay.zone || {};
  const cards = Array.isArray(stay.cards) ? stay.cards : [];
  const stayCheckin = toDayValue(stay.checkin);
  const stayCheckout = toDayValue(stay.checkout);

  const trip = form?.trip || {};
  const origins = Array.isArray(trip.origins) ? trip.origins : [];
  const arrivals = Array.isArray(trip.arrivals) ? trip.arrivals : [];
  const modes = trip.modes || {};
  const tripDateFrom = toDayValue(trip.date_from);
  const tripDateTo = toDayValue(trip.date_to);

  const tripDateFromId = `${uid}-trip-date-from`;
  const tripDateToId = `${uid}-trip-date-to`;
  const tripDateWarningId = `${uid}-trip-date-warning`;
  const stayCheckinId = `${uid}-stay-checkin`;
  const stayCheckoutId = `${uid}-stay-checkout`;
  const stayDateWarningId = `${uid}-stay-date-warning`;
  const radiusId = `${uid}-stay-radius`;
  const radiusHelpId = `${uid}-stay-radius-help`;
  const zoneLabelId = `${uid}-stay-zone-label`;

  const updateField = (path, value) =>
    setForm((current) => setField(current, path, value));

  // Actualiza una lista leyendo siempre el estado más reciente del formulario.
  const updateList = (path, updater) =>
    setForm((current) => {
      const value = getField(current, path);
      return setField(
        current,
        path,
        updater(Array.isArray(value) ? value : [])
      );
    });

  /* ------------------------------ Viaje ------------------------------ */

  const setOrigin = (index, key, value) =>
    updateList("trip.origins", (list) =>
      list.map((origin, i) =>
        i === index ? { ...origin, [key]: value } : origin
      )
    );

  const addOrigin = () =>
    updateList("trip.origins", (list) =>
      list.length >= ORIGIN_MAX
        ? list
        : [...list, withUid({ code: "", label: "" })]
    );

  const removeOrigin = (index) =>
    updateList("trip.origins", (list) =>
      list.filter((_, i) => i !== index)
    );

  const setArrival = (option, checked) =>
    setForm((current) => {
      const list = getField(current, "trip.arrivals");
      const source = Array.isArray(list) ? list : [];
      const code = option.code.toUpperCase();
      const others = source.filter(
        (arrival) => str(arrival?.code).toUpperCase() !== code
      );
      const selected = new Set(
        source.map((arrival) => str(arrival?.code).toUpperCase())
      );
      if (checked) selected.add(code);
      else selected.delete(code);

      // Mantiene el orden Madrid/Barcelona y conserva llegadas desconocidas.
      const known = ARRIVAL_OPTIONS.filter((item) =>
        selected.has(item.code)
      ).map((item) => ({ code: item.code, label: item.label }));
      const unknown = others.filter(
        (arrival) =>
          !ARRIVAL_OPTIONS.some(
            (item) => item.code === str(arrival?.code).toUpperCase()
          )
      );
      return setField(current, "trip.arrivals", [...known, ...unknown]);
    });

  const setMode = (modeId, patch) =>
    setForm((current) => {
      const currentMode = getField(current, `trip.modes.${modeId}`);
      return setField(current, `trip.modes.${modeId}`, {
        ...(currentMode && typeof currentMode === "object" ? currentMode : {}),
        ...patch,
      });
    });

  const toggleProvider = (modeId, providerId, checked) =>
    setForm((current) => {
      const value = getField(current, `trip.modes.${modeId}.providers`);
      const list = Array.isArray(value) ? value : [];
      const next = checked
        ? [...list.filter((id) => id !== providerId), providerId]
        : list.filter((id) => id !== providerId);
      return setField(current, `trip.modes.${modeId}.providers`, next);
    });

  const validOrigins = origins.filter((origin) =>
    IATA_RE.test(str(origin?.code).toUpperCase())
  );
  const arrivalCodes = useMemo(
    () => new Set(arrivals.map((arrival) => str(arrival?.code).toUpperCase())),
    [arrivals]
  );

  const tripWarnings = [];
  if (trip.enabled) {
    if (validOrigins.length === 0) {
      tripWarnings.push(
        "La sección Viaje está activa pero no tiene orígenes válidos; los vuelos no mostrarán enlaces."
      );
    }
    if (arrivals.length === 0) {
      tripWarnings.push(
        "La sección Viaje está activa pero no tiene ciudades de llegada."
      );
    }
    for (const modeDef of TRIP_MODES) {
      const mode = modes[modeDef.id] || {};
      const providers = Array.isArray(mode.providers) ? mode.providers : [];
      const hasKnownProvider = providers.some(
        (provider) => modeDef.providers[provider]
      );
      if (mode.enabled && !hasKnownProvider) {
        tripWarnings.push(
          `El modo ${modeDef.title.toLowerCase()} está activo pero no tiene proveedores seleccionados.`
        );
      }
    }
  }

  const tripDatesInverted = Boolean(
    tripDateFrom && tripDateTo && tripDateTo < tripDateFrom
  );

  /* ---------------------------- Hospedaje ---------------------------- */

  const radiusValue = toNumber(zone.radius_km, 1.5);
  const radiusSliderValue = clamp(radiusValue, RADIUS_MIN, RADIUS_MAX);
  const mapLat = clamp(
    toNumber(zone.lat, DEFAULT_CENTER.lat),
    -90,
    90
  );
  const mapLng = clamp(
    toNumber(zone.lng, DEFAULT_CENTER.lng),
    -180,
    180
  );
  // Se muestran las coordenadas guardadas; el mapa usa el valor acotado para
  // no romperse si el JSONB trae un valor fuera de rango.
  const zoneLatLabel = Number.isFinite(Number(zone.lat))
    ? Number(zone.lat).toFixed(5)
    : "—";
  const zoneLngLabel = Number.isFinite(Number(zone.lng))
    ? Number(zone.lng).toFixed(5)
    : "—";
  const mapCenter = useMemo(
    () => ({ lat: mapLat, lng: mapLng }),
    [mapLat, mapLng]
  );

  const handleZoneChange = ({ lat, lng }) =>
    setForm((current) => {
      const currentZone = getField(current, "stay.zone");
      return setField(current, "stay.zone", {
        ...(currentZone && typeof currentZone === "object"
          ? currentZone
          : {}),
        lat,
        lng,
      });
    });

  const setZoneField = (key, value) =>
    setForm((current) => {
      const currentZone = getField(current, "stay.zone");
      return setField(current, "stay.zone", {
        ...(currentZone && typeof currentZone === "object"
          ? currentZone
          : {}),
        [key]: value,
      });
    });

  const setCard = (index, patch) =>
    updateList("stay.cards", (list) =>
      list.map((card, i) => (i === index ? { ...card, ...patch } : card))
    );

  const changeCardPlatform = (index, value) => {
    updateList("stay.cards", (list) =>
      list.map((card, i) => {
        if (i !== index) return card;
        if (value === CUSTOM_PLATFORM) {
          return {
            ...card,
            id: cardIdFor(CUSTOM_PLATFORM),
            platform: CUSTOM_PLATFORM,
            title: "",
            description: "",
            url: "",
            auto: false,
          };
        }
        const defaults = STAY_CARD_DEFAULTS[value] || {};
        return {
          ...card,
          id: defaults.id || value,
          platform: value,
          title: defaults.title || "",
          description: defaults.description || "",
          url: "",
          auto: true,
        };
      })
    );
  };

  const addCard = () =>
    updateList("stay.cards", (list) =>
      list.length >= STAY_CARD_MAX ? list : [...list, newStayCard("booking")]
    );

  const removeCard = (index) =>
    updateList("stay.cards", (list) =>
      list.filter((_, i) => i !== index)
    );

  const stayWarnings = [];
  if (stay.enabled) {
    if (cards.length === 0) {
      stayWarnings.push(
        "La sección Hospedaje está activa pero no tiene tarjetas; no se mostrarán opciones de reserva."
      );
    }
    if (!zoneIsValid(zone)) {
      stayWarnings.push(
        "La zona del mapa no es válida (coordenadas o radio fuera de rango)."
      );
    }
    if (radiusValue < RADIUS_MIN || radiusValue > RADIUS_MAX) {
      stayWarnings.push(
        `El radio actual (${radiusValue.toFixed(1)} km) está fuera del rango del control (${RADIUS_MIN}–${RADIUS_MAX} km); ajusta el slider para actualizarlo.`
      );
    }
  }

  const stayDatesMissing = !stayCheckin || !stayCheckout;
  const stayDatesInvalid =
    !stayDatesMissing && stayCheckout <= stayCheckin;

  return (
    <>
      {/* ============================== VIAJE ============================== */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-base font-semibold text-white mb-1">Viaje</h2>
        <p className="text-sm text-gray-500 mb-4">
          Llegadas, orígenes, fechas y proveedores de transporte. Se muestra en
          la invitación solo si la sección está activa.
        </p>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!trip.enabled}
            onChange={(e) => updateField("trip.enabled", e.target.checked)}
            className="h-4 w-4 accent-gold-400"
          />
          <span className="text-sm text-gray-300">Activar sección Viaje</span>
        </label>
        {!trip.enabled && (
          <p className="text-xs text-gray-500 mt-1.5">
            La sección está oculta en la invitación; puedes configurarla ahora y
            activarla después.
          </p>
        )}

        <label className="block mt-4">
          <span className="text-sm text-gray-400 mb-1 block">
            Introducción
          </span>
          <textarea
            className={inputCls}
            rows={3}
            value={str(trip.intro)}
            onChange={(e) => updateField("trip.intro", e.target.value)}
            placeholder="Texto que aparece al inicio de la sección Viaje."
          />
        </label>

        {tripWarnings.length > 0 && (
          <WarningList title="Revisa la sección Viaje:" items={tripWarnings} />
        )}

        <div className="mt-5 border-t border-gray-800 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-white">
              Orígenes de salida
            </h3>
            <span className="text-xs text-gray-500">
              {origins.length}/{ORIGIN_MAX}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Aeropuertos desde los que viajan los invitados. Código IATA de 3
            letras (ej. MEX) y una etiqueta legible.
          </p>

          <div className="space-y-2">
            {origins.length === 0 && (
              <p className="text-sm text-gray-500">
                Aún no hay orígenes de salida.
              </p>
            )}
            {origins.map((origin, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <input
                  className={`${inputCls} uppercase sm:w-24`}
                  value={str(origin?.code)}
                  onChange={(e) =>
                    setOrigin(index, "code", cleanCode(e.target.value))
                  }
                  placeholder="MEX"
                  maxLength={3}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={`Código IATA del origen ${index + 1}`}
                />
                <input
                  className={inputCls}
                  value={str(origin?.label)}
                  onChange={(e) => setOrigin(index, "label", e.target.value)}
                  placeholder="CDMX – Benito Juárez"
                  aria-label={`Etiqueta del origen ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeOrigin(index)}
                  className="shrink-0 self-start text-sm text-red-500 hover:text-red-400 px-2 py-1 sm:self-auto sm:py-0"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              disabled={origins.length >= ORIGIN_MAX}
              onClick={addOrigin}
            >
              + Agregar origen
            </Button>
            {origins.length >= ORIGIN_MAX && (
              <p className="text-xs text-gray-500 mt-1.5">
                Máximo {ORIGIN_MAX} orígenes.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-gray-800 pt-5">
          <h3 className="text-sm font-semibold text-white mb-1">
            Ciudades de llegada
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Ciudades que verá el invitado para elegir su llegada a España.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {ARRIVAL_OPTIONS.map((option) => (
              <label
                key={option.code}
                className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={arrivalCodes.has(option.code)}
                  onChange={(e) => setArrival(option, e.target.checked)}
                  className="h-4 w-4 accent-gold-400"
                />
                {option.label} ({option.code})
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-gray-800 pt-5">
          <h3 className="text-sm font-semibold text-white mb-3">Fechas</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block" htmlFor={tripDateFromId}>
              <span className="text-sm text-gray-400 mb-1 block">
                Llegada a España
              </span>
              <input
                id={tripDateFromId}
                type="date"
                className={inputCls}
                value={tripDateFrom}
                onChange={(e) =>
                  updateField("trip.date_from", e.target.value)
                }
                aria-describedby={
                  tripDatesInverted ? tripDateWarningId : undefined
                }
              />
            </label>
            <label className="block" htmlFor={tripDateToId}>
              <span className="text-sm text-gray-400 mb-1 block">Regreso</span>
              <input
                id={tripDateToId}
                type="date"
                className={inputCls}
                value={tripDateTo}
                onChange={(e) => updateField("trip.date_to", e.target.value)}
                aria-describedby={
                  tripDatesInverted ? tripDateWarningId : undefined
                }
              />
            </label>
          </div>
          {tripDatesInverted && (
            <DateWarning id={tripDateWarningId}>
              El regreso es anterior a la llegada. Los enlaces de viaje se
              generarán con fechas incoherentes; revisa el orden.
            </DateWarning>
          )}
          {(!tripDateFrom || !tripDateTo) && (
            <p className="text-xs text-gray-500 mt-2">
              Si una fecha queda vacía, al guardar se usan las fechas por
              defecto de la boda (8–12 de junio de 2027).
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-gray-800 pt-5">
          <h3 className="text-sm font-semibold text-white mb-1">
            Modos y proveedores
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Activa cada medio de transporte y elige los proveedores cuyos
            enlaces se mostrarán.
          </p>

          <div className="space-y-3">
            {TRIP_MODES.map((modeDef) => {
              const mode = modes[modeDef.id] || {};
              const providers = Array.isArray(mode.providers)
                ? mode.providers
                : [];
              const hasKnownProvider = providers.some(
                (provider) => modeDef.providers[provider]
              );

              return (
                <div
                  key={modeDef.id}
                  className="rounded-xl border border-gray-800 p-4 space-y-3"
                >
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!mode.enabled}
                      onChange={(e) =>
                        setMode(modeDef.id, { enabled: e.target.checked })
                      }
                      className="h-4 w-4 accent-gold-400"
                    />
                    <span className="text-sm font-medium text-gray-200">
                      {modeDef.toggleLabel}
                    </span>
                  </label>

                  <label className="block">
                    <span className="text-sm text-gray-400 mb-1 block">
                      Nota de {modeDef.title.toLowerCase()}
                    </span>
                    <textarea
                      className={inputCls}
                      rows={2}
                      value={str(mode.note)}
                      onChange={(e) =>
                        setMode(modeDef.id, { note: e.target.value })
                      }
                      placeholder={modeDef.notePlaceholder}
                    />
                  </label>

                  <div>
                    <span className="text-sm text-gray-400 mb-1.5 block">
                      Proveedores
                    </span>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {Object.values(modeDef.providers).map((provider) => (
                        <label
                          key={provider.id}
                          className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={providers.includes(provider.id)}
                            onChange={(e) =>
                              toggleProvider(
                                modeDef.id,
                                provider.id,
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 accent-gold-400"
                          />
                          {provider.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {trip.enabled && mode.enabled && !hasKnownProvider && (
                    <p
                      role="status"
                      className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
                    >
                      Este modo está activo pero no tiene proveedores
                      seleccionados; no se mostrarán enlaces.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================ HOSPEDAJE ============================ */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-base font-semibold text-white mb-1">Hospedaje</h2>
        <p className="text-sm text-gray-500 mb-4">
          Zona sugerida, fechas y tarjetas de reserva. Se muestra en la
          invitación solo si la sección está activa.
        </p>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!stay.enabled}
            onChange={(e) => updateField("stay.enabled", e.target.checked)}
            className="h-4 w-4 accent-gold-400"
          />
          <span className="text-sm text-gray-300">
            Activar sección Hospedaje
          </span>
        </label>
        {!stay.enabled && (
          <p className="text-xs text-gray-500 mt-1.5">
            La sección está oculta en la invitación; puedes configurarla ahora y
            activarla después.
          </p>
        )}

        <label className="block mt-4">
          <span className="text-sm text-gray-400 mb-1 block">
            Introducción
          </span>
          <textarea
            className={inputCls}
            rows={3}
            value={str(stay.intro)}
            onChange={(e) => updateField("stay.intro", e.target.value)}
            placeholder="Texto que aparece al inicio de la sección Hospedaje."
          />
        </label>

        {stayWarnings.length > 0 && (
          <WarningList title="Revisa la sección Hospedaje:" items={stayWarnings} />
        )}

        <div className="mt-5 border-t border-gray-800 pt-5">
          <h3 className="text-sm font-semibold text-white mb-1">Zona</h3>
          <p className="text-sm text-gray-500 mb-3">
            Haz clic en el mapa para mover el centro de la zona de búsqueda.
          </p>

          {/* ZoneMap usa las variables del tema editorial. En el panel oscuro
              se fuerzan a tonos gray para que el mapa no herede variables
              inexistentes. */}
          <div
            className="overflow-hidden rounded-xl border border-gray-700 bg-gray-950 p-2"
            style={MAP_THEME_STYLE}
          >
            <Suspense
              fallback={
                <div className="grid h-[260px] w-full place-items-center text-sm text-gray-500 sm:h-[300px]">
                  Cargando mapa…
                </div>
              }
            >
              <ZoneMap
                center={mapCenter}
                radiusKm={radiusSliderValue}
                label={str(zone.label) || DEFAULT_ZONE_LABEL}
                readOnly={false}
                onChange={handleZoneChange}
                className="rounded-lg"
              />
            </Suspense>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Lat: {zoneLatLabel} · Lng: {zoneLngLabel}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 mt-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label
                  htmlFor={radiusId}
                  className="text-sm text-gray-400"
                >
                  Radio de búsqueda
                </label>
                <span className="text-sm font-medium text-gray-200">
                  {radiusValue.toFixed(1)} km
                </span>
              </div>
              <input
                id={radiusId}
                type="range"
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                step={0.1}
                value={radiusSliderValue}
                onChange={(e) =>
                  setZoneField("radius_km", Number(e.target.value))
                }
                className="w-full cursor-pointer accent-gold-400"
                aria-describedby={radiusHelpId}
              />
              <p id={radiusHelpId} className="text-xs text-gray-500 mt-1.5">
                Entre {RADIUS_MIN} y {RADIUS_MAX} km.
              </p>
            </div>

            <label className="block" htmlFor={zoneLabelId}>
              <span className="text-sm text-gray-400 mb-1 block">
                Etiqueta de la zona
              </span>
              <input
                id={zoneLabelId}
                className={inputCls}
                value={str(zone.label)}
                onChange={(e) => setZoneField("label", e.target.value)}
                placeholder="Alhambra, Granada"
                maxLength={120}
              />
              <span className="text-xs text-gray-500 mt-1.5 block">
                Se usa para los links de búsqueda. Si la dejas vacía, se usará
                “{DEFAULT_ZONE_LABEL}”.
              </span>
            </label>
          </div>
        </div>

        <div className="mt-5 border-t border-gray-800 pt-5">
          <h3 className="text-sm font-semibold text-white mb-3">Fechas</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block" htmlFor={stayCheckinId}>
              <span className="text-sm text-gray-400 mb-1 block">
                Llegada (check-in)
              </span>
              <input
                id={stayCheckinId}
                type="date"
                className={inputCls}
                value={stayCheckin}
                onChange={(e) => updateField("stay.checkin", e.target.value)}
                aria-describedby={
                  stayDatesInvalid || stayDatesMissing
                    ? stayDateWarningId
                    : undefined
                }
              />
            </label>
            <label className="block" htmlFor={stayCheckoutId}>
              <span className="text-sm text-gray-400 mb-1 block">
                Salida (check-out)
              </span>
              <input
                id={stayCheckoutId}
                type="date"
                className={inputCls}
                value={stayCheckout}
                onChange={(e) => updateField("stay.checkout", e.target.value)}
                aria-describedby={
                  stayDatesInvalid || stayDatesMissing
                    ? stayDateWarningId
                    : undefined
                }
              />
            </label>
          </div>
          {stayDatesInvalid && (
            <DateWarning id={stayDateWarningId}>
              La salida debe ser posterior a la llegada. Los links de hospedaje
              se generarán con noches inválidas; revisa las fechas.
            </DateWarning>
          )}
          {stayDatesMissing && (
            <DateWarning id={stayDateWarningId}>
              Faltan fechas de llegada o salida; al guardar se usarán las fechas
              por defecto de la boda.
            </DateWarning>
          )}
        </div>

        <div className="mt-5 border-t border-gray-800 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">
              Tarjetas de hospedaje
            </h3>
            <span className="text-xs text-gray-500">
              {cards.length}/{STAY_CARD_MAX}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Plataformas que verá el invitado. Las tarjetas automáticas generan el
            link con la zona y las fechas de arriba.
          </p>

          <div className="space-y-3" role="group" aria-label="Tarjetas de hospedaje">
            {cards.length === 0 && (
              <p className="text-sm text-gray-500">
                Aún no hay tarjetas de hospedaje.
              </p>
            )}

            {cards.map((card, index) => {
              const key = card?._uid ?? card?.id ?? index;
              const currentPlatform = platformKey(card?.platform);
              const isKnownPlatform = currentPlatform !== CUSTOM_PLATFORM;
              const isAuto = isKnownPlatform && !!card?.auto;
              const href = isAuto
                ? buildStayUrl(currentPlatform, {
                    // La zona completa mantiene el preview igual al link real;
                    // el guardado aplica el label por defecto si está vacío.
                    zone: { ...zone, label: str(zone.label) || DEFAULT_ZONE_LABEL },
                    checkin: stayCheckin,
                    checkout: stayCheckout,
                    adults: 1,
                  })
                : safeHttpUrl(card?.url);

              return (
                <div
                  key={key}
                  className="rounded-xl border border-gray-800 p-3 sm:p-4 space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,190px)_1fr_auto] sm:items-end">
                    <label className="block">
                      <span className="text-sm text-gray-400 mb-1 block">
                        Plataforma
                      </span>
                      <select
                        className={inputCls}
                        value={currentPlatform}
                        onChange={(e) =>
                          changeCardPlatform(index, e.target.value)
                        }
                      >
                        {STAY_PLATFORM_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-400 mb-1 block">
                        Título
                      </span>
                      <input
                        className={inputCls}
                        value={str(card?.title)}
                        onChange={(e) =>
                          setCard(index, { title: e.target.value })
                        }
                        placeholder="Booking.com"
                        maxLength={120}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => removeCard(index)}
                      className="shrink-0 justify-self-start text-sm text-red-500 hover:text-red-400 px-2 py-1 sm:justify-self-auto sm:pb-2"
                    >
                      Quitar
                    </button>
                  </div>

                  <label className="block">
                    <span className="text-sm text-gray-400 mb-1 block">
                      Descripción
                    </span>
                    <textarea
                      className={inputCls}
                      rows={2}
                      value={str(card?.description)}
                      onChange={(e) =>
                        setCard(index, { description: e.target.value })
                      }
                      placeholder="Hoteles y apartamentos cerca de la zona."
                      maxLength={300}
                    />
                  </label>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label
                      className={`flex items-center gap-2 text-sm text-gray-300 select-none ${
                        isKnownPlatform ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAuto}
                        disabled={!isKnownPlatform}
                        onChange={(e) =>
                          setCard(index, { auto: e.target.checked })
                        }
                        className="h-4 w-4 accent-gold-400"
                      />
                      Generar link automáticamente
                    </label>

                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
                      >
                        Probar link
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {isAuto
                          ? "No se pudo generar el link."
                          : "Escribe una URL http(s) para probar el link."}
                      </span>
                    )}
                  </div>

                  {!isKnownPlatform && (
                    <p className="text-xs text-gray-500">
                      Las tarjetas personalizadas usan una URL manual.
                    </p>
                  )}

                  {!isAuto && (
                    <label className="block">
                      <span className="text-sm text-gray-400 mb-1 block">
                        URL manual
                      </span>
                      <input
                        className={inputCls}
                        value={str(card?.url)}
                        onChange={(e) =>
                          setCard(index, { url: e.target.value })
                        }
                        placeholder="https://…"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={500}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              disabled={cards.length >= STAY_CARD_MAX}
              onClick={addCard}
            >
              + Agregar tarjeta
            </Button>
            {cards.length >= STAY_CARD_MAX && (
              <p className="text-xs text-gray-500 mt-1.5">
                Máximo {STAY_CARD_MAX} tarjetas.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
