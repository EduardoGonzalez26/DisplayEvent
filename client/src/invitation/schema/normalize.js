// Normalización y (de)serialización del editor de invitación.
//
// Espeja el contrato canónico de `server/src/schemas/invitation.js`: estas
// funciones y el descriptor de `schema/fields.js` son la fuente única de
// verdad en el frontend. El editor ya no serializa a mano.
//
// Forma canónica (lo que acepta `PUT /events/:id/invitation`):
//   version: 2, template, hero_image, kicker, tagline, message, celebrants,
//   itinerary[{label,time}], locations[{label,place,url}], gallery[string],
//   dress_code[{label,icon?}], dress_note, contacts[{name,phone}],
//   contact_note, registry{...}, rsvp_editable, rsvp_edit_deadline
//   + campos por formato (xv/boda/cumpleanos/baby_shower).
//
// Contrato del límite de RSVP (`rsvp_edit_deadline`): string. "" = sin
// límite; con valor: ISO 8601 UTC (ej. "2026-11-01T05:59:00.000Z"). Solo
// aplica si `rsvp_editable === true`. El editor lo captura en hora LOCAL
// con `datetime-local` y aquí se guarda ISO UTC (`toIsoDate`); el camino
// inverso para repintarlo en el editor es `isoToLocalInput`.

const TEMPLATES = [
  "xv",
  "boda",
  "cumpleanos",
  "baby_shower",
  "alice_xv",
  "boda_jorge_macarena",
];

/* ------------------------------------------------------------------
   Helpers de coerción (equivalentes a los del backend, nunca lanzan).
------------------------------------------------------------------ */

// string -> string recortada. null/undefined -> "". Otros -> String(v).
function str(v) {
  if (v == null) return "";
  return typeof v === "string" ? v.trim() : String(v).trim();
}

// Lista de nombres (parents / padrinos): [string] recortado y sin vacíos.
function normalizeNames(v) {
  if (v == null) return [];
  if (typeof v === "string") {
    const t = v.trim();
    return t ? [t] : [];
  }
  if (!Array.isArray(v)) return v;
  return v
    .map((item) => {
      if (item == null) return "";
      if (typeof item === "object") return typeof item.name === "string" ? item.name.trim() : "";
      return typeof item === "string" ? item.trim() : String(item).trim();
    })
    .filter(Boolean);
}

// Itinerario: [{ label, time }].
function normalizeItinerary(v) {
  if (v == null) return [];
  if (!Array.isArray(v)) return v;
  return v
    .filter((it) => it && typeof it === "object")
    .map((it) => ({ label: str(it.label), time: str(it.time) }))
    .filter((it) => it.label || it.time);
}

// Ubicaciones: [{ label, place, url }].
function normalizeLocations(v) {
  if (v == null) return [];
  if (!Array.isArray(v)) return v;
  return v
    .filter((l) => l && typeof l === "object")
    .map((l) => ({ label: str(l.label), place: str(l.place), url: str(l.url) }))
    .filter((l) => l.place);
}

// Ubicaciones derivadas de un itinerario legacy (items con `place`).
function normalizeLegacyLocations(itinerary) {
  if (!Array.isArray(itinerary)) return [];
  return itinerary
    .filter((it) => it && typeof it === "object" && it.place)
    .map((it) => ({ label: str(it.label), place: str(it.place), url: str(it.url) }))
    .filter((l) => l.place);
}

// Galería: string[].
function normalizeGallery(v) {
  if (v == null) return [];
  if (!Array.isArray(v)) return v;
  return v.map((s) => str(s)).filter(Boolean);
}

// Dress code -> [{ label, icon? }]. Acepta string, [string] o [{label}].
function normalizeDressCode(v) {
  if (v == null) return [];
  if (typeof v === "string") {
    return v
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => ({ label }));
  }
  if (!Array.isArray(v)) return v;
  return v
    .map((d) => {
      if (d == null) return null;
      if (typeof d === "object") {
        const item = { label: str(d.label) };
        if (d.icon != null && str(d.icon)) item.icon = str(d.icon);
        return item;
      }
      return { label: str(d) };
    })
    .filter((d) => d && d.label);
}

