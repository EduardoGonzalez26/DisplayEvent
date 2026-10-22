/* ------------------------------------------------------------------
   Generador de links de Viaje y Hospedaje (boda_jorge_macarena).

   Módulo PURO (sin React, sin DOM): se puede probar con Node. Construye
   URLs estables y solo devuelve http(s). Los proveedores sin soporte de
   fechas en la URL se marcan con `datesPrefilled: false` para que la UI
   avise al invitado.

   Fechas: se esperan `YYYY-MM-DD` (las del contrato `stay`/`trip`). Si
   llega una fecha vacía o inválida se usa el default de la boda
   (2027-06-08 / 2027-06-12) para no generar links rotos.
----------------------------------------------------------------- */

const DEFAULT_CHECKIN = "2027-06-08";
const DEFAULT_CHECKOUT = "2027-06-12";
const DATE_NOTE = "Selecciona la fecha en el proveedor.";

export const STAY_PLATFORMS = {
  booking: { id: "booking", label: "Booking.com" },
  airbnb: { id: "airbnb", label: "Airbnb" },
  trivago: { id: "trivago", label: "Trivago" },
  google_hotels: { id: "google_hotels", label: "Google Hotels" },
};

export const FLIGHT_PROVIDERS = {
  google_flights: { id: "google_flights", label: "Google Flights" },
  skyscanner: { id: "skyscanner", label: "Skyscanner" },
  kayak: { id: "kayak", label: "Kayak" },
};

export const TRAIN_PROVIDERS = {
  renfe: { id: "renfe", label: "Renfe" },
  omio: { id: "omio", label: "Omio" },
  trainline: { id: "trainline", label: "Trainline" },
};

export const BUS_PROVIDERS = {
  alsa: { id: "alsa", label: "ALSA" },
  omio: { id: "omio", label: "Omio" },
  flixbus: { id: "flixbus", label: "FlixBus" },
};

const MODE_PROVIDERS = {
  flight: FLIGHT_PROVIDERS,
  train: TRAIN_PROVIDERS,
  bus: BUS_PROVIDERS,
};

// Código IATA de llegada -> ciudad de salida del tren/autobús.
export const CITY_SLUGS = {
  MAD: "madrid",
  BCN: "barcelona",
};

