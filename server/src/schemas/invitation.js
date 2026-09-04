import { z } from "zod";

/* ------------------------------------------------------------------
   Contrato de datos para `events.invitation` (JSONB).

   v2 introduce un esquema formal y validado. Normalizamos formas
   legacy (dress_code como string, itinerario con `place`, parents/
   padrinos como objetos) a su forma canónica y descartamos claves
   desconocidas. NO se renombra ningún campo existente.
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

// Pareja (boda): { nameA, nameB }.
function normalizeCouple(v) {
  const obj = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  return { nameA: str(obj.nameA), nameB: str(obj.nameB) };
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

const coupleSchema = z.object({
  nameA: z.string().default(""),
  nameB: z.string().default(""),
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
  const arrayKeys = ["itinerary", "locations", "gallery", "dress_code", "contacts"];
  for (const key of arrayKeys) {
    if (!Array.isArray(out[key])) out[key] = [];
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