// Contactos RSVP: [{ name, phone }].
function normalizeContacts(v) {
  if (v == null) return [];
  if (!Array.isArray(v)) return v;
  return v
    .filter((c) => c && typeof c === "object")
    .map((c) => ({ name: str(c.name), phone: str(c.phone) }))
    .filter((c) => c.name || c.phone);
}

// Pareja (boda): { nameA, nameB }.
function normalizeCouple(v) {
  const obj = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  return { nameA: str(obj.nameA), nameB: str(obj.nameB) };
}

/* ------------------------------------------------------------------
   Campos congelados del rediseño editorial (comunes en el backend):
   `story`, `music_url`, `lodging` y `travel`. Espejan exactamente los
   helpers de `server/src/schemas/invitation.js`.
------------------------------------------------------------------ */

// Tope del texto "Nuestra historia" (espeja el backend).
export const STORY_MAX_LENGTH = 4000;

// Hospedaje: [{ name, note, url? }]. `url` es opcional: se omite cuando
// viene vacía/ausente. No-array se conserva para que la validación lo
// rechace (igual que el backend).
function normalizeLodging(v) {
  if (v == null) return [];
  if (!Array.isArray(v)) return v;
  return v
    .filter((l) => l && typeof l === "object")
    .map((l) => {
      const item = { name: str(l.name), note: str(l.note) };
      if (l.url != null && str(l.url)) item.url = str(l.url);
      return item;
    })
    .filter((l) => l.name || l.note || l.url);
}

// Viaje legacy: { title, airport_note, routes: [{ label, note }], closing_note }.
// Objeto siempre presente y tolerante (no-objeto -> defaults).
function normalizeTravel(v) {
  const obj = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  let routes = obj.routes;
  if (routes == null) {
    routes = [];
  } else if (Array.isArray(routes)) {
    routes = routes
      .filter((r) => r && typeof r === "object")
      .map((r) => ({ label: str(r.label), note: str(r.note) }))
      .filter((r) => r.label || r.note);
  }
  return {
    title: str(obj.title),
    airport_note: str(obj.airport_note),
    routes,
    closing_note: str(obj.closing_note),
  };
}

/* ------------------------------------------------------------------
   Viaje y hospedaje (contrato nuevo `trip` / `stay`).

   Espejan los defaults y las reglas de normalización del backend:
   - Si `stay`/`trip` no existen, el bloque queda deshabilitado pero con
     los defaults internos (zona Alhambra, fechas 2027-06-08/12, cuatro
     tarjetas, cuatro orígenes, MAD/BCN y los tres modos con proveedores).
   - `cards`, `origins` y `arrivals` vacíos (`[]`) se respetan: el vacío es
     una decisión explícita. Solo `undefined`/`null` cae a los defaults.
   - `providers: []` también se respeta; ausente -> lista default del modo.
   - `lodging` y `travel` (legado) NO cambian de comportamiento.
----------------------------------------------------------------- */

const STAY_DEFAULT_CHECKIN = "2027-06-08";
const STAY_DEFAULT_CHECKOUT = "2027-06-12";
const TRIP_DEFAULT_DATE_FROM = "2027-06-08";
const TRIP_DEFAULT_DATE_TO = "2027-06-12";
const STAY_DEFAULT_ZONE = {
  lat: 37.1761,
  lng: -3.5881,
  radius_km: 1.5,
  label: "Alhambra, Granada",
};

