/* ------------------------------------------------------------------
   Tono de la invitación: español de México (ustedes) en general.
   Solo conservan el tono de España los textos donde se justifica: el
   saludo de la historia a quienes vienen desde España y la intro de
   Viaje ("Si venís desde México…"). Esos campos NO pasan por aquí.

   Los textos viven en el JSON del evento (y se editan en el panel), así
   que se adaptan al pintar: frases concretas del contenido original y
   formas de vosotros habituales. Solo se aplica a los campos listados en
   `mexicanizeCfg`.
------------------------------------------------------------------- */

// Límites de palabra con letras Unicode: `\b` de JS no entiende acentos
// ni ñ (trataría la "os" de "años" como palabra).
const word = (w) => new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, "gu");

const RULES = [
  // Frases completas del contenido original.
  [/alquilar un coche/g, "rentar un auto"],
  [/bajar su app/g, "descargar su app"],
  [word("alojaros"), "hospedarse"],
  [word("abrigaros"), "abrigarse"],
  // Pronombres y formas de vosotros.
  [word("veros"), "verlos"],
  [word("Os"), "Les"],
  [word("os"), "les"],
  [word("Vuestro"), "Su"],
  [word("vuestro"), "su"],
  [word("Vuestra"), "Su"],
  [word("vuestra"), "su"],
  [word("vuestros"), "sus"],
  [word("vuestras"), "sus"],
  [word("vosotros"), "ustedes"],
  [word("vosotras"), "ustedes"],
  [word("Podéis"), "Pueden"],
  [word("podéis"), "pueden"],
  [word("Tenéis"), "Tienen"],
  [word("tenéis"), "tienen"],
  [word("queréis"), "quieren"],
  [word("vengáis"), "vengan"],
  [word("estaréis"), "estarán"],
  [word("estáis"), "están"],
  [word("sois"), "son"],
  [word("venís"), "vienen"],
  [word("sabéis"), "saben"],
  [word("Traed"), "Traigan"],
  [word("traed"), "traigan"],
  [word("Contadnos"), "Cuéntennos"],
  [word("contadnos"), "cuéntennos"],
];

export function toMexican(text) {
  if (typeof text !== "string" || !text) return text;
  return RULES.reduce((acc, [re, to]) => acc.replace(re, to), text);
}

function mapStrings(obj, keys) {
  const out = { ...obj };
  for (const key of keys) {
    if (typeof obj[key] === "string") out[key] = toMexican(obj[key]);
  }
  return out;
}

// Campos del JSON del evento que hablan a todos los invitados.
export function mexicanizeCfg(cfg) {
  if (!cfg || typeof cfg !== "object") return cfg;
  const next = { ...cfg };
  if (typeof cfg.dress_note === "string") next.dress_note = toMexican(cfg.dress_note);
  if (cfg.icebreaker && typeof cfg.icebreaker === "object") {
    next.icebreaker = mapStrings(cfg.icebreaker, ["text"]);
  }
  if (cfg.recommendations && typeof cfg.recommendations === "object") {
    next.recommendations = {
      ...cfg.recommendations,
      items: Array.isArray(cfg.recommendations.items)
        ? cfg.recommendations.items.map((item) =>
            item && typeof item === "object"
              ? mapStrings(item, ["title", "text"])
              : item
          )
        : cfg.recommendations.items,
    };
  }
  if (cfg.stay && typeof cfg.stay === "object") {
    next.stay = {
      ...cfg.stay,
      ...mapStrings(cfg.stay, ["intro"]),
      cards: Array.isArray(cfg.stay.cards)
        ? cfg.stay.cards.map((card) =>
            card && typeof card === "object"
              ? mapStrings(card, ["description"])
              : card
          )
        : cfg.stay.cards,
    };
  }
  if (Array.isArray(cfg.lodging)) {
    next.lodging = cfg.lodging.map((item) =>
      item && typeof item === "object" ? mapStrings(item, ["note"]) : item
    );
  }
  if (Array.isArray(cfg.locations)) {
    next.locations = cfg.locations.map((item) =>
      item && typeof item === "object"
        ? mapStrings(item, ["description", "note", "text"])
        : item
    );
  }
  return next;
}
