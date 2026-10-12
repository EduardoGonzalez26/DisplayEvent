// Tema "boda_jorge_macarena" — Boda de Jorge & Macarena. Rediseño editorial
// (v2) sobre papel: fondo crema, tinta cálida, tarjetas apilables con fotos
// B&N y flora de Granada (dalia, bugambilia y granado) dibujada en SVG.
//
// Se conservan los MISMOS nombres de variables `--inv-*` que ya consumen el
// layout, las secciones compartidas (Rsvp/Gifts/Countdown), el sobre y el
// loader; solo cambian los VALORES para el look nuevo. Cualquier formato
// futuro puede adoptar este diseño reutilizando el set de vars + labels.
//
// Reglas del contrato (no romper):
//  - `resolvers.signature` se conserva tal cual.
//  - `labels.familyGreeting` y `labels.defaultMessage` se conservan.
//  - El orden de la pareja en el diseño es novia & novio (Macarena & Jorge):
//    `couple.nameB` primero, `couple.nameA` después.

/* Nombres en orden de diseño (novia & novio). */
function orderedNames(cfg) {
  const couple = cfg?.couple || {};
  return [couple.nameB, couple.nameA]
    .map((n) => String(n || "").trim())
    .filter(Boolean);
}

/* Monograma sin espacios ("M&J"), a partir del orden de diseño. */
function monogramOf(cfg) {
  const initials = orderedNames(cfg)
    .map((n) => n[0].toUpperCase())
    .filter(Boolean);
  return initials.length ? initials.join("&") : "&";
}

/* Monograma con espacios ("M & J") para los pies/sellos amplios. */
function monogramSpaced(cfg) {
  const initials = orderedNames(cfg)
    .map((n) => n[0].toUpperCase())
    .filter(Boolean);
  return initials.length ? initials.join(" & ") : "&";
}