const STAY_AUTO_PLATFORMS = new Set(["booking", "airbnb", "trivago", "google_hotels"]);
const STAY_MAX_CARDS = 12;
const TRIP_MAX_ORIGINS = 20;
const TRIP_MAX_ARRIVALS = 4;
const TRIP_MAX_PROVIDERS = 10;
const IATA_CODE_RE = /^[A-Z]{2,3}$/;

export const DEFAULT_STAY_CARDS = [
  {
    id: "booking",
    platform: "booking",
    title: "Booking.com",
    description: "Hoteles, apartamentos y casas cerca de la Alhambra.",
    url: "",
    auto: true,
  },
  {
    id: "airbnb",
    platform: "airbnb",
    title: "Airbnb",
    description: "Alojamientos completos y habitaciones en Granada.",
    url: "",
    auto: true,
  },
  {
    id: "trivago",
    platform: "trivago",
    title: "Trivago",
    description: "Compara precios de hoteles en Granada.",
    url: "",
    auto: true,
  },
  {
    id: "google_hotels",
    platform: "google_hotels",
    title: "Google Hotels",
    description: "Busca hoteles y compara opciones cerca de la zona.",
    url: "",
    auto: true,
  },
];

export const DEFAULT_TRIP_ORIGINS = [
  { code: "MEX", label: "CDMX – Benito Juárez" },
  { code: "NLU", label: "CDMX – AIFA" },
  { code: "GDL", label: "Guadalajara" },
  { code: "MTY", label: "Monterrey" },
];

export const DEFAULT_TRIP_ARRIVALS = [
  { code: "MAD", label: "Madrid" },
  { code: "BCN", label: "Barcelona" },
];

export const DEFAULT_TRIP_MODES = {
  flight: {
    enabled: true,
    note: "Vuelo internacional a Madrid o Barcelona; desde ahí continúa a Granada.",
    providers: ["google_flights", "skyscanner", "kayak"],
  },
  train: {
    enabled: true,
    note: "Tren de alta velocidad a Granada. Una opción cómoda y céntrica.",
    providers: ["renfe", "omio", "trainline"],
  },
  bus: {
    enabled: true,
    note: "Autobús interurbano a Granada. Más económico, con trayectos más largos.",
    providers: ["alsa", "omio", "flixbus"],
  },
};

// Numérico finito o default (nunca NaN/Infinity).
function toNumber(v, dflt) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return dflt;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// Coordenada numérica acotada al rango válido (espeja el backend).
function toCoord(v, dflt, min, max) {
  return clamp(toNumber(v, dflt), min, max);
}

// Radio en km acotado a 0.1–50 (espeja el backend).
function toRadius(v, dflt) {
  return clamp(toNumber(v, dflt), 0.1, 50);
}

