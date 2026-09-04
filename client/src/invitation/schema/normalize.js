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
//   contact_note + campos por formato (xv/boda/cumpleanos/baby_shower).

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
