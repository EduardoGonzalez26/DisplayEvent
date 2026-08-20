// Tema "baby_shower" — pastel suave (rosa empolvado + verde menta) con
// tipografía redondeada y delicada. Comparte la estructura de secciones
// de "xv"; solo cambia el look y los datos que pide (papás, género).

export const baby_shower = {
  id: "baby_shower",
  label: "Baby shower",
  description: "Rosa empolvado y verde menta. Delicado y acogedor.",
  vars: {
    "--inv-font-display": '"Baloo 2", "system-ui", sans-serif',
    "--inv-font-heading": '"Baloo 2", "system-ui", sans-serif',
    "--inv-font-script": '"Great Vibes", "Brush Script MT", cursive',
    "--inv-font-serif": '"Nunito", "system-ui", sans-serif',
    "--inv-font-body": '"Nunito", "system-ui", sans-serif',

    "--inv-bg": "#fdf3f6",
    "--inv-bg-alt": "#fbe3ec",
    "--inv-bg-alt2": "#fff9fb",
    "--inv-surface": "#fff8fb",
    "--inv-card": "#fdf3f6",
    "--inv-overlay": "#432c3d",
    "--inv-on-accent": "#432c3d",
    "--inv-primary": "#c98ba8",
    "--inv-primary-light": "#e6bcd0",
    "--inv-primary-dark": "#b06f92",
    "--inv-primary-deep": "#8f5375",
    "--inv-text": "#5a3d50",
    "--inv-text-soft": "#7a5a6e",
    "--inv-text-muted": "#9a7a8e",
    "--inv-text-dim": "#b9a0ae",
    "--inv-text-light": "#d6c3cd",
    "--inv-accent": "#7fc8b8",
    "--inv-accent-border": "#d9f1ea",
    "--inv-accent-border-strong": "#b5e3d6",
    "--inv-accent-solid": "#9fd8c9",
    "--inv-ring": "#fdeff4",
    "--inv-radial-a": "rgba(231, 167, 195, 0.30)",
    "--inv-radial-b": "rgba(255, 249, 251, 0.55)",
    "--inv-radial-c": "rgba(231, 167, 195, 0.18)",
    "--inv-shadow-soft": "rgba(143, 83, 117, 0.16)",
    "--inv-shadow-card": "rgba(143, 83, 117, 0.13)",
    "--inv-shadow-mid": "rgba(143, 83, 117, 0.11)",
    "--inv-shadow-ring": "rgba(201, 139, 168, 0.5)",
    "--inv-gold-gradient":
      "linear-gradient(180deg, #fde3ee 0%, #e9b6cd 35%, #c98ba8 68%, #a86a8c 100%)",
    "--inv-hero-fallback":
      "linear-gradient(165deg, #fde9f1 0%, #f7d2e0 45%, #eeb8d0 78%, #d7ecdf 100%)",
  },
  fonts: {
    display: "font-inv-display",
    heading: "font-inv-heading",
    script: "font-inv-script",
    serif: "font-inv-serif",
    body: "font-inv-body",
  },
  ornaments: { corners: true, divider: "flor" },
  labels: {
    rsvp: "Confirma tu asistencia",
    countdown: "Faltan",
    message: "Un mensaje para ustedes",
    itinerary: "Nuestro Itinerario",
    locations: "Cómo Llegar",
    gallery: "Nuestros Mejores Recuerdos",
    dressCode: "Código de Vestimenta",
    withLove: "Con cariño",
    registryEyebrow: "Baby shower",
    registryTitle: "Regalos",
    genderLabel: (gender) =>
      gender === "niño" ? "¡Es un niño!" : gender === "niña" ? "¡Es una niña!" : "¡Es una sorpresa!",
    familyGreeting: (family) =>
      `Familia ${family}, cuéntanos quiénes podrán acompañarnos.`,
    defaultMessage: (family) =>
      `Familia ${family}, queremos compartir con ustedes la llegada de nuestro bebé. Su compañía será nuestro mejor regalo.`,
  },
};