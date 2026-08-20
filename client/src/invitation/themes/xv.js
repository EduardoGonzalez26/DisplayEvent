// Tema "xv" — XV años. Replica el look actual (rosa blush + dorado).
// Los valores de `vars` se aplican sobre la raíz de la invitación y las
// secciones consumen las utilidades semánticas bg-inv-*, text-inv-*, etc.

export const xv = {
  id: "xv",
  label: "XV años",
  description:
    "Rosa blush y dorado. Portada con monograma XV, padrinos y mesa de regalos.",
  vars: {
    "--inv-font-display": '"Cinzel", "Georgia", serif',
    "--inv-font-heading": '"Poppins", "system-ui", sans-serif',
    "--inv-font-script": '"Great Vibes", "Brush Script MT", cursive',
    "--inv-font-serif": '"Playfair Display", "Georgia", serif',
    "--inv-font-body": '"Lato", "system-ui", sans-serif',

    "--inv-bg": "#fff1f0",
    "--inv-bg-alt": "#ffdddb",
    "--inv-bg-alt2": "#fff8f7",
    "--inv-surface": "#fff8f7",
    "--inv-card": "#fff1f0",
    "--inv-overlay": "#381414",
    "--inv-on-accent": "#381414",
    "--inv-primary": "#ab9268",
    "--inv-primary-light": "#d6c49b",
    "--inv-primary-dark": "#8e744a",
    "--inv-primary-deep": "#6b5b37",
    "--inv-text": "#4a3d26",
    "--inv-text-soft": "#6b5b37",
    "--inv-text-muted": "#8e744a",
    "--inv-text-dim": "#ab9268",
    "--inv-text-light": "#d6c49b",
    "--inv-accent": "#d17b79",
    "--inv-accent-border": "#ffdddb",
    "--inv-accent-border-strong": "#f6c6c4",
    "--inv-accent-solid": "#e8a3a1",
    "--inv-ring": "#ffe9e7",
    "--inv-radial-a": "rgba(228, 163, 161, 0.35)",
    "--inv-radial-b": "rgba(255, 241, 240, 0.55)",
    "--inv-radial-c": "rgba(228, 163, 161, 0.22)",
    "--inv-shadow-soft": "rgba(163, 81, 79, 0.18)",
    "--inv-shadow-card": "rgba(163, 81, 79, 0.14)",
    "--inv-shadow-mid": "rgba(163, 81, 79, 0.12)",
    "--inv-shadow-ring": "rgba(214, 196, 155, 0.55)",
    "--inv-gold-gradient":
      "linear-gradient(180deg, #f9efd0 0%, #ecd39f 35%, #d3a95c 68%, #b8873a 100%)",
    "--inv-hero-fallback":
      "linear-gradient(165deg, #ffe6e3 0%, #ffd9d6 45%, #f4bdba 78%, #e8a3a1 100%)",
  },
  fonts: {
    display: "font-inv-display",
    heading: "font-inv-heading",
    script: "font-inv-script",
    serif: "font-inv-serif",
    body: "font-inv-body",
  },
  ornaments: { corners: true, divider: "flor" },
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
    rsvp: "Confirma tu asistencia",
    countdown: "Faltan",
    message: "Un mensaje para ustedes",
    itinerary: "Nuestro Itinerario",
    locations: "Cómo Llegar",
    gallery: "Nuestros Mejores Recuerdos",
    dressCode: "Código de Vestimenta",
    withLove: "Con cariño",
    registryEyebrow: "Regalos",
    registryTitle: "Mesa de Regalos",
    padrinosEyebrow: "Honor",
    padrinosTitle: "Nuestros Padrinos",
    padrinosSubtitle:
      "Quienes nos acompañan en este camino, con todo su cariño y apoyo.",
    defaultKicker: "Invitación a mis XV años",
    parentsLine: (parents) =>
      `Con el amor de sus padres · ${parents.join(" y ")}`,
    familyGreeting: (family) =>
      `Familia ${family}, cuéntanos quiénes podrán acompañarnos.`,
    defaultMessage: (family) =>
      `Familia ${family}, la alegría de contar con ustedes es inmensa. Nos encantaría acompañarlos en este día tan especial.`,
  },
};