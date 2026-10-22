import { z } from "zod";

/* ------------------------------------------------------------------
   Contrato de datos para `events.invitation` (JSONB).

   v2 introduce un esquema formal y validado. Normalizamos formas
   legacy (dress_code como string, itinerario con `place`, parents/
   padrinos como objetos) a su forma canónica y descartamos claves
   desconocidas. NO se renombra ningún campo existente.

   Campos comunes de RSVP:
   - `rsvp_editable`: si la familia puede confirmar/editar.
   - `rsvp_edit_deadline`: límite opcional de edición; ISO 8601 UTC con
     milisegundos o "" (sin límite). Solo aplica si `rsvp_editable` es true.
------------------------------------------------------------------ */

export const TEMPLATES = [
  "xv",
  "boda",
  "cumpleanos",
  "baby_shower",
  "alice_xv",
  "boda_jorge_macarena",
];

/* ------------------------------------------------------------------
   Helpers de normalización (tolerantes, idempotentes, nunca lanzan).
------------------------------------------------------------------ */

// string -> string recortada. null/undefined -> "". Otros -> String(v).
function str(v) {
  if (v == null) return "";
  return typeof v === "string" ? v.trim() : String(v).trim();
}

// Fecha ISO 8601 UTC con milisegundos. null/undefined/"" -> "". Acepta
// cualquier valor parseable por Date.parse (p. ej. "2026-11-01T00:00") y lo
// re-serializa con toISOString; no parseable -> "". Idempotente y nunca lanza.
function toIsoDate(v) {
  if (v == null) return "";
  const s = typeof v === "string" ? v.trim() : String(v).trim();
  if (!s) return "";
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toISOString();
}

// Lista de nombres (parents / padrinos). Acepta:
//   - null/undefined -> []
//   - "Alice"        -> ["Alice"]
//   - ["Alice", "Bob"] -> ["Alice", "Bob"]
//   - [{ name: "Alice" }] -> ["Alice"]
//   - otro tipo (número, etc.) -> se conserva para que la validación lo rechace.
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

// Itinerario: [{ label, time }] (descarta place/url, ya que pasaron a locations).
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

// Galería: string[]. Cualquier tipo no-array se conserva para que la
// validación lo rechace (regla dura: `gallery:"x"` debe dar 400).
function normalizeGallery(v) {
  if (v == null) return [];
  if (!Array.isArray(v)) return v;
  return v.map((s) => str(s)).filter(Boolean);
}

// Dress code -> [{ label, icon? }]. Acepta:
//   - "Formal\nCasual" (legacy string) -> [{label:"Formal"},{label:"Casual"}]
//   - ["Formal", "Casual"]            -> [{label:"Formal"},{label:"Casual"}]
//   - [{ label, icon? }]              -> se normaliza (label recortado).
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

// Hospedaje: [{ name, note, url? }]. `url` es opcional: se omite cuando viene
// vacía/ausente (igual que `icon` en dress code). No-array se conserva para
// que la validación lo rechace.
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

// Viaje: { title, airport_note, routes: [{ label, note }], closing_note }.
// Objeto siempre presente y tolerante (no-objeto -> defaults). `routes`
// no-array se conserva tal cual para que la validación lo rechace.
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
   Hospedaje (`stay`) y viaje (`trip`) de boda_jorge_macarena.
   Campos aditivos al contrato común. `lodging`/`travel` permanecen
   intactos como legado.
   ------------------------------------------------------------------ */

const DEFAULT_STAY_ZONE = Object.freeze({
  lat: 37.1761,
  lng: -3.5881,
  radius_km: 1.5,
  label: "Alhambra, Granada",
});

const DEFAULT_STAY_CARDS = Object.freeze([
  Object.freeze({
    id: "booking",
    platform: "booking",
    title: "Booking.com",
    description: "Hoteles, apartamentos y casas cerca de la Alhambra.",
    url: "",
    auto: true,
  }),
  Object.freeze({
    id: "airbnb",
    platform: "airbnb",
    title: "Airbnb",
    description: "Alojamientos completos y habitaciones en Granada.",
    url: "",
    auto: true,
  }),
  Object.freeze({
    id: "trivago",
    platform: "trivago",
    title: "Trivago",
    description: "Compara precios de hoteles en Granada.",
    url: "",
    auto: true,
  }),
  Object.freeze({
    id: "google_hotels",
    platform: "google_hotels",
    title: "Google Hotels",
    description: "Busca hoteles y compara opciones cerca de la zona.",
    url: "",
    auto: true,
  }),
]);