function str(v) {
  if (v == null) return "";
  return typeof v === "string" ? v.trim() : String(v).trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateParts(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(value));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

// "2027-06-08" -> "270608" (formato de Skyscanner). Inválida -> "".
export function yyMMdd(value) {
  const p = dateParts(value);
  if (!p) return "";
  return `${String(p.year).slice(-2)}${pad2(p.month)}${pad2(p.day)}`;
}

// Fecha válida para los links; vacía/inválida -> default de la boda.
function safeDate(value, fallback) {
  return dateParts(value) ? str(value) : fallback;
}

function safeAdults(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

// URL absoluta http(s) o "" (nunca javascript:, data:, etc.).
export function safeHttpUrl(url) {
  const raw = str(url);
  if (!raw) return "";
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    /* noop */
  }
  return "";
}

/* "Alhambra, Granada" -> "Alhambra--Granada" (slug de búsqueda Airbnb). */
export function airbnbSlug(label) {
  const parts = str(label)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "Granada";
  return parts
    .map((part) => encodeURIComponent(part.replace(/\s+/g, "-")))
    .join("--");
}

/* "MAD" / "madrid" / "Madrid" -> "madrid". Desconocido -> slug del texto. */
export function citySlugFor(place) {
  const raw = str(place);
  if (!raw) return "";
  const code = raw.toUpperCase();
  if (CITY_SLUGS[code]) return CITY_SLUGS[code];
  const lower = raw.toLowerCase();
  if (CITY_SLUGS[lower.toUpperCase()]) return CITY_SLUGS[lower.toUpperCase()];
  return lower
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ------------------------------------------------------------------
   Hospedaje
----------------------------------------------------------------- */

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// Centro/radio numéricos y válidos, o null si falta algo.
function stayZoneNumbers(zone) {
  const lat = Number(zone?.lat);
  const lng = Number(zone?.lng);
  const radiusKm = Number(zone?.radius_km);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(radiusKm) ||
    radiusKm <= 0 ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng, radiusKm };
}

// Bounding box de la zona a partir del centro y el radio en km.
function stayBoundingBox(zone) {
  const point = stayZoneNumbers(zone);
  if (!point) return null;

  const cosLat = Math.cos((point.lat * Math.PI) / 180);
  // Cerca de los polos la longitud explota: sin bbox, link por etiqueta.
  if (!Number.isFinite(cosLat) || Math.abs(cosLat) < 1e-6) return null;

  const latDelta = point.radiusKm / 111.32;
  const lngDelta = point.radiusKm / (111.32 * cosLat);
  const box = {
    neLat: round6(point.lat + latDelta),
    neLng: round6(point.lng + lngDelta),
    swLat: round6(point.lat - latDelta),
    swLng: round6(point.lng - lngDelta),
  };
  if (!Object.values(box).every(Number.isFinite)) return null;
  return box;
}

export function buildStayUrl(platform, { zone, checkin, checkout, adults = 1 } = {}) {
  const key = str(platform).toLowerCase();
  if (!STAY_PLATFORMS[key]) return "";

  const label = str(zone?.label) || "Granada";
  const q = encodeURIComponent(label);
  const inDate = safeDate(checkin, DEFAULT_CHECKIN);
  const outDate = safeDate(checkout, DEFAULT_CHECKOUT);
  const guests = safeAdults(adults);
  const point = stayZoneNumbers(zone);
  const box = stayBoundingBox(zone);

  let url = "";
  switch (key) {
    case "booking":
      url =
        `https://www.booking.com/searchresults.es.html?ss=${q}` +
        `&checkin=${inDate}&checkout=${outDate}` +
        `&group_adults=${guests}&no_rooms=1&group_children=0&selected_currency=EUR`;
      if (point) {
        url +=
          `&latitude=${round6(point.lat)}` +
          `&longitude=${round6(point.lng)}` +
          `&radius=${round6(point.radiusKm)}`;
      }
      break;
    case "airbnb":
      url =
        `https://www.airbnb.es/s/${airbnbSlug(label)}/homes` +
        `?checkin=${inDate}&checkout=${outDate}&adults=${guests}`;
      if (box) {
        url +=
          `&search_by_map=true` +
          `&ne_lat=${box.neLat}&ne_lng=${box.neLng}` +
          `&sw_lat=${box.swLat}&sw_lng=${box.swLng}` +
          `&zoom=14`;
      }
      break;
    case "trivago":
      url = `https://www.trivago.es/es/srl?search=${q}&checkin=${inDate}&checkout=${outDate}`;
      break;
    case "google_hotels":
      url =
        `https://www.google.com/travel/search?q=hotels%20in%20${q}` +
        `&checkin=${inDate}&checkout=${outDate}&adults=${guests}&hl=es&curr=EUR`;
      break;
  }
  return safeHttpUrl(url);
}

/* ------------------------------------------------------------------
   Vuelos
----------------------------------------------------------------- */

export function buildFlightUrl(
  provider,
  { origin, destination, dateFrom, dateTo, adults = 1 } = {}
) {
  const key = str(provider).toLowerCase();
  if (!FLIGHT_PROVIDERS[key]) return "";

  const from = str(origin).toUpperCase();
  const to = str(destination).toUpperCase();
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return "";

  const fromDate = safeDate(dateFrom, DEFAULT_CHECKIN);
  const toDate = safeDate(dateTo, DEFAULT_CHECKOUT);
  const guests = safeAdults(adults);
  const adultWord = guests === 1 ? "adult" : "adults";

  let url = "";
  switch (key) {
    case "google_flights": {
      const q = `Flights from ${from} to ${to} on ${fromDate} through ${toDate} for ${guests} ${adultWord}`;
      url = `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&hl=es&curr=EUR`;
      break;
    }
    case "skyscanner":
      url =
        `https://www.skyscanner.es/transport/flights/${from.toLowerCase()}/${to.toLowerCase()}/` +
        `${yyMMdd(fromDate)}/${yyMMdd(toDate)}/?adultsv2=${guests}&cabinclass=economy&rtn=1`;
      break;
    case "kayak":
      url = `https://www.kayak.es/flights/${from}-${to}/${fromDate}/${toDate}?adults=${guests}&sort=bestflight_a`;
      break;
  }
  return safeHttpUrl(url);
}

/* ------------------------------------------------------------------
   Tren y autobús (llegada a Granada)
----------------------------------------------------------------- */

export function buildTrainUrl(provider, { from, date } = {}) {
  const key = str(provider).toLowerCase();
  if (!TRAIN_PROVIDERS[key]) return "";

  const city = citySlugFor(from) || "madrid";
  const day = safeDate(date, DEFAULT_CHECKIN);

  let url = "";
  switch (key) {
    case "renfe":
      // Renfe no acepta parámetros estables de origen/fecha.
      url = "https://www.renfe.com/es/es/viajar";
      break;
    case "omio":
      url = `https://www.omio.es/trains/${encodeURIComponent(city)}/granada?date=${day}`;
      break;
    case "trainline":
      url = `https://www.thetrainline.com/es/horarios-trenes/${encodeURIComponent(city)}-a-granada`;
      break;
  }
  return safeHttpUrl(url);
}

export function buildBusUrl(provider, { from, date } = {}) {
  const key = str(provider).toLowerCase();
  if (!BUS_PROVIDERS[key]) return "";

  const city = citySlugFor(from) || "madrid";
  const day = safeDate(date, DEFAULT_CHECKIN);

  let url = "";
  switch (key) {
    case "alsa":
      // Deep link de ruta; ALSA no recibe la fecha por query.
      url = `https://www.alsa.es/autobuses/${encodeURIComponent(city)}-granada`;
      break;
    case "omio":
      url = `https://www.omio.es/autobuses/${encodeURIComponent(city)}/granada?date=${day}`;
      break;
    case "flixbus":
      // Deep link verificado de ruta con la fecha de salida.
      url = `https://www.flixbus.es/autobuses/${encodeURIComponent(city)}-granada?departure=${day}`;
      break;
  }
  return safeHttpUrl(url);
}

/* ------------------------------------------------------------------
   Ensamblador para la sección Viaje.
----------------------------------------------------------------- */

// Devuelve [{ id, label, url, datesPrefilled, note }] para los proveedores
// del modo. Los proveedores sin prefill de fechas llevan la nota para la UI.
export function buildModeLinks(mode, ctx = {}) {
  const key = str(mode).toLowerCase();
  const catalog = MODE_PROVIDERS[key];
  if (!catalog) return [];

  const providers = Array.isArray(ctx.providers)
    ? ctx.providers
    : Object.keys(catalog);

  const links = [];
  for (const provider of providers) {
    const id = str(provider).toLowerCase();
    const meta = catalog[id];
    if (!meta) continue;

    let url = "";
    let datesPrefilled = false;

    if (key === "flight") {
      url = buildFlightUrl(id, {
        origin: ctx.origin,
        destination: ctx.destination,
        dateFrom: ctx.dateFrom,
        dateTo: ctx.dateTo,
        adults: ctx.adults,
      });
      datesPrefilled = !!url;
    } else if (key === "train") {
      url = buildTrainUrl(id, { from: ctx.from, date: ctx.date });
      datesPrefilled = id === "omio" && !!url;
    } else if (key === "bus") {
      url = buildBusUrl(id, { from: ctx.from, date: ctx.date });
      // Omio y FlixBus reciben la fecha en la URL; ALSA no.
      datesPrefilled = (id === "omio" || id === "flixbus") && !!url;
    }

    const href = safeHttpUrl(url);
    if (!href) continue;

    links.push({
      id,
      label: meta.label,
      url: href,
      datesPrefilled,
      note: datesPrefilled ? "" : DATE_NOTE,
    });
  }
  return links;
}