// "YYYY-MM-DD" real (sin horas) o default. Acepta un ISO completo y toma
// su parte de fecha. Valida el calendario para no generar links con
// fechas imposibles (2027-02-30).
function toDayString(v, dflt) {
  const raw = str(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!m) return dflt;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return dflt;
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

// [{ code, label }] con `code` en mayúsculas y 2–3 letras. `[]` se respeta;
// ausente -> defaults; un no-array se sanea a [] (espeja el backend).
function normalizeTripPlaces(v, defaults, max) {
  if (v == null) return defaults.map((place) => ({ ...place }));
  if (!Array.isArray(v)) return [];
  return v
    .filter((place) => place && typeof place === "object" && !Array.isArray(place))
    .map((place) => ({
      code: str(place.code).toUpperCase(),
      label: str(place.label),
    }))
    .filter((place) => IATA_CODE_RE.test(place.code))
    .slice(0, max);
}

// Tarjetas de hospedaje. `[]` se respeta; undefined/null -> 4 default.
// `auto` hereda true en las plataformas conocidas, como el backend.
function normalizeStayCards(v) {
  if (v == null) return DEFAULT_STAY_CARDS.map((card) => ({ ...card }));
  if (!Array.isArray(v)) return [];
  return v
    .filter((card) => card && typeof card === "object" && !Array.isArray(card))
    .slice(0, STAY_MAX_CARDS)
    .map((card) => {
      const platform = str(card.platform);
      return {
        id: str(card.id),
        platform,
        title: str(card.title).slice(0, 120),
        description: str(card.description).slice(0, 300),
        url: str(card.url).slice(0, 500),
        auto: toBool(card.auto, STAY_AUTO_PLATFORMS.has(platform.toLowerCase())),
      };
    })
    .filter((card) => card.platform || card.title || card.description || card.url);
}

// Modo de viaje (flight/train/bus). `providers: []` se respeta; un
// no-array se sanea a [], como el backend.
function normalizeTripMode(v, defaults) {
  const source = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  let providers;
  if (source.providers == null) {
    providers = defaults.providers.slice();
  } else if (Array.isArray(source.providers)) {
    providers = source.providers
      .map((p) => str(p))
      .filter(Boolean)
      .slice(0, TRIP_MAX_PROVIDERS);
  } else {
    providers = [];
  }
  return {
    enabled: toBool(source.enabled, defaults.enabled),
    note:
      source.note === undefined || source.note === null ? defaults.note : str(source.note),
    providers,
  };
}

// Hospedaje nuevo. Idempotente y tolerante (nunca lanza).
export function normalizeStay(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const zoneSource =
    source.zone && typeof source.zone === "object" && !Array.isArray(source.zone)
      ? source.zone
      : {};
  return {
    enabled: toBool(source.enabled, false),
    intro: str(source.intro),
    zone: {
      lat: toCoord(zoneSource.lat, STAY_DEFAULT_ZONE.lat, -90, 90),
      lng: toCoord(zoneSource.lng, STAY_DEFAULT_ZONE.lng, -180, 180),
      radius_km: toRadius(zoneSource.radius_km, STAY_DEFAULT_ZONE.radius_km),
      label: str(zoneSource.label).slice(0, 120) || STAY_DEFAULT_ZONE.label,
    },
    checkin: toDayString(source.checkin, STAY_DEFAULT_CHECKIN),
    checkout: toDayString(source.checkout, STAY_DEFAULT_CHECKOUT),
    cards: normalizeStayCards(source.cards),
  };
}

// Viaje nuevo. Idempotente y tolerante (nunca lanza).
export function normalizeTrip(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const modesSource =
    source.modes && typeof source.modes === "object" && !Array.isArray(source.modes)
      ? source.modes
      : {};
  return {
    enabled: toBool(source.enabled, false),
    intro: str(source.intro),
    origins: normalizeTripPlaces(
      source.origins,
      DEFAULT_TRIP_ORIGINS,
      TRIP_MAX_ORIGINS
    ),
    arrivals: normalizeTripPlaces(
      source.arrivals,
      DEFAULT_TRIP_ARRIVALS,
      TRIP_MAX_ARRIVALS
    ),
    date_from: toDayString(source.date_from, TRIP_DEFAULT_DATE_FROM),
    date_to: toDayString(source.date_to, TRIP_DEFAULT_DATE_TO),
    // Los links siempre llevan al menos 1 adulto.
    adults: Math.max(1, toNonNegInt(source.adults, 1)),
    modes: {
      flight: normalizeTripMode(modesSource.flight, DEFAULT_TRIP_MODES.flight),
      train: normalizeTripMode(modesSource.train, DEFAULT_TRIP_MODES.train),
      bus: normalizeTripMode(modesSource.bus, DEFAULT_TRIP_MODES.bus),
    },
  };
}

/* ------------------------------------------------------------------
   Mesa de regalos (registry): campo común a todos los templates.
   Objeto con `bank` anidado. Espeja `normalizeRegistry` del backend
   (`server/src/schemas/invitation.js`) exactamente.
------------------------------------------------------------------ */

export const DEFAULT_SUGGESTED_MXN = [
  2000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 12000, 15000, 20000, 25000,
  30000,
];
export const DEFAULT_SUGGESTED_EUR = [
  100, 200, 250, 300, 350, 400, 450, 500, 600, 750, 1000, 1250, 1500,
];

// Booleano tolerante. null/undefined -> default. Strings "true"/"false"/"0"/"1".
function toBool(v, dflt) {
  if (typeof v === "boolean") return v;
  if (v == null) return dflt;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "true" || t === "1" || t === "si" || t === "sí" || t === "yes") return true;
    if (t === "false" || t === "0" || t === "no" || t === "") return false;
    return dflt;
  }
  if (typeof v === "number") return v !== 0;
  return dflt;
}