export const boda_jorge_macarena = {
  id: "boda_jorge_macarena",
  label: "Boda de Jorge & Macarena",
  description:
    "Editorial sobre papel: Cormorant Garamond, fotos B&N y flora de Granada (dalia, bugambilia y granado).",
  vars: {
    // Tipografías del diseño v2: Cormorant Garamond para display/títulos
    // (incluye la itálica como "script") y Montserrat para el cuerpo.
    "--inv-font-display": '"Cormorant Garamond", "Georgia", serif',
    "--inv-font-heading": '"Cormorant Garamond", "Georgia", serif',
    "--inv-font-script": '"Cormorant Garamond", "Georgia", serif',
    "--inv-font-serif": '"Cormorant Garamond", "Georgia", serif',
    "--inv-font-body": '"Montserrat", "system-ui", sans-serif',

    // Puente de las utilidades Tailwind (`bg-inv-*`, `text-inv-*`,
    // `font-inv-*`). El `@theme` de `index.css` declara
    // `--color-inv-*: var(--inv-*)` en `:root`, y esa sustitución se
    // resuelve UNA vez en `:root` (el override anidado de `--inv-*` no
    // atraviesa el puente). Al re-declarar aquí el puente sobre la raíz
    // del tema, las utilidades resuelven con los valores del tema para
    // todo su subárbol (incluidas las secciones compartidas como Rsvp).
    "--color-inv-bg": "var(--inv-bg)",
    "--color-inv-bg-alt": "var(--inv-bg-alt)",
    "--color-inv-bg-alt2": "var(--inv-bg-alt2)",
    "--color-inv-surface": "var(--inv-surface)",
    "--color-inv-card": "var(--inv-card)",
    "--color-inv-overlay": "var(--inv-overlay)",
    "--color-inv-on-accent": "var(--inv-on-accent)",
    "--color-inv-primary": "var(--inv-primary)",
    "--color-inv-primary-light": "var(--inv-primary-light)",
    "--color-inv-primary-dark": "var(--inv-primary-dark)",
    "--color-inv-primary-deep": "var(--inv-primary-deep)",
    "--color-inv-text": "var(--inv-text)",
    "--color-inv-text-soft": "var(--inv-text-soft)",
    "--color-inv-text-muted": "var(--inv-text-muted)",
    "--color-inv-text-dim": "var(--inv-text-dim)",
    "--color-inv-text-light": "var(--inv-text-light)",
    "--color-inv-accent": "var(--inv-accent)",
    "--color-inv-accent-border": "var(--inv-accent-border)",
    "--color-inv-accent-border-strong": "var(--inv-accent-border-strong)",
    "--color-inv-accent-solid": "var(--inv-accent-solid)",
    "--color-inv-ring": "var(--inv-ring)",
    "--font-inv-display": "var(--inv-font-display)",
    "--font-inv-heading": "var(--inv-font-heading)",
    "--font-inv-script": "var(--inv-font-script)",
    "--font-inv-serif": "var(--inv-font-serif)",
    "--font-inv-body": "var(--inv-font-body)",

    // Papel: crema de fondo, hojas claras y tarjetas blancas.
    "--inv-bg": "#F6F2EB",
    "--inv-bg-alt": "#FBF8F3",
    "--inv-bg-alt2": "#F7F2EA",
    "--inv-surface": "#FFFDF9",
    "--inv-card": "#F3EDE3",
    "--inv-overlay": "#1C1B19",
    "--inv-on-accent": "#FAF7F2",

    // Tinta cálida. `primary` vive en el gris cálido profundo para que los
    // eyebrows/bordes de las secciones compartidas conserven AA; los botones
    // primarios degradan a tinta casi negra (#1C1B19).
    "--inv-primary": "#4A4641",
    "--inv-primary-light": "#6B6660",
    "--inv-primary-dark": "#1C1B19",
    "--inv-primary-deep": "#0E0D0C",

    "--inv-text": "#1C1B19",
    "--inv-text-soft": "#3A3733",
    "--inv-text-muted": "#6B6660",
    "--inv-text-dim": "#8C857B",
    "--inv-text-light": "#B9B0A2",

    // Superficies de estado (Rsvp: "No asistirá" usa `accent-solid` como
    // fondo con texto `on-accent`: gris cálido ≈4.9:1, AA).
    "--inv-accent": "#1C1B19",
    "--inv-accent-solid": "#6B6660",
    "--inv-accent-border": "#DCD2C2",
    "--inv-accent-border-strong": "#CFC7BA",

    // Acentos de flora (compatibilidad con el set anterior).
    "--inv-accent-pink": "#C85A82",
    "--inv-accent-yellow": "#D39A2E",
    "--inv-accent-orange": "#C8553A",
    "--inv-botanical": "#6B6660",
    "--inv-script-pink": "#C85A82",

    // Flora SVG del diseño v2 (flor de dalia, bugambilia y granado) y
    // ramillete: cada pieza toma su color de aquí con fallback al mock.
    "--inv-flor-dalia": "#F6DC95",
    "--inv-flor-dalia-2": "#EDBA4A",
    "--inv-flor-dalia-line": "#D39A2E",
    "--inv-flor-dalia-core": "#C98A22",
    "--inv-flor-bug": "#F4C9D7",
    "--inv-flor-bug-line": "#C85A82",
    "--inv-flor-bug-heart": "#FFF8E6",
    "--inv-flor-bug-heart-line": "#E0A93A",
    "--inv-flor-gra": "#F2A68A",
    "--inv-flor-gra-line": "#C8553A",
    "--inv-flor-gra-crown": "#D2603F",
    "--inv-flor-gra-crown-line": "#A8432F",
    "--inv-flor-gra-stamen": "#E8AE3A",
    "--inv-flor-gra-stamen-line": "#B5482F",
    "--inv-stem": "#2B2926",
    "--inv-leaf": "#FAF7F2",

    "--inv-ring": "rgba(28, 27, 25, 0.16)",
    "--inv-radial-a": "rgba(211, 154, 46, 0.10)",
    "--inv-radial-b": "rgba(200, 90, 130, 0.07)",
    "--inv-radial-c": "rgba(60, 40, 20, 0.06)",

    // Sombras cálidas (profundidad real sobre papel claro).
    "--inv-shadow-soft": "rgba(50, 35, 20, 0.16)",
    "--inv-shadow-card": "rgba(50, 35, 20, 0.22)",
    "--inv-shadow-mid": "rgba(50, 35, 20, 0.28)",
    "--inv-shadow-ring": "rgba(28, 27, 25, 0.22)",
    "--inv-shadow-deep": "rgba(0, 0, 0, 0.50)",
    "--inv-shadow-gold": "rgba(211, 154, 46, 0.28)",

    // Títulos que aún usan `text-gold-gradient` (secciones compartidas): en
    // este tema el "dorado" es tinta cálida degradada para conservar el look
    // editorial (nada de dorados).
    "--inv-gold-gradient":
      "linear-gradient(180deg, #4A4641 0%, #1C1B19 55%, #000000 100%)",
    "--inv-gold-gradient-deep":
      "linear-gradient(180deg, #3A3733 0%, #1C1B19 60%, #000000 100%)",

    // Portada nocturna del diseño v2 (foto B&N con scrim oscuro).
    "--inv-hero-fallback": "linear-gradient(180deg, #1C1B19 0%, #0E0D0C 100%)",
    "--inv-hero-ink": "#FAF7F2",
    "--inv-hero-ink-soft": "#EFE8DC",
    "--inv-hero-ink-muted": "#E6DFD3",
    "--inv-hero-gold": "#CFC7BA",

    // Scrim de las fotos B&N de las tarjetas: papel claro del tema, de modo
    // que la tinta salga legible sobre la foto (patrón StackCard/SectionPhoto).
    "--inv-photo-scrim": "#FBF8F3",

    // Cuenta regresiva (secciones compartidas; el hero pinta la suya).
    "--inv-countdown-bg": "transparent",
    "--inv-countdown-border": "#CFC7BA",

    // Sobre editorial (loader compartido re-estilizado por vars): papel
    // crema, solapa tostada y sello lacre oscuro.
    "--inv-envelope-backdrop": "#F6F2EB",
    "--inv-envelope-body": "#ECE4D6",
    "--inv-envelope-flap": "#EAE1D2",
    "--inv-envelope-flap-edge": "#DCD2C2",
    "--inv-envelope-border": "#DCD2C2",
    "--inv-envelope-border-inner": "#E2DACD",
    "--inv-envelope-corner": "#CFC7BA",
    "--inv-envelope-accent": "#8C857B",
    "--inv-envelope-shadow":
      "0 30px 50px -28px rgba(50, 35, 20, 0.35), 0 2px 6px rgba(50, 35, 20, 0.08)",
    "--inv-envelope-card": "#FFFDF9",
    "--inv-envelope-card-border": "#DCD2C2",
    "--inv-envelope-card-kicker": "#6B6660",
    "--inv-envelope-card-divider": "#DCD2C2",
    "--inv-envelope-pocket-l": "#F3ECE1",
    "--inv-envelope-pocket-r": "#F3ECE1",
    "--inv-envelope-pocket-strip": "#F3ECE1",
    "--inv-envelope-seal-a": "#55504B",
    "--inv-envelope-seal-b": "#262422",
    "--inv-envelope-seal-c": "#1A1817",
    "--inv-envelope-seal-glow": "rgba(28, 27, 25, 0.16)",
    "--inv-envelope-seal-shadow":
      "0 4px 10px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.4), inset 0 2px 3px rgba(255, 255, 255, 0.12)",
    "--inv-envelope-ink": "#EFE8DC",
    "--inv-envelope-hint": "#4A4641",
    "--inv-envelope-hint-halo": "none",
    "--inv-envelope-focus": "#1C1B19",
  },
  // Experiencia de apertura: sobre editorial (sobre → solapa → sello → hoja →
  // transición a la página). `envelopeVariant: "editorial"` selecciona el
  // componente dedicado en InvitationView; el resto de formatos conservan el
  // sobre compartido sin cambios.
  opening: {
    envelope: true,
    envelopeVariant: "editorial",
    cardText: (cfg) => monogramSpaced(cfg),
    sealText: () => "&",
    editorial: {
      kicker: "Una invitación para",
      letterKicker: "Nos casamos",
      hint: "Toca para abrir",
      familyPrefix: "la Familia",
      names: (cfg) => orderedNames(cfg).join(" & ") || "&",
      monogram: (cfg) => monogramOf(cfg),
    },
  },
  labels: {
    // Portada y navegación (pill inferior + música).
    heroEyebrow: "Nos casamos",
    heroScroll: "Desliza",
    navLocations: "Ubicación",
    navGift: "Regalo",
    navRsvp: "Confirmar",
    musicOn: "Encender música",
    musicOff: "Apagar música",

    // Nuestra historia.
    storyEyebrow: "Nuestra historia",
    // Vacío a propósito: si no se define, la sección usa `event.place` como
    // título editorial (mismo patrón del mock: "Granada y Ciudad de México").
    storyTitle: "",

    // Ceremonia / recepción (una tarjeta por item de `cfg.locations`).
    locationEyebrows: ["Ceremonia religiosa", "Recepción y fiesta"],
    locationsEyebrow: "Ceremonia y recepción",
    locations: "Cómo llegar",
    locationTimeLabel: "Hora",

    // Itinerario.
    itineraryEyebrow: "Itinerario del día",
    itinerary: "Itinerario",

    // Vestimenta.
    dressCodeEyebrow: "Código de vestimenta",
    dressCode: "Código de Vestimenta",

    // Regalo (nota + Mesa de Regalos comparten tarjeta).
    registryEyebrow: "Regalo",
    registryTitle: "Mesa de Regalos",
    withLove: "Con todo nuestro cariño",
    giftIntro:
      "Su presencia es nuestro mejor regalo, pero si desean tener un detalle con nosotros, una aportación nos ayudará a construir nuestra vida juntos.",
    giftBankTitleMxn: "Desde México",
    giftBankTitleEur: "Desde España",

    // Confirmación de asistencia (shared/Rsvp).
    rsvpEyebrow: "Confirmación de asistencia",
    rsvp: "Confirma tu asistencia",
    rsvpHelp: "Marquen la asistencia de cada persona para continuar.",

    // Hospedaje y viaje.
    lodgingEyebrow: "Hospedaje y viaje",
    lodgingTitle: "Dónde quedarse",
    lodgingMapLink: "Mapa",
    travelAirportLabel: "Aeropuerto más cercano",

    // Cierre.
    closingQuote: "Dos ciudades, un mismo camino.",

    // Compatibilidad con la estructura anterior del tema.
    countdown: "Faltan",
    message: "Nuestra historia",

    // Conservados por contrato (shared/Rsvp los consume).
    familyGreeting: (family) =>
      `Familia ${family}, cuéntanos quiénes podrán acompañarnos.`,
    defaultMessage: (family) =>
      `Familia ${family}, queremos compartir con ustedes la alegría de este día tan especial. Será un honor contar con su presencia.`,
  },
  resolvers: {
    // Firma al pie del mensaje: nombres de la pareja unidos con " & ",
    // si no `celebrants`. (Conservado por contrato.)
    signature: (cfg) => {
      const couple = cfg.couple || {};
      return [couple.nameA, couple.nameB].filter(Boolean).join(" & ") || null;
    },
  },
};
