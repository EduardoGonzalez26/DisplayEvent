// Tema "alice_xv" — XV de Alice. Replica la estructura de "xv" (mismo set de
// vars, labels, resolvers y opening) con una paleta propia: rosa pastel +
// blanco + dorado. Mismas fuentes que "xv" (Cormorant Garamond / Poppins /
// Dancing Script / Lato).

export const alice_xv = {
  id: "alice_xv",
  label: "XV de Alice",
  description:
    "Lavanda y dorado. Portada con monograma AR en oro, papel y contador premium.",
  vars: {
    "--inv-font-display": '"Cormorant Garamond", "Georgia", serif',
    "--inv-font-heading": '"Poppins", "system-ui", sans-serif',
    "--inv-font-script": '"Dancing Script", "Brush Script MT", cursive',
    "--inv-font-serif": '"Cormorant Garamond", "Georgia", serif',
    "--inv-font-body": '"Lato", "system-ui", sans-serif',

    // Fondo rosa pastel + blanco.
    "--inv-bg": "#FDF1F5",
    "--inv-bg-alt": "#F7E3EA",
    "--inv-bg-alt2": "#FFFFFF",
    "--inv-surface": "#FFFFFF",
    "--inv-card": "#FFFFFF",
    // Overlay OSCURO: es el backdrop del modal de Rsvp y del depósito
    // bancario. El overlay rosa/blanco del Hero se aplica en Hero.jsx.
    "--inv-overlay": "#4A2433",
    "--inv-on-accent": "#FFFFFF",

    // Dorado (acento principal): botones, divisores gruesos e íconos.
    "--inv-primary": "#C9A24B",
    "--inv-primary-light": "#E3C685",
    "--inv-primary-dark": "#A9822E",
    "--inv-primary-deep": "#8C6A22",

    // Texto (rosa-marrón profundo para lectura, jerarquía).
    "--inv-text": "#6B4A57",
    "--inv-text-soft": "#7E5B68",
    "--inv-text-muted": "#9A7A86",
    "--inv-text-dim": "#B69AA5",
    "--inv-text-light": "#D8C2CB",

    // Rosa (acento secundario). `--inv-accent-solid` se usa en el estado
    // "No asistirá" de Rsvp.
    "--inv-accent": "#D98AA4",
    "--inv-accent-solid": "#D98AA4",
    "--inv-accent-border": "#F3DFE6",
    "--inv-accent-border-strong": "#E4BECB",

    // Acentos XV (rosa + dorado). `--inv-botanical` reemplaza el verde de
    // boda por el dorado: colorea las orlas/divisores de decor.jsx.
    "--inv-accent-pink": "#D98AA4",
    "--inv-accent-yellow": "#E0B35A",
    "--inv-botanical": "#C9A24B",
    "--inv-script-pink": "#D98AA4",
    "--inv-accent-orange": "#E0B35A",

    "--inv-ring": "#FBE9EF",
    "--inv-radial-a": "rgba(217, 138, 164, 0.14)",
    "--inv-radial-b": "rgba(201, 162, 75, 0.08)",
    "--inv-radial-c": "rgba(217, 138, 164, 0.10)",

    // Sombras rosas suaves (~5%).
    "--inv-shadow-soft": "rgba(107, 74, 87, 0.06)",
    "--inv-shadow-card": "rgba(107, 74, 87, 0.05)",
    "--inv-shadow-mid": "rgba(107, 74, 87, 0.08)",
    "--inv-shadow-ring": "rgba(201, 162, 75, 0.22)",
    "--inv-shadow-deep": "rgba(107, 74, 87, 0.12)",
    "--inv-shadow-gold": "rgba(201, 162, 75, 0.22)",

    // Gradiente dorado cálido para los títulos compartidos que usan
    // `text-gold-gradient` (títulos de Rsvp/Gifts, loaders, nombres).
    "--inv-gold-gradient":
      "linear-gradient(180deg, #E9CF8F 0%, #D6B263 45%, #C9A24B 70%, #A9822E 100%)",

    // Portada clara: degradado rosa/blanco suave como fallback sin foto.
    "--inv-hero-fallback": "linear-gradient(160deg, #FDF1F5 0%, #F7DCE4 100%)",
  },
  // Experiencia de apertura: sobre digital con la inicial de la quinceañera.
  opening: {
    envelope: true,
    cardText: (cfg) => {
      const name = (cfg.celebrant_name || "").trim();
      return name ? name[0].toUpperCase() : "XV";
    },
    sealText: (cfg) => {
      const name = (cfg.celebrant_name || "").trim();
      return name ? name[0].toUpperCase() : "XV";
    },
  },
  labels: {
    rsvpEyebrow: "RSVP",
    rsvp: "Confirma tu asistencia",
    countdown: "Quedan",
    message: "Un mensaje para ustedes",
    itinerary: "Nuestro Itinerario",
    itineraryEyebrow: "Horarios",
    itinerarySubtitle:
      "Los momentos que viviremos juntos durante la celebración.",
    locations: "Cómo Llegar",
    locationsEyebrow: "Ubicaciones",
    locationsSubtitle:
      "Encuentra cada recinto de la celebración y navega directo con tu app favorita.",
    gallery: "Nuestros Mejores Recuerdos",
    galleryEyebrow: "Galería",
    dressCode: "Código de Vestimenta",
    dressCodeEyebrow: "Dress Code",
    withLove: "Con cariño",
    registryEyebrow: "Regalos",
    registryTitle: "Mesa de Regalos",
    padrinosEyebrow: "Honor",
    padrinosTitle: "Nuestros Padrinos",
    padrinosSubtitle:
      "Quienes nos acompañan en este camino, con todo su cariño y apoyo.",
    defaultKicker: "Invitación a mis XV años",
    heroInvite: "Te Invitamos a Mis XV Años",
    parentsLine: (parents) =>
      `Con el amor de sus padres · ${parents.join(" y ")}`,
    familyGreeting: (family) =>
      `Familia ${family}, cuéntanos quiénes podrán acompañarnos.`,
    defaultMessage: (family) =>
      `Familia ${family}, la alegría de contar con ustedes es inmensa. Nos encantaría acompañarlos en este día tan especial.`,
  },
  resolvers: {
    // Firma al pie del mensaje: nombre de la quinceañera, si no papás
    // unidos con " y ", si no `celebrants`.
    signature: (cfg) => {
      const celebrantName = (cfg.celebrant_name || "").trim();
      const parents = Array.isArray(cfg.parents)
        ? cfg.parents
            .map((p) => (p && typeof p === "object" ? p.name : p) || "")
            .map((p) => (p || "").trim())
            .filter(Boolean)
        : [];
      return celebrantName || (parents.length ? parents.join(" y ") : null);
    },
  },
};