// Entero ≥ 0. null/undefined o inválido -> default.
function toNonNegInt(v, dflt) {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  return dflt;
}

// Array de enteros ≥ 0, filtrando entradas inválidas. No-array -> default.
function toIntArray(v, dflt) {
  if (!Array.isArray(v)) return dflt.slice();
  const out = [];
  for (const item of v) {
    if (typeof item === "number" && Number.isFinite(item) && item >= 0) {
      out.push(Math.floor(item));
    } else if (typeof item === "string" && item.trim() !== "") {
      const n = Number(item);
      if (Number.isFinite(n) && n >= 0) out.push(Math.floor(n));
    }
  }
  return out;
}

// Fecha del límite de RSVP -> ISO 8601 UTC. Trim + Date.parse:
// vacío/ausente/inválido -> "". Válido -> `new Date(t).toISOString()`
// (idempotente: una cadena ya ISO devuelve el mismo instante canónico).
function toIsoDate(v) {
  const s = str(v);
  if (!s) return "";
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : "";
}

// Datos bancarios (depósito/transferencia).
function normalizeBank(v) {
  const obj = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  return {
    enabled: toBool(obj.enabled, false),
    bank_name: str(obj.bank_name),
    holder: str(obj.holder),
    account_number: str(obj.account_number),
    concept: str(obj.concept),
  };
}

// Normaliza `registry`. Idempotente y tolerante (nunca lanza). Aplica defaults
// para todo lo ausente/inválido y descarta claves desconocidas.
export function normalizeRegistry(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    enabled: toBool(source.enabled, false),
    allow_custom: toBool(source.allow_custom, true),
    min_mxn: toNonNegInt(source.min_mxn, 2000),
    min_eur: toNonNegInt(source.min_eur, 100),
    suggested_mxn: toIntArray(source.suggested_mxn, DEFAULT_SUGGESTED_MXN),
    suggested_eur: toIntArray(source.suggested_eur, DEFAULT_SUGGESTED_EUR),
    stripe_enabled: toBool(source.stripe_enabled, false),
    // Link de pago externo de Stripe (Payment Link). Vacío = pago integrado.
    payment_link_url: str(source.payment_link_url),
    bank: normalizeBank(source.bank),
  };
}

/* ------------------------------------------------------------------
   API pública
------------------------------------------------------------------ */

