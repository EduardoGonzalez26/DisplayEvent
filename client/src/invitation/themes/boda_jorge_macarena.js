// Tema "boda_jorge_macarena" — Boda de Jorge & Macarena. Replica la
// estructura de "boda" (mismo set de vars, labels, resolvers y opening) con
// una paleta propia: botánica, vibrante y muy elegante, inspirada en la flor
// de granada, la bugambilia, el cempasúchil y la flora de la Ciudad de México.
// Estética de "revista de bodas de alta costura": fondo marfil amplio
// (whitespace), acentos vibrantes nunca saturados y tipografía editorial.

export const boda_jorge_macarena = {
  id: "boda_jorge_macarena",
  label: "Boda de Jorge & Macarena",
  description:
    "Botánica vibrante y elegante: granada, bugambilia y cempasúchil sobre marfil cálido.",
  vars: {
    "--inv-font-display": '"Playfair Display", "Georgia", serif',
    "--inv-font-heading": '"Playfair Display", "Georgia", serif',
    "--inv-font-script": '"Great Vibes", "Brush Script MT", cursive',
    "--inv-font-serif": '"Playfair Display", "Georgia", serif',
    "--inv-font-body": '"Lato", "system-ui", sans-serif',

    // Marfil cálido (fondo) + verde botánico (lectura y títulos secundarios).
    "--inv-bg": "#FDFBF7",
    "--inv-bg-alt": "#F7F3EA",
    "--inv-bg-alt2": "#FFFFFF",
    "--inv-surface": "#FFFFFF",
    "--inv-card": "#FFFFFF",
    // Overlay OSCURO: es el backdrop del modal de Rsvp. El overlay marfil del
    // Hero se aplica directamente en Hero.jsx.
    "--inv-overlay": "#14251C",
    "--inv-on-accent": "#FDFBF7",

    // Acento naranja granada: botones, divisores gruesos e íconos destacados.
    // Es el que colorea los botones de shared/Gifts y shared/Rsvp.
    "--inv-primary": "#E76F51",
    "--inv-primary-light": "#F0947A",
    "--inv-primary-dark": "#C9563A",
    "--inv-primary-deep": "#A8432C",

    // Texto (verde bosque, jerarquía).
    "--inv-text": "#2C4C3B",
    "--inv-text-soft": "#3E5C4B",
    "--inv-text-muted": "#5D7A69",
    "--inv-text-dim": "#7C9685",
    "--inv-text-light": "#A3B8AC",

    // Verde botánico como acento secundario. `--inv-accent-solid` usado en el
    // estado "No asistirá" de Rsvp: con `--inv-on-accent` marfil da contraste
    // AA cómodo (verde oscuro + marfil).
    "--inv-accent": "#2C4C3B",
    "--inv-accent-solid": "#2C4C3B",
    "--inv-accent-border": "#E7E2D5",
    "--inv-accent-border-strong": "#CCC5B4",

    // Acentos de flora mexicana.
    "--inv-accent-pink": "#C2436A",
    "--inv-accent-yellow": "#E5B15D",
    "--inv-botanical": "#2C4C3B",
    "--inv-script-pink": "#C2436A",
    "--inv-accent-orange": "#E76F51",

    "--inv-ring": "#F4EEE1",
    "--inv-radial-a": "rgba(44, 76, 59, 0.10)",
    "--inv-radial-b": "rgba(194, 67, 106, 0.07)",
    "--inv-radial-c": "rgba(229, 177, 93, 0.10)",

    // Sombras muy suaves teñidas de verde (~5%).
    "--inv-shadow-soft": "rgba(44, 76, 59, 0.06)",
    "--inv-shadow-card": "rgba(44, 76, 59, 0.05)",
    "--inv-shadow-mid": "rgba(44, 76, 59, 0.08)",
    "--inv-shadow-ring": "rgba(230, 112, 81, 0.20)",
    "--inv-shadow-deep": "rgba(44, 76, 59, 0.12)",
    "--inv-shadow-gold": "rgba(229, 177, 93, 0.22)",

    // Gradiente cálido botánico para los títulos compartidos que aún usan
    // `text-gold-gradient` (títulos de Rsvp/Gifts, loaders). Amarillo →
    // naranja → rosa para armonizar con la paleta.
    "--inv-gold-gradient":
      "linear-gradient(180deg, #E5B15D 0%, #E76F51 55%, #C2436A 100%)",

    // Portada clara: degradado marfil suave como fallback cuando no hay foto.
    "--inv-hero-fallback": "linear-gradient(160deg, #FDFBF7 0%, #F6EBDD 100%)",
    "--inv-hero-ink": "#2C4C3B",
    "--inv-hero-ink-soft": "#3E5C4B",
    "--inv-hero-ink-muted": "#5D7A69",
    // Acentos del hero (líneas finas, kicker, scroll cue): naranja granada.
    "--inv-hero-gold": "#E76F51",

    // Sobre de apertura — paleta botánica sobre marfil (solapa verde, sello
    // rosa/naranja, bordes amarillos, tinta verde). Se conservan los NOMBRES
    // de las variables para no romper EnvelopeLoader.jsx ni los fallbacks de
    // otros formatos; solo cambian los VALORES.
    "--inv-envelope-backdrop":
      "radial-gradient(120% 100% at 50% 0%, #FDFBF7 0%, #F7F3EA 48%, #FDFBF7 100%)",
    "--inv-envelope-body":
      "linear-gradient(180deg, #FFFFFF 0%, #F7F3EA 52%, #FDFBF7 100%)",
    "--inv-envelope-flap":
      "linear-gradient(180deg, #2C4C3B 0%, #3E5C4B 100%)",
    "--inv-envelope-flap-edge": "rgba(229, 177, 93, 0.8)",
    "--inv-envelope-border": "rgba(44, 76, 59, 0.28)",
    "--inv-envelope-border-inner": "rgba(44, 76, 59, 0.14)",
    "--inv-envelope-corner": "rgba(194, 67, 106, 0.7)",
    "--inv-envelope-accent": "#C2436A",
    "--inv-envelope-shadow":
      "0 24px 48px -20px rgba(44, 76, 59, 0.35), 0 10px 24px -12px rgba(44, 76, 59, 0.22), 0 2px 6px rgba(44, 76, 59, 0.12)",
    "--inv-envelope-card":
      "linear-gradient(165deg, #FFFFFF 0%, #FDFBF7 100%)",
    "--inv-envelope-card-border": "#E5B15D",
    "--inv-envelope-card-kicker": "#C9563A",
    "--inv-envelope-card-divider": "#E5B15D",
    "--inv-envelope-pocket-l":
      "linear-gradient(200deg, #F7F3EA 0%, #FDFBF7 100%)",
    "--inv-envelope-pocket-r":
      "linear-gradient(160deg, #F7F3EA 0%, #FDFBF7 100%)",
    "--inv-envelope-pocket-strip": "#F7F3EA",
    "--inv-envelope-seal-a": "#E76F51",
    "--inv-envelope-seal-b": "#C2436A",
    "--inv-envelope-seal-c": "#A8432C",
    "--inv-envelope-seal-glow": "rgba(230, 112, 81, 0.45)",
    "--inv-envelope-seal-shadow":
      "inset 0 0 0 1px rgba(253, 251, 247, 0.5), inset 0 -3px 4px rgba(168, 67, 44, 0.45), 0 10px 24px -8px rgba(44, 76, 59, 0.35), 0 3px 8px rgba(44, 76, 59, 0.2)",
    "--inv-envelope-ink": "#2C4C3B",
    "--inv-envelope-hint": "#C2436A",
    "--inv-envelope-hint-halo":
      "0 1px 3px rgba(253, 251, 247, 0.6), 0 0 16px rgba(194, 67, 106, 0.25)",
    "--inv-envelope-focus": "#E76F51",

    // Cuenta regresiva tipográfica sobre marfil (sin cajas): fondo transparente
    // y separadores/líneas amarillas.
    "--inv-countdown-bg": "transparent",
    "--inv-countdown-border": "#E5B15D",
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
    message: "Una carta para ustedes",
    itinerary: "Itinerario de la Celebración",
    itineraryEyebrow: "Horarios",
    itinerarySubtitle:
      "Los momentos que compartiremos en este día tan especial.",
    locations: "Cómo Llegar",
    locationsEyebrow: "Ubicaciones",
    locationsSubtitle:
      "Encuentra cada recinto de la celebración y navega directo con tu app favorita.",
    gallery: "Momentos para Recordar",
    galleryEyebrow: "Galería",
    dressCode: "Código de Vestimenta",
    dressCodeEyebrow: "Dress Code",
    withLove: "Con todo nuestro cariño",
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
