// Tema "boda_jorge_macarena" — Boda de Jorge & Macarena. Replica la
// estructura de "boda" (mismo set de vars, labels, resolvers y opening) con
// una paleta propia: azul noche + dorado + marfil. El monograma de la pareja
// se forma igual que en "boda" vía couple.nameA / couple.nameB.

export const boda_jorge_macarena = {
  id: "boda_jorge_macarena",
  label: "Boda de Jorge & Macarena",
  description: "Azul noche, dorado y marfil. Elegancia nocturna clásica.",
  vars: {
    "--inv-font-display": '"Playfair Display", "Georgia", serif',
    "--inv-font-heading": '"Playfair Display", "Georgia", serif',
    "--inv-font-script": '"Great Vibes", "Brush Script MT", cursive',
    "--inv-font-serif": '"Playfair Display", "Georgia", serif',
    "--inv-font-body": '"Lato", "system-ui", sans-serif',

    "--inv-bg": "#f6f2e7",
    "--inv-bg-alt": "#e3e8ef",
    "--inv-bg-alt2": "#fbf9f2",
    "--inv-surface": "#fbf9f2",
    "--inv-card": "#f6f2e7",
    "--inv-overlay": "#142033",
    "--inv-on-accent": "#142033",
    "--inv-primary": "#ab9268",
    "--inv-primary-light": "#d6c49b",
    "--inv-primary-dark": "#8e744a",
    "--inv-primary-deep": "#6b5b37",
    "--inv-text": "#1f2d45",
    "--inv-text-soft": "#33465f",
    "--inv-text-muted": "#4a5f7d",
    "--inv-text-dim": "#667e9f",
    "--inv-text-light": "#8ba3c4",
    "--inv-accent": "#24406f",
    "--inv-accent-border": "#d3dce8",
    "--inv-accent-border-strong": "#aebfd4",
    "--inv-accent-solid": "#3a5c94",
    "--inv-ring": "#e8edf4",
    "--inv-radial-a": "rgba(58, 92, 148, 0.30)",
    "--inv-radial-b": "rgba(251, 249, 242, 0.55)",
    "--inv-radial-c": "rgba(58, 92, 148, 0.16)",
    "--inv-shadow-soft": "rgba(28, 44, 72, 0.16)",
    "--inv-shadow-card": "rgba(28, 44, 72, 0.13)",
    "--inv-shadow-mid": "rgba(28, 44, 72, 0.11)",
    "--inv-shadow-ring": "rgba(171, 146, 104, 0.5)",
    "--inv-gold-gradient":
      "linear-gradient(180deg, #f9efd0 0%, #ecd39f 35%, #d3a95c 68%, #b8873a 100%)",
    "--inv-hero-fallback":
      "linear-gradient(165deg, #f3f0e6 0%, #dfe4ec 45%, #b9c5d8 78%, #93a5c0 100%)",
  },
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
    familyGreeting: (family) =>
      `Familia ${family}, cuéntanos quiénes podrán acompañarnos.`,
    defaultMessage: (family) =>
      `Familia ${family}, queremos compartir con ustedes la alegría de este día tan especial. Será un honor contar con su presencia.`,
  },
  resolvers: {
    // Firma al pie del mensaje: nombres de la pareja unidos con " & ",
    // si no `celebrants`.
    signature: (cfg) => {
      const couple = cfg.couple || {};
      return [couple.nameA, couple.nameB].filter(Boolean).join(" & ") || null;
    },
  },
};