const STAY_AUTO_PLATFORMS = new Set(["booking", "airbnb", "trivago", "google_hotels"]);
const STAY_MAX_CARDS = 12;

const DEFAULT_TRIP_ORIGINS = Object.freeze([
  Object.freeze({ code: "MEX", label: "CDMX – Benito Juárez" }),
  Object.freeze({ code: "NLU", label: "CDMX – AIFA" }),
  Object.freeze({ code: "GDL", label: "Guadalajara" }),
  Object.freeze({ code: "MTY", label: "Monterrey" }),
]);

const DEFAULT_TRIP_ARRIVALS = Object.freeze([
  Object.freeze({ code: "MAD", label: "Madrid" }),
  Object.freeze({ code: "BCN", label: "Barcelona" }),
]);

const DEFAULT_TRIP_MODE_PROVIDERS = Object.freeze({
  flight: Object.freeze(["google_flights", "skyscanner", "kayak"]),
  train: Object.freeze(["renfe", "omio", "trainline"]),
  bus: Object.freeze(["alsa", "omio", "flixbus"]),
});

const TRIP_MAX_ORIGINS = 20;
const TRIP_MAX_ARRIVALS = 4;
const TRIP_MAX_PROVIDERS = 10;
const IATA_CODE_RE = /^[A-Z]{2,3}$/;

function cloneStayCards() {
  return DEFAULT_STAY_CARDS.map((card) => ({ ...card }));
}

function cloneTripPlaces(list) {
  return list.map((place) => ({ ...place }));
}

function cloneTripMode(kind) {
  return {
    enabled: true,
    note: "",
    providers: [...DEFAULT_TRIP_MODE_PROVIDERS[kind]],
  };
}

// Número finito tolerante (number o string numérica). Inválido -> default.
function toFiniteNumber(v, dflt) {
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

function normalizeStayCard(v) {
  const obj = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  const platform = str(obj.platform).slice(0, 40);
  return {
    id: str(obj.id).slice(0, 80),
    platform,
    title: str(obj.title).slice(0, 120),
    description: str(obj.description).slice(0, 300),
    url: str(obj.url).slice(0, 500),
    auto: toBool(obj.auto, STAY_AUTO_PLATFORMS.has(platform.toLowerCase())),
  };
}

// `undefined`/`null` -> 4 tarjetas por defecto. Un array (incluido []) se
// respeta; cualquier otro tipo se sanea a [].
function normalizeStayCards(v) {
  if (v == null) return cloneStayCards();
  if (!Array.isArray(v)) return [];
  return v
    .filter((card) => card && typeof card === "object" && !Array.isArray(card))
    .slice(0, STAY_MAX_CARDS)
    .map(normalizeStayCard);
}

function normalizeStayZone(v) {
  const obj = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  return {
    lat: clamp(toFiniteNumber(obj.lat, DEFAULT_STAY_ZONE.lat), -90, 90),
    lng: clamp(toFiniteNumber(obj.lng, DEFAULT_STAY_ZONE.lng), -180, 180),
    radius_km: clamp(
      toFiniteNumber(obj.radius_km, DEFAULT_STAY_ZONE.radius_km),
      0.1,
      50
    ),
    label: str(obj.label).slice(0, 120) || DEFAULT_STAY_ZONE.label,
  };
}

function normalizeStay(raw) {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    enabled: toBool(obj.enabled, false),
    intro: str(obj.intro),
    zone: normalizeStayZone(obj.zone),
    checkin: str(obj.checkin),
    checkout: str(obj.checkout),
    cards: normalizeStayCards(obj.cards),
  };
}

// Códigos IATA: mayúsculas, 2-3 letras. Se desechan entradas sin código
// válido (no se inventan códigos). `undefined`/`null` -> defaults.
function normalizeTripPlaces(v, defaults, max) {
  if (v == null) return cloneTripPlaces(defaults);
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

function normalizeTripProviders(v, kind) {
  if (v == null) return [...DEFAULT_TRIP_MODE_PROVIDERS[kind]];
  if (!Array.isArray(v)) return [];
  return v
    .map((provider) => str(provider))
    .filter(Boolean)
    .slice(0, TRIP_MAX_PROVIDERS);
}

function normalizeTripMode(v, kind) {
  const obj = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  return {
    enabled: toBool(obj.enabled, true),
    note: str(obj.note),
    providers: normalizeTripProviders(obj.providers, kind),
  };
}

function normalizeTripModes(v) {
  const obj = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  return {
    flight: normalizeTripMode(obj.flight, "flight"),
    train: normalizeTripMode(obj.train, "train"),
    bus: normalizeTripMode(obj.bus, "bus"),
  };
}

function normalizeTrip(raw) {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    enabled: toBool(obj.enabled, false),
    intro: str(obj.intro),
    origins: normalizeTripPlaces(obj.origins, DEFAULT_TRIP_ORIGINS, TRIP_MAX_ORIGINS),
    arrivals: normalizeTripPlaces(obj.arrivals, DEFAULT_TRIP_ARRIVALS, TRIP_MAX_ARRIVALS),
    date_from: str(obj.date_from),
    date_to: str(obj.date_to),
    adults: Math.max(1, toNonNegInt(obj.adults, 1)),
    modes: normalizeTripModes(obj.modes),
  };
}

