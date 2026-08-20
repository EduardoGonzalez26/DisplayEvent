// Tema "boda" — ivory + verde salvia + dorado suave, tipografía serif clásica.
// Comparte la misma estructura de secciones que "xv"; solo cambia el look.

export const boda = {
  id: "boda",
  label: "Boda",
  description: "Marfil, verde salvia y dorado suave. Elegancia clásica.",
  vars: {
    "--inv-font-display": '"Playfair Display", "Georgia", serif',
    "--inv-font-heading": '"Playfair Display", "Georgia", serif',
    "--inv-font-script": '"Great Vibes", "Brush Script MT", cursive',
    "--inv-font-serif": '"Playfair Display", "Georgia", serif',
    "--inv-font-body": '"Lato", "system-ui", sans-serif',

    "--inv-bg": "#f6f4ec",
    "--inv-bg-alt": "#e7ebdd",
    "--inv-bg-alt2": "#fcfbf7",
    "--inv-surface": "#fcfbf7",
    "--inv-card": "#f6f4ec",
    "--inv-overlay": "#1c2018",
    "--inv-on-accent": "#1c2018",
    "--inv-primary": "#ab9268",
    "--inv-primary-light": "#d6c49b",
    "--inv-primary-dark": "#8e744a",
    "--inv-primary-deep": "#6b5b37",
    "--inv-text": "#3d4633",
    "--inv-text-soft": "#5d6d4a",
    "--inv-text-muted": "#77885e",
    "--inv-text-dim": "#93a478",
    "--inv-text-light": "#b4c09c",
    "--inv-accent": "#5d6d4a",
    "--inv-accent-border": "#d3dac3",
    "--inv-accent-border-strong": "#b4c09c",
    "--inv-accent-solid": "#77885e",
    "--inv-ring": "#e7ebdd",
    "--inv-radial-a": "rgba(120, 135, 95, 0.30)",
    "--inv-radial-b": "rgba(255, 253, 248, 0.55)",
    "--inv-radial-c": "rgba(120, 135, 95, 0.16)",
    "--inv-shadow-soft": "rgba(62, 70, 51, 0.16)",
    "--inv-shadow-card": "rgba(62, 70, 51, 0.13)",
    "--inv-shadow-mid": "rgba(62, 70, 51, 0.11)",
    "--inv-shadow-ring": "rgba(171, 146, 104, 0.5)",
    "--inv-gold-gradient":
      "linear-gradient(180deg, #f9efd0 0%, #ecd39f 35%, #d3a95c 68%, #b8873a 100%)",
    "--inv-hero-fallback":
      "linear-gradient(165deg, #f3f0e6 0%, #e9ead9 45%, #d3dac3 78%, #c2cbaa 100%)",
  },
  fonts: {
    display: "font-inv-display",
    heading: "font-inv-heading",
    script: "font-inv-script",
    serif: "font-inv-serif",
    body: "font-inv-body",
  },
  ornaments: { corners: true, divider: "flor" },
  // Experiencia de apertura: sobre digital con monograma de la pareja.
  opening: {
    envelope: true,
    cardText: (cfg) => {
      const couple = cfg.couple || {};
      return (
        [couple.nameA, couple.nameB]
          .filter(Boolean)
          .map((n) => String(n).trim())
          .filter(Boolean)
          .map((n) => n[0].toUpperCase())
          .join(" & ") || "&"
      );
    },
    sealText: () => "&",
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
    familyGreeting: (family) =>
      `Familia ${family}, cuéntanos quiénes podrán acompañarnos.`,
    defaultMessage: (family) =>
      `Familia ${family}, queremos compartir con ustedes la alegría de este día tan especial. Será un honor contar con su presencia.`,
  },
};