// Normaliza formas legacy a canónicas. Idempotente y tolerante (nunca lanza).
// Es equivalente a `normalizeInvitation` del backend.
export function normalizeInvitation(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const template = TEMPLATES.includes(source.template) ? source.template : "xv";

  const out = {
    version: 2,
    template,
    hero_image: str(source.hero_image),
    kicker: str(source.kicker),
    tagline: str(source.tagline),
    message: str(source.message),
    celebrants: str(source.celebrants),
    itinerary: normalizeItinerary(source.itinerary),
    locations: normalizeLocations(source.locations),
    gallery: normalizeGallery(source.gallery),
    dress_code: normalizeDressCode(source.dress_code),
    dress_note: str(source.dress_note),
    contacts: normalizeContacts(source.contacts),
    contact_note: str(source.contact_note),
    // Campos del rediseño editorial (comunes en el backend): "Nuestra
    // historia", música externa, hospedaje y bloque de viaje.
    story: str(source.story).slice(0, STORY_MAX_LENGTH),
    music_url: str(source.music_url),
    lodging: normalizeLodging(source.lodging),
    travel: normalizeTravel(source.travel),
    // Bloques nuevos de la boda editorial. Deshabilitados por defecto si
    // faltan, pero siempre con la estructura completa para el editor.
    stay: normalizeStay(source.stay),
    trip: normalizeTrip(source.trip),
    registry: normalizeRegistry(source.registry),
    rsvp_editable: toBool(source.rsvp_editable, false),
    // Límite opcional para confirmar/editar el RSVP (ISO UTC; "" = sin límite).
    rsvp_edit_deadline: toIsoDate(source.rsvp_edit_deadline),
  };

  // Legacy: itinerario con `place` -> ubicaciones, solo si no hay ubicaciones.
  if (!Array.isArray(out.locations) || out.locations.length === 0) {
    const legacy = normalizeLegacyLocations(source.itinerary);
    if (legacy.length > 0) out.locations = legacy;
  }

  switch (template) {
    case "xv":
      out.celebrant_name = str(source.celebrant_name);
      out.parents = normalizeNames(source.parents);
      out.padrinos = normalizeNames(source.padrinos);
      out.registry_note = str(source.registry_note);
      break;
    case "boda":
      out.couple = normalizeCouple(source.couple);
      out.registry_note = str(source.registry_note);
      break;
    case "cumpleanos":
      out.age = str(source.age);
      out.theme_name = str(source.theme_name);
      break;
    case "baby_shower":
      out.parents = normalizeNames(source.parents);
      out.gender = str(source.gender);
      out.registry_note = str(source.registry_note);
      break;
    case "alice_xv":
      out.celebrant_name = str(source.celebrant_name);
      out.parents = normalizeNames(source.parents);
      out.padrinos = normalizeNames(source.padrinos);
      out.registry_note = str(source.registry_note);
      break;
    case "boda_jorge_macarena":
      out.couple = normalizeCouple(source.couple);
      out.registry_note = str(source.registry_note);
      break;
  }

  return out;
}

/* ------------------------------------------------------------------
   Editor: puente entre la fecha ISO UTC canónica y el
   `<input type="datetime-local">` (que trabaja en hora LOCAL).
------------------------------------------------------------------ */

