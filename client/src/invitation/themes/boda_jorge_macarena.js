// Tema "boda_jorge_macarena" — Boda de Jorge & Macarena. Replica la
// estructura de "boda" (mismo set de vars, labels, resolvers y opening) con
// una paleta propia: botánica nocturna y muy elegante, inspirada en la flor
// de granada, la bugambilia, el cempasúchil y la flora de la Ciudad de México.
// Estética de "revista de bodas de alta costura": fondos verde-noche
// profundos, tipografía marfil y acentos vibrantes nunca saturados que
// brillan sobre la oscuridad. Las fotos de `cfg.gallery` se usan como fondo
// B&N de la portada y de todas las tarjetas (scrim oscuro del tema).

export const boda_jorge_macarena = {
  id: "boda_jorge_macarena",
  label: "Boda de Jorge & Macarena",
  description:
    "Botánica nocturna y elegante: granada, bugambilia y cempasúchil sobre verde noche.",
  vars: {
    "--inv-font-display": '"Playfair Display", "Georgia", serif',
    "--inv-font-heading": '"Playfair Display", "Georgia", serif',
    "--inv-font-script": '"Great Vibes", "Brush Script MT", cursive',
    "--inv-font-serif": '"Playfair Display", "Georgia", serif',
    "--inv-font-body": '"Lato", "system-ui", sans-serif',

    // Verde noche (fondo) con tarjetas ligeramente más claras para conservar
    // la jerarquía de "carta panel por panel" sin translucidez.
    "--inv-bg": "#0F1B15",
    "--inv-bg-alt": "#14231B",
    "--inv-bg-alt2": "#0A130F",
    "--inv-surface": "#182820",
    "--inv-card": "#1C2E24",
    // Overlay casi negro: backdrop de los modales de Rsvp/Gifts.
    "--inv-overlay": "#050A07",
    "--inv-on-accent": "#FDFBF7",

    // Acento naranja granada: botones, divisores gruesos e íconos destacados.
    // Es el que colorea los botones de shared/Gifts y shared/Rsvp.
    "--inv-primary": "#E76F51",
    "--inv-primary-light": "#F0947A",
    "--inv-primary-dark": "#C9563A",
    "--inv-primary-deep": "#A8432C",

    // Texto marfil (jerarquía). `muted` se aclara ~8% respecto al valor de
    // partida (#C7BEAE) para que el texto pequeño conserve AA incluso sobre
    // el punto más claro del scrim de foto (foto blanca + scrim 72%).
    "--inv-text": "#FDFBF7",
    "--inv-text-soft": "#EAE4D6",
    "--inv-text-muted": "#D0C7B7",
    "--inv-text-dim": "#A69C8A",
    "--inv-text-light": "#807868",

    // Verde botánico oscuro como acento secundario de SUPERFICIE (hover de
    // botones, estado "No asistirá" de Rsvp): debe seguir dando AA con
    // `--inv-on-accent` marfil (≈6.8:1). El verde decorativo aclarado vive
    // en `--inv-botanical`.
    "--inv-accent": "#37624A",
    "--inv-accent-solid": "#37624A",
    "--inv-accent-border": "rgba(253, 251, 247, 0.14)",
    "--inv-accent-border-strong": "rgba(253, 251, 247, 0.22)",

    // Acentos de flora mexicana aclarados para brillar sobre verde noche.
    "--inv-accent-pink": "#E8799C",
    "--inv-accent-yellow": "#E5B15D",
    "--inv-botanical": "#A9C3AF",
    "--inv-script-pink": "#E8799C",
    "--inv-accent-orange": "#E76F51",

    "--inv-ring": "rgba(253, 251, 247, 0.16)",
    "--inv-radial-a": "rgba(169, 195, 175, 0.10)",
    "--inv-radial-b": "rgba(232, 121, 156, 0.07)",
    "--inv-radial-c": "rgba(229, 177, 93, 0.09)",

    // Sombras con base negra (profundidad real sobre fondos oscuros).
    "--inv-shadow-soft": "rgba(0, 0, 0, 0.40)",
    "--inv-shadow-card": "rgba(0, 0, 0, 0.35)",
    "--inv-shadow-mid": "rgba(0, 0, 0, 0.45)",
    "--inv-shadow-ring": "rgba(231, 111, 81, 0.35)",
    "--inv-shadow-deep": "rgba(0, 0, 0, 0.60)",
    "--inv-shadow-gold": "rgba(229, 177, 93, 0.28)",

    // Gradiente cálido botánico para los títulos compartidos que aún usan
    // `text-gold-gradient` (títulos de Rsvp/Gifts, loaders, monograma del
    // sobre). Aclarado para conservar AA sobre verde noche.
    "--inv-gold-gradient":
      "linear-gradient(180deg, #F2C97E 0%, #E5B15D 38%, #E76F51 72%, #E8799C 100%)",

    // Portada nocturna: degradado verde-noche como fallback cuando no hay
    // foto; tinta marfil y acento rosa/naranja.
    "--inv-hero-fallback": "linear-gradient(160deg, #0A130F 0%, #14231B 45%, #1B2F24 100%)",
    "--inv-hero-ink": "#FDFBF7",
    "--inv-hero-ink-soft": "#EAE4D6",
    "--inv-hero-ink-muted": "#D0C7B7",
    "--inv-hero-gold": "#E8799C",

    // Sobre de apertura — versión nocturna (backdrop oscuro, cuerpo
    // verde-carbón, solapa con contraste, tarjeta oscura con tinta marfil,
    // sello rosa/naranja y bordes claros suaves). Se conservan los NOMBRES
    // de las variables para no romper EnvelopeLoader.jsx ni los fallbacks de
    // otros formatos; solo cambian los VALORES.
    "--inv-envelope-backdrop":
      "radial-gradient(120% 100% at 50% 0%, #16281F 0%, #0A130F 48%, #060C09 100%)",
    "--inv-envelope-body":
      "linear-gradient(180deg, #20342A 0%, #16281F 52%, #0F1B15 100%)",
    "--inv-envelope-flap":
      "linear-gradient(180deg, #2A4636 0%, #1B2F24 100%)",
    "--inv-envelope-flap-edge": "rgba(229, 177, 93, 0.85)",
    "--inv-envelope-border": "rgba(253, 251, 247, 0.18)",
    "--inv-envelope-border-inner": "rgba(253, 251, 247, 0.10)",
    "--inv-envelope-corner": "rgba(229, 177, 93, 0.75)",
    "--inv-envelope-accent": "#E5B15D",
    "--inv-envelope-shadow":
      "0 24px 48px -20px rgba(0, 0, 0, 0.65), 0 10px 24px -12px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.4)",
    "--inv-envelope-card":
      "linear-gradient(165deg, #203528 0%, #14231B 100%)",
    "--inv-envelope-card-border": "#E5B15D",
    "--inv-envelope-card-kicker": "#E8799C",
    "--inv-envelope-card-divider": "#E5B15D",
    "--inv-envelope-pocket-l":
      "linear-gradient(200deg, #1E3227 0%, #101C16 100%)",
    "--inv-envelope-pocket-r":
      "linear-gradient(160deg, #1E3227 0%, #101C16 100%)",
    "--inv-envelope-pocket-strip": "#14231B",
    "--inv-envelope-seal-a": "#F0A184",
    "--inv-envelope-seal-b": "#E76F51",
    "--inv-envelope-seal-c": "#B23A2C",
    "--inv-envelope-seal-glow": "rgba(231, 111, 81, 0.45)",
    "--inv-envelope-seal-shadow":
      "inset 0 0 0 1px rgba(253, 251, 247, 0.35), inset 0 -3px 4px rgba(122, 36, 22, 0.5), 0 10px 24px -8px rgba(0, 0, 0, 0.6), 0 3px 8px rgba(0, 0, 0, 0.45)",
    "--inv-envelope-ink": "#2A1108",
    "--inv-envelope-hint": "#E8799C",
    "--inv-envelope-hint-halo":
      "0 1px 3px rgba(0, 0, 0, 0.65), 0 0 16px rgba(232, 121, 156, 0.35)",
    "--inv-envelope-focus": "#E5B15D",

    // Cuenta regresiva tipográfica sobre verde noche (sin cajas): fondo
    // transparente y separadores/líneas doradas.
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
