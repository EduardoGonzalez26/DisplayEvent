// Tema "alice_xv" — XV de Alice. Replica la estructura de "xv" (mismo set de
// vars, labels, resolvers y opening) con una paleta propia: lavanda/lila +
// dorado suave + blanco perla. Mismas fuentes que "xv".

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

    "--inv-bg": "#f5f2fb",
    "--inv-bg-alt": "#e6e0f4",
    "--inv-bg-alt2": "#fbf9fd",
    "--inv-surface": "#fbf9fd",
    "--inv-card": "#f5f2fb",
    "--inv-overlay": "#2a2340",
    "--inv-on-accent": "#2a2340",
    "--inv-primary": "#ab9268",
    "--inv-primary-light": "#d6c49b",
    "--inv-primary-dark": "#8e744a",
    "--inv-primary-deep": "#6b5b37",
    "--inv-text": "#3f3554",
    "--inv-text-soft": "#5a4d75",
    "--inv-text-muted": "#7a6b98",
    "--inv-text-dim": "#9d8fbd",
    "--inv-text-light": "#c3b6e0",
    "--inv-accent": "#8b74c9",
    "--inv-accent-border": "#ded5f2",
    "--inv-accent-border-strong": "#c3b4e6",
    "--inv-accent-solid": "#a994dc",
    "--inv-ring": "#ede6f9",
    "--inv-radial-a": "rgba(169, 148, 220, 0.35)",
    "--inv-radial-b": "rgba(250, 247, 253, 0.55)",
    "--inv-radial-c": "rgba(169, 148, 220, 0.20)",
    "--inv-shadow-soft": "rgba(90, 74, 140, 0.18)",
    "--inv-shadow-card": "rgba(90, 74, 140, 0.14)",
    "--inv-shadow-mid": "rgba(90, 74, 140, 0.12)",
    "--inv-shadow-ring": "rgba(214, 196, 155, 0.55)",
    "--inv-gold-gradient":
      "linear-gradient(180deg, #f9efd0 0%, #ecd39f 35%, #d3a95c 68%, #b8873a 100%)",
    "--inv-hero-fallback":
      "linear-gradient(165deg, #e6e0f3 0%, #efe7f6 50%, #f3e9f7 100%)",
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
    countdown: "Faltan",
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