// ISO 8601 UTC -> valor para `datetime-local` en hora LOCAL del navegador
// (`YYYY-MM-DDTHH:mm`, con pad de 2 dígitos). ""/inválido -> "".
// Es el inverso de lo que aplica `toIsoDate` al guardar: el input no lleva
// zona, el navegador lo interpreta como hora local y `toIsoDate` lo
// convierte a UTC.
export function isoToLocalInput(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ------------------------------------------------------------------
   Estado del formulario del editor
------------------------------------------------------------------ */

// Clave estable por fila de listas editables: se conserva al reordenar y se
// descarta al guardar (`serializeForm` la quita). Contador a nivel de módulo.
let rowUid = 0;
export function withUid(item) {
  return { ...item, _uid: ++rowUid };
}

// Filas vacías por defecto (una por lista, como mostraba el editor).
const EMPTY_ROWS = {
  itinerary: { label: "", time: "" },
  locations: { label: "", place: "", url: "" },
  contacts: { name: "", phone: "" },
  lodging: { name: "", note: "", url: "" },
  travelRoute: { label: "", note: "" },
};

// Canónico -> estado del formulario del editor.
// - añade `_uid` a las filas de itinerary/locations/contacts
// - `dress_code` a string unido por `\n`
// - parents/padrinos como arrays de strings (ya canónicos)
// - listas vacías -> una fila vacía (para que el editor muestre el input)
export function toFormState(raw) {
  const c = normalizeInvitation(raw);
  const rows = (list, empty) => {
    const items = Array.isArray(list) && list.length ? list : [empty];
    return items.map(withUid);
  };

  const form = {
    version: c.version,
    template: c.template,
    hero_image: c.hero_image,
    kicker: c.kicker,
    tagline: c.tagline,
    message: c.message,
    celebrants: c.celebrants,
    dress_code: c.dress_code.map((d) => d.label).join("\n"),
    dress_note: c.dress_note,
    contact_note: c.contact_note,
    itinerary: rows(c.itinerary, EMPTY_ROWS.itinerary),
    locations: rows(c.locations, EMPTY_ROWS.locations),
    gallery: c.gallery,
    contacts: rows(c.contacts, EMPTY_ROWS.contacts),
    // "Nuestra historia", música y hospedaje/viaje (filas con `_uid` para
    // el editor; `serializeForm` las limpia al guardar).
    story: c.story,
    music_url: c.music_url,
    lodging: rows(c.lodging, EMPTY_ROWS.lodging),
    travel: {
      ...c.travel,
      routes: rows(c.travel.routes, EMPTY_ROWS.travelRoute),
    },
    // Copia profunda: el formulario del editor puede mutar arrays/objetos
    // anidados sin tocar los defaults del módulo. Las tarjetas reciben
    // `_uid` para que React tenga una clave estable al editar/reordenar y un
    // `id` de contrato si el JSONB legado no lo traía; `serializeForm`
    // descarta `_uid` porque rebuilda cada tarjeta.
    stay: {
      ...c.stay,
      zone: { ...c.stay.zone },
      cards: c.stay.cards.map((card) => {
        const row = withUid({ ...card });
        return row.id ? row : { ...row, id: `card-${row._uid}` };
      }),
    },
    trip: {
      ...c.trip,
      origins: c.trip.origins.map((place) => ({ ...place })),
      arrivals: c.trip.arrivals.map((place) => ({ ...place })),
      modes: {
        flight: { ...c.trip.modes.flight, providers: c.trip.modes.flight.providers.slice() },
        train: { ...c.trip.modes.train, providers: c.trip.modes.train.providers.slice() },
        bus: { ...c.trip.modes.bus, providers: c.trip.modes.bus.providers.slice() },
      },
    },
    registry: {
      ...c.registry,
      suggested_mxn: c.registry.suggested_mxn.slice(),
      suggested_eur: c.registry.suggested_eur.slice(),
      bank: { ...c.registry.bank },
    },
    rsvp_editable: c.rsvp_editable,
    // ISO UTC -> hora local del editor (datetime-local).
    rsvp_edit_deadline: isoToLocalInput(c.rsvp_edit_deadline),
  };

  switch (c.template) {
    case "xv":
      form.celebrant_name = c.celebrant_name;
      form.parents = c.parents;
      form.padrinos = c.padrinos;
      form.registry_note = c.registry_note;
      break;
    case "boda":
      form.couple = { ...c.couple };
      form.registry_note = c.registry_note;
      break;
    case "cumpleanos":
      form.age = c.age;
      form.theme_name = c.theme_name;
      break;
    case "baby_shower":
      form.parents = c.parents;
      form.gender = c.gender;
      form.registry_note = c.registry_note;
      break;
    case "alice_xv":
      form.celebrant_name = c.celebrant_name;
      form.parents = c.parents;
      form.padrinos = c.padrinos;
      form.registry_note = c.registry_note;
      break;
    case "boda_jorge_macarena":
      form.couple = { ...c.couple };
      form.registry_note = c.registry_note;
      break;
  }

  return form;
}

// Estado del formulario -> payload canónico. Reutiliza `normalizeInvitation`
// (la misma fuente de verdad): quita `_uid`, `dress_code` string -> [{label}],
// parents/padrinos trim+filter, listas limpias, version 2 y template.
export function serializeForm(form) {
  return normalizeInvitation(form);
}