// Pareja (boda): { nameA, nameB }.
function normalizeCouple(v) {
  const obj = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  return { nameA: str(obj.nameA), nameB: str(obj.nameB) };
}

/* ------------------------------------------------------------------
   Mesa de regalos (registry): campo común a todos los templates.
   Permite regalos monetarios por Stripe y/o depósito bancario.
   ------------------------------------------------------------------ */

export const DEFAULT_SUGGESTED_MXN = [
  2000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 12000, 15000, 20000, 25000,
  30000,
];
export const DEFAULT_SUGGESTED_EUR = [
  100, 200, 250, 300, 350, 400, 450, 500, 600, 750, 1000, 1250, 1500,
];

// Tope del Payment Link externo de Stripe (u otro procesador): una URL larga
// no aporta valor y evita payloads abusivos en el JSONB.
export const PAYMENT_LINK_MAX_LENGTH = 500;

// Tope del texto "Nuestra historia": suficiente para un relato largo sin
// permitir payloads abusivos en el JSONB.
export const STORY_MAX_LENGTH = 4000;

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

// Normaliza `registry`. Idempotente y tolerante (nunca lanza). Descarta claves
// desconocidas y aplica defaults para todo lo ausente/inválido.
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
    payment_link_url: str(source.payment_link_url).slice(0, PAYMENT_LINK_MAX_LENGTH),
    bank: normalizeBank(source.bank),
  };
}

/* ------------------------------------------------------------------
   Schema zod (validación de tipos + defaults).
------------------------------------------------------------------ */

const itineraryItemSchema = z.object({
  label: z.string().default(""),
  time: z.string().default(""),
});

const locationItemSchema = z.object({
  label: z.string().default(""),
  place: z.string().default(""),
  url: z.string().default(""),
});

const dressCodeItemSchema = z.object({
  label: z.string().default(""),
  icon: z.string().optional(),
});

const contactItemSchema = z.object({
  name: z.string().default(""),
  phone: z.string().default(""),
});

const lodgingItemSchema = z.object({
  name: z.string().default(""),
  note: z.string().default(""),
  url: z.string().optional(),
});

const travelRouteSchema = z.object({
  label: z.string().default(""),
  note: z.string().default(""),
});

const travelSchema = z.object({
  title: z.string().default(""),
  airport_note: z.string().default(""),
  routes: z.array(travelRouteSchema).default([]),
  closing_note: z.string().default(""),
});

export const stayZoneSchema = z.object({
  lat: z.number().min(-90).max(90).default(DEFAULT_STAY_ZONE.lat),
  lng: z.number().min(-180).max(180).default(DEFAULT_STAY_ZONE.lng),
  radius_km: z.number().min(0.1).max(50).default(DEFAULT_STAY_ZONE.radius_km),
  label: z.string().max(120).default(DEFAULT_STAY_ZONE.label),
});

export const stayCardSchema = z.object({
  id: z.string().max(80).default(""),
  platform: z.string().max(40).default(""),
  title: z.string().max(120).default(""),
  description: z.string().max(300).default(""),
  url: z.string().max(500).default(""),
  auto: z.boolean().default(false),
});

export const staySchema = z.object({
  enabled: z.boolean().default(false),
  intro: z.string().default(""),
  zone: stayZoneSchema.default({}),
  checkin: z.string().default(""),
  checkout: z.string().default(""),
  cards: z.array(stayCardSchema).max(STAY_MAX_CARDS).default(cloneStayCards),
});

export const tripOriginSchema = z.object({
  code: z.string().regex(IATA_CODE_RE),
  label: z.string().default(""),
});

export const tripArrivalSchema = z.object({
  code: z.string().regex(IATA_CODE_RE),
  label: z.string().default(""),
});

export const tripModeSchema = z.object({
  enabled: z.boolean().default(true),
  note: z.string().default(""),
  providers: z.array(z.string()).max(TRIP_MAX_PROVIDERS).default([]),
});

export const tripModesSchema = z.object({
  flight: tripModeSchema.default(() => cloneTripMode("flight")),
  train: tripModeSchema.default(() => cloneTripMode("train")),
  bus: tripModeSchema.default(() => cloneTripMode("bus")),
});

export const tripSchema = z.object({
  enabled: z.boolean().default(false),
  intro: z.string().default(""),
  origins: z
    .array(tripOriginSchema)
    .max(TRIP_MAX_ORIGINS)
    .default(() => cloneTripPlaces(DEFAULT_TRIP_ORIGINS)),
  arrivals: z
    .array(tripArrivalSchema)
    .max(TRIP_MAX_ARRIVALS)
    .default(() => cloneTripPlaces(DEFAULT_TRIP_ARRIVALS)),
  date_from: z.string().default(""),
  date_to: z.string().default(""),
  adults: z.number().int().min(1).default(1),
  modes: tripModesSchema.default({}),
});

const coupleSchema = z.object({
  nameA: z.string().default(""),
  nameB: z.string().default(""),
});

const bankSchema = z.object({
  enabled: z.boolean().default(false),
  bank_name: z.string().default(""),
  holder: z.string().default(""),
  account_number: z.string().default(""),
  concept: z.string().default(""),
});

const registrySchema = z.object({
  enabled: z.boolean().default(false),
  allow_custom: z.boolean().default(true),
  min_mxn: z.number().int().nonnegative().default(2000),
  min_eur: z.number().int().nonnegative().default(100),
  suggested_mxn: z.array(z.number().int().nonnegative()).default(DEFAULT_SUGGESTED_MXN),
  suggested_eur: z.array(z.number().int().nonnegative()).default(DEFAULT_SUGGESTED_EUR),
  stripe_enabled: z.boolean().default(false),
  payment_link_url: z.string().max(PAYMENT_LINK_MAX_LENGTH).default(""),
  bank: bankSchema.default({}),
});

const commonFields = {
  version: z.number().int().nonnegative().default(2),
  hero_image: z.string().default(""),
  kicker: z.string().default(""),
  tagline: z.string().default(""),
  message: z.string().default(""),
  celebrants: z.string().default(""),
  itinerary: z.array(itineraryItemSchema).default([]),
  locations: z.array(locationItemSchema).default([]),
  gallery: z.array(z.string()).default([]),
  dress_code: z.array(dressCodeItemSchema).default([]),
  dress_note: z.string().default(""),
  contacts: z.array(contactItemSchema).default([]),
  contact_note: z.string().default(""),
  story: z.string().max(STORY_MAX_LENGTH).default(""),
  music_url: z.string().default(""),
  lodging: z.array(lodgingItemSchema).default([]),
  travel: travelSchema.default({}),
  stay: staySchema.default({}),
  trip: tripSchema.default({}),
  registry: registrySchema.default({}),
  rsvp_editable: z.boolean().default(false),
  rsvp_edit_deadline: z.string().default(""),
};

const xvSchema = z.object({
  template: z.literal("xv"),
  ...commonFields,
  celebrant_name: z.string().default(""),
  parents: z.array(z.string()).default([]),
  padrinos: z.array(z.string()).default([]),
  registry_note: z.string().default(""),
});

const bodaSchema = z.object({
  template: z.literal("boda"),
  ...commonFields,
  couple: coupleSchema.default({}),
  registry_note: z.string().default(""),
});

const cumpleanosSchema = z.object({
  template: z.literal("cumpleanos"),
  ...commonFields,
  age: z.string().default(""),
  theme_name: z.string().default(""),
});

const babyShowerSchema = z.object({
  template: z.literal("baby_shower"),
  ...commonFields,
  parents: z.array(z.string()).default([]),
  gender: z.string().default(""),
  registry_note: z.string().default(""),
});

const aliceXvSchema = z.object({
  template: z.literal("alice_xv"),
  ...commonFields,
  celebrant_name: z.string().default(""),
  parents: z.array(z.string()).default([]),
  padrinos: z.array(z.string()).default([]),
  registry_note: z.string().default(""),
});

const bodaJorgeMacarenaSchema = z.object({
  template: z.literal("boda_jorge_macarena"),
  ...commonFields,
  couple: coupleSchema.default({}),
  registry_note: z.string().default(""),
});

// Raíz: unión discriminada sobre `template`. Cada variante valida los campos
// comunes + los específicos de ese formato y descarta el resto.
export const invitationSchema = z.discriminatedUnion("template", [
  xvSchema,
  bodaSchema,
  cumpleanosSchema,
  babyShowerSchema,
  aliceXvSchema,
  bodaJorgeMacarenaSchema,
]);

/* ------------------------------------------------------------------
   API pública
------------------------------------------------------------------ */

// Normaliza formas legacy a canónicas. Idempotente y tolerante (nunca lanza).
// - template ausente/desconocido -> "xv"
// - version -> 2 (versión vigente del contrato)
// - claves desconocidas -> descartadas
// - dress_code string / array de strings -> [{ label, icon? }]
// - itinerary con `place` -> deriva `locations` si no existen
// - parents/padrinos -> [string] (trim + filtro de vacíos)
// - arrays null/undefined -> []
// - strings -> recortadas
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
    story: str(source.story).slice(0, STORY_MAX_LENGTH),
    music_url: str(source.music_url),
    lodging: normalizeLodging(source.lodging),
    travel: normalizeTravel(source.travel),
    stay: normalizeStay(source.stay),
    trip: normalizeTrip(source.trip),
    registry: normalizeRegistry(source.registry),
    rsvp_editable: toBool(source.rsvp_editable, false),
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

// Normaliza y valida. Devuelve el objeto limpio o lanza Error con mensaje
// claro (para responder 400 desde la ruta).
export function parseInvitation(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  if (source.template !== undefined && !TEMPLATES.includes(source.template)) {
    throw new Error(`Formato de invitación desconocido: "${source.template}"`);
  }

  const normalized = normalizeInvitation(source);
  const result = invitationSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }
  return result.data;
}

// Normalización para LECTURA (GET): igual que normalizeInvitation pero además
// garantiza que los campos de lista sean arrays reales (nunca null ni string),
// incluso si el dato guardado está corrupto. Nunca lanza.
export function normalizeForRead(raw) {
  const out = normalizeInvitation(raw);
  const arrayKeys = ["itinerary", "locations", "gallery", "dress_code", "contacts", "lodging"];
  for (const key of arrayKeys) {
    if (!Array.isArray(out[key])) out[key] = [];
  }
  // `travel` siempre presente, con `routes` como array real para lectura.
  if (!out.travel || typeof out.travel !== "object" || Array.isArray(out.travel)) {
    out.travel = normalizeTravel(null);
  } else if (!Array.isArray(out.travel.routes)) {
    out.travel.routes = [];
  }
  // `stay` y `trip` siempre presentes, con sus listas como arrays reales.
  out.stay = normalizeStay(out.stay);
  if (!Array.isArray(out.stay.cards)) out.stay.cards = [];
  out.trip = normalizeTrip(out.trip);
  if (!Array.isArray(out.trip.origins)) out.trip.origins = [];
  if (!Array.isArray(out.trip.arrivals)) out.trip.arrivals = [];
  for (const mode of Object.values(out.trip.modes)) {
    if (!Array.isArray(mode.providers)) mode.providers = [];
  }
  // `registry` siempre presente, con subestructuras saneadas para lectura.
  if (!out.registry || typeof out.registry !== "object" || Array.isArray(out.registry)) {
    out.registry = normalizeRegistry(null);
  } else {
    if (!Array.isArray(out.registry.suggested_mxn)) out.registry.suggested_mxn = DEFAULT_SUGGESTED_MXN.slice();
    if (!Array.isArray(out.registry.suggested_eur)) out.registry.suggested_eur = DEFAULT_SUGGESTED_EUR.slice();
    if (typeof out.registry.payment_link_url !== "string") {
      out.registry.payment_link_url = str(out.registry.payment_link_url).slice(0, PAYMENT_LINK_MAX_LENGTH);
    }
    if (!out.registry.bank || typeof out.registry.bank !== "object" || Array.isArray(out.registry.bank)) {
      out.registry.bank = normalizeBank(null);
    }
  }
  if (out.template === "xv" || out.template === "alice_xv" || out.template === "baby_shower") {
    if (!Array.isArray(out.parents)) out.parents = [];
  }
  if (out.template === "xv" || out.template === "alice_xv") {
    if (!Array.isArray(out.padrinos)) out.padrinos = [];
  }
  return out;
}

function formatZodError(error) {
  const issue = error.issues?.[0];
  if (!issue) return "La configuración de invitación es inválida";
  const path = issue.path?.join(".") || "invitación";
  if (issue.code === "invalid_type") {
    const expected = Array.isArray(issue.expected) ? issue.expected[0] : issue.expected;
    const receivedMatch = /received\s+([\w]+)/.exec(issue.message || "");
    const received = receivedMatch ? receivedMatch[1] : "otro tipo";
    return `Campo "${path}" inválido: se esperaba ${expected}, se recibió ${received}`;
  }
  return `Campo "${path}" inválido: ${issue.message}`;
}
