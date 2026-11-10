import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar el .env del servidor ANTES de importar el pool de la base de datos.
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

const { pool, query } = await import("../db/index.js");

// Seed del evento 2 (Boda Macarena & Jorge) al contrato del diseño v3.
// Idempotente y no destructivo: hace merge del JSONB `invitation` y conserva
// las claves que no se listan aquí (music_url, slug/custom_domain viven en la
// tabla, no en el JSON). Por defecto es dry-run; escribe solo con --apply.
//
// Uso:
//   node src/scripts/update-event-macarena-v3.js           (dry-run)
//   node src/scripts/update-event-macarena-v3.js --apply   (escribe)

const APPLY = process.argv.includes("--apply");
const IMAGES = "invitations/macarena-jorge-v3";

const STORY = [
  "A nuestra familia y amigos, gracias por acompañarnos en este capítulo tan importante de nuestra historia. A quienes nos acompañáis desde España, gracias por compartir con nosotros esta ciudad tan mágica. Y a todos los que cruzarán el charco desde México dejando el corazón en cada kilómetro de vuelo, y a los que vienen de otras partes del mundo: ¡gracias infinitas!",
  "El tequila y la cerveza Alhambra corren por nuestra cuenta. ¡A celebrar!",
].join("\n\n");

const ICEBREAKER_TEXT =
  "Dos días antes de la boda nos reuniremos de manera informal para brindar, romper el hielo y que nuestras familias y amigos de ambos lados del charco se conozcan.";

const RECOMMENDATIONS = [
  {
    icon: "shoe",
    title: "Calzado",
    text: "Para ellas, os recomendamos tacón bajo o ancho: de la iglesia al Carmen iremos caminando por calles empedradas.",
  },
  {
    icon: "weather",
    title: "Clima",
    text: "Granada es de contrastes: de día hace calor y por la noche puede refrescar bastante. Traed algo para abrigaros.",
  },
  {
    icon: "transport",
    title: "Transporte",
    text: "Por los acontecimientos recientes, de momento no recomendamos viajar en tren. Os sugerimos avión, autobús o alquilar un coche.",
  },
  {
    icon: "taxi",
    title: "Moverse por Granada",
    text: "Dentro de la ciudad es más práctico usar **PideTaxi**, el servicio de taxis por WhatsApp, que Uber. Teléfono: {phone}. También podéis bajar su app en App Store o Google Play.",
    phone: "+34 958 28 00 00",
  },
  {
    icon: "stay",
    title: "Alojamiento",
    text: "Os recomendamos alojaros en el Albaicín o sus alrededores: estaréis a un paseo de la iglesia y del Carmen.",
  },
];

const LOCATIONS = [
  {
    label: "San Pedro y San Pablo",
    place: "Carrera del Darro, 2 · Granada",
    url: "https://www.google.com/maps/search/?api=1&query=Iglesia%20de%20San%20Pedro%20y%20San%20Pablo%2C%20Carrera%20del%20Darro%202%2C%20Granada",
    description:
      "Daremos el «sí, quiero» en la iglesia de San Pedro y San Pablo, en la Carrera del Darro, a diez minutos a pie del Carmen de los Chapiteles.",
    time_label: "Hora",
    time_value: "18:00 h",
    when_label: "",
    when_value: "",
    image: `${IMAGES}/c-iglesia.webp`,
    map_image: `${IMAGES}/m-ceremonia.webp`,
  },
  {
    label: "Carmen de los Chapiteles",
    place: "Camino de la Fuente del Avellano, 4 · Granada",
    url: "https://www.google.com/maps/search/?api=1&query=Carmen%20de%20los%20Chapiteles%2C%20Camino%20de%20la%20Fuente%20del%20Avellano%204%2C%2018010%20Granada%2C%20Espa%C3%B1a",
    description:
      "Al salir de la iglesia caminaremos juntos hasta el Carmen de los Chapiteles, un rincón junto al río Darro con vistas al Albaicín y a la Alhambra, donde seguirá la celebración.",
    time_label: "Hora",
    time_value: "7:30 p.m.",
    when_label: "Cuándo",
    when_value: "Al salir de la iglesia",
    image: `${IMAGES}/c-alhambra.webp`,
    map_image: `${IMAGES}/m-recepcion.webp`,
  },
];

const LODGING = [
  {
    name: "Hotel Alhambra Palace",
    note: "Un clásico de Granada, con vistas a la ciudad desde la colina de la Alhambra.",
    url: "https://www.google.com/maps/search/?api=1&query=Hotel%20Alhambra%20Palace%2C%20Granada",
  },
  {
    name: "Parador de Granada",
    note: "Dentro del recinto de la Alhambra, en un antiguo convento.",
    url: "https://www.google.com/maps/search/?api=1&query=Parador%20de%20Granada",
  },
];

const STAY = {
  enabled: true,
  intro:
    "Granada se disfruta sin prisa. Os recomendamos el Albaicín y sus alrededores, a un paseo de la iglesia y del Carmen. Aquí tenéis nuestros hoteles favoritos y buscadores para encontrar más opciones.",
  zone: {
    lat: 37.181,
    lng: -3.592,
    radius_km: 1.2,
    label: "Albaicín, Granada",
  },
  checkin: "2027-06-08",
  checkout: "2027-06-12",
  cards: [
    {
      id: "booking",
      platform: "booking",
      title: "Booking.com",
      description: "Hoteles, apartamentos y casas en el Albaicín y alrededores.",
      url: "",
      auto: true,
    },
    {
      id: "airbnb",
      platform: "airbnb",
      title: "Airbnb",
      description: "Alojamientos completos y habitaciones en Granada.",
      url: "",
      auto: true,
    },
    {
      id: "trivago",
      platform: "trivago",
      title: "Trivago",
      description: "Compara precios de hoteles en Granada.",
      url: "",
      auto: true,
    },
    {
      id: "google_hotels",
      platform: "google_hotels",
      title: "Google Hotels",
      description: "Busca hoteles y compara opciones cerca de la zona.",
      url: "",
      auto: true,
    },
  ],
  quote:
    "«Dale limosna, mujer,\nque no hay en la vida nada\ncomo la pena de ser\nciego en Granada.»",
  quote_author: "Poeta mexicano: Francisco de Icaza",
};

const TRIP = {
  enabled: true,
  intro:
    "Si venís desde México, aquí tenéis las mejores opciones para llegar a Granada. Elegid vuestra ciudad de salida y las fechas: los buscadores se actualizan solos.",
  origins: [
    { code: "MEX", label: "CDMX – Benito Juárez" },
    { code: "NLU", label: "CDMX – AIFA" },
    { code: "GDL", label: "Guadalajara" },
    { code: "MTY", label: "Monterrey" },
  ],
  arrivals: [{ code: "MAD", label: "Madrid" }],
  date_from: "2027-06-08",
  date_to: "2027-06-12",
  adults: 1,
  modes: {
    flight: {
      enabled: true,
      note: "Vuelo internacional a Madrid y, desde ahí, conexión a Granada.",
      providers: ["google_flights", "skyscanner", "kayak", "iberia", "aeromexico"],
    },
    train: {
      enabled: false,
      note: "",
      providers: [],
    },
    bus: {
      enabled: true,
      note: "Desde Madrid, autobús directo a Granada: más económico, aunque el trayecto es más largo.",
      providers: ["alsa", "omio", "flixbus"],
    },
  },
};

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

// Construye el parche que se aplicará con `invitation || $patch`. `registry`
// se compone a partir del valor actual para no perder enabled/stripe_enabled/
// payment_link_url ni los montos sugeridos que ya existan.
function buildPatch(current) {
  const invitation = asObject(current);
  const currentRegistry = asObject(invitation.registry);

  return {
    template: "boda_jorge_macarena",
    version: 2,
    couple: { nameA: "Jorge", nameB: "Macarena" },
    story: STORY,
    icebreaker: {
      enabled: true,
      eyebrow: "Antes del gran día",
      title: "Icebreaker",
      text: ICEBREAKER_TEXT,
      date_label: "Martes 8 de junio",
      time_place_label: "Por confirmar",
    },
    recommendations: {
      enabled: true,
      eyebrow: "Para que todo salga perfecto",
      title: "Recomendaciones",
      image: `${IMAGES}/c-p10.webp`,
      items: RECOMMENDATIONS,
    },
    locations: LOCATIONS,
    dress_code: [{ label: "Formal" }],
    dress_note: "Queremos veros guapísimos.",
    itinerary: [],
    gallery: [],
    hero_image: "",
    contacts: [],
    og_image: `${IMAGES}/og-v3.jpg`,
    lodging: LODGING,
    stay: STAY,
    trip: TRIP,
    registry: {
      ...currentRegistry,
      allow_custom: true,
      min_mxn: 2000,
      min_eur: 100,
      bank: {
        enabled: true,
        bank_name: "BBVA",
        holder: "Jorge Luis Gómez López",
        account_number: "0461843389",
        clabe: "012180004618433892",
        concept: "Regalo Jorge Macarena",
      },
      bank_eur: {
        enabled: false,
        bank_name: "",
        holder: "",
        account_number: "",
        clabe: "",
        concept: "",
      },
    },
    rsvp_editable: true,
    rsvp_edit_deadline: "2027-02-21T14:00:00+01:00",
    // Preserva la música existente; si no había, queda vacía.
    music_url: typeof invitation.music_url === "string" ? invitation.music_url : "",
  };
}

function verifyEvent(row) {
  const invitation = asObject(row.invitation);
  const couple = asObject(invitation.couple);
  const pair = [couple.nameA, couple.nameB].map((v) => String(v || "").toLowerCase());

  const nameMatches = /macarena/i.test(row.name) && /jorge/i.test(row.name);
  const coupleMatches = pair.includes("macarena") && pair.includes("jorge");

  if (!nameMatches && !coupleMatches) {
    throw new Error(
      `El evento ${row.id} ("${row.name}") no parece ser la boda de Macarena & Jorge. No se toca nada.`
    );
  }
}

async function findEvent() {
  const rows = await query(
    `SELECT id, name, date::text AS date, invitation
       FROM events
      WHERE id = 2
         OR (name ILIKE '%Macarena%' AND name ILIKE '%Jorge%')
      ORDER BY (id = 2) DESC, id ASC`
  );

  if (rows.length === 0) {
    throw new Error("No se encontró el evento de Macarena & Jorge (ni id 2 ni nombre coincidente).");
  }

  // Preferimos id 2; si no existe, solo aceptamos una coincidencia inequívoca.
  const event = rows.find((row) => row.id === 2) || rows[0];
  if (!rows.find((row) => row.id === 2) && rows.length > 1) {
    throw new Error(
      `Hay varios eventos candidatos (${rows.map((row) => `${row.id}: ${row.name}`).join(", ")}). ` +
        "Renombra/verifica el evento correcto antes de ejecutar."
    );
  }

  verifyEvent(event);
  return event;
}

// Comprobación de lectura posterior: las claves críticas del diseño v3.
function verifyResult(invitation) {
  const cfg = asObject(invitation);
  const checks = {
    template: cfg.template === "boda_jorge_macarena",
    version: cfg.version === 2,
    couple: asObject(cfg.couple).nameA === "Jorge" && asObject(cfg.couple).nameB === "Macarena",
    story: typeof cfg.story === "string" && cfg.story.includes("El tequila y la cerveza Alhambra"),
    icebreaker: asObject(cfg.icebreaker).enabled === true,
    recommendations:
      asObject(cfg.recommendations).image === `${IMAGES}/c-p10.webp` &&
      asObject(cfg.recommendations).items?.length === 5 &&
      asObject(cfg.recommendations).items?.some(
        (item) =>
          item.icon === "taxi" &&
          item.title === "Moverse por Granada" &&
          item.phone === "+34 958 28 00 00"
      ),
    locations: Array.isArray(cfg.locations) && cfg.locations.length === 2,
    dress_code: Array.isArray(cfg.dress_code) && cfg.dress_code[0]?.label === "Formal",
    lodging: Array.isArray(cfg.lodging) && cfg.lodging.length === 2,
    stay: asObject(cfg.stay).enabled === true && asObject(cfg.stay).checkin === "2027-06-08",
    trip: asObject(cfg.trip).enabled === true && asObject(cfg.trip).origins?.length === 4,
    registry:
      asObject(cfg.registry).allow_custom === true &&
      asObject(cfg.registry).bank?.clabe === "012180004618433892",
    rsvp_editable: cfg.rsvp_editable === true,
    rsvp_edit_deadline: cfg.rsvp_edit_deadline === "2027-02-21T14:00:00+01:00",
    og_image: cfg.og_image === `${IMAGES}/og-v3.jpg`,
  };

  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);

  if (failed.length > 0) {
    throw new Error(`Verificación posterior fallida en: ${failed.join(", ")}`);
  }
  return Object.keys(checks);
}

async function main() {
  const event = await findEvent();
  const patch = buildPatch(event.invitation);
  const merged = { ...asObject(event.invitation), ...patch };

  console.log(`Evento: ${event.id} — ${event.name}`);
  console.log(`Modo: ${APPLY ? "APPLY (escribe)" : "dry-run (no escribe)"}`);
  console.log(`Claves del parche: ${Object.keys(patch).join(", ")}`);
  console.log(
    `gift_message_email: no se toca (columna del evento, se configura desde el panel).`
  );

  if (!APPLY) {
    console.log("\n--- JSON resultante (preview del merge) ---");
    console.log(JSON.stringify(merged, null, 2));
    console.log(
      "\nDry-run: no se escribió nada. Para aplicar:\n" +
        "  cd server && node src/scripts/update-event-macarena-v3.js --apply"
    );
    return;
  }

  const updated = await query(
    `UPDATE events
        SET invitation = COALESCE(invitation, '{}'::jsonb) || $2::jsonb
      WHERE id = $1
        AND COALESCE(invitation, '{}'::jsonb) IS DISTINCT FROM (COALESCE(invitation, '{}'::jsonb) || $2::jsonb)
      RETURNING id`,
    [event.id, JSON.stringify(patch)]
  );

  const [after] = await query(`SELECT invitation FROM events WHERE id = $1`, [event.id]);
  if (!after) throw new Error(`No se pudo releer el evento ${event.id}.`);

  const verified = verifyResult(after.invitation);
  console.log(
    updated.length > 0
      ? "Invitación actualizada y verificada."
      : "Sin cambios: la invitación ya estaba en el estado v3."
  );
  console.log(`Verificado: ${verified.join(", ")}`);

  const cfg = asObject(after.invitation);
  console.log("\nResumen del evento 2:");
  console.log(`- template: ${cfg.template} · version: ${cfg.version}`);
  console.log(`- couple: ${asObject(cfg.couple).nameA} / ${asObject(cfg.couple).nameB}`);
  console.log(`- locations: ${(cfg.locations || []).map((l) => l.label).join(" · ")}`);
  console.log(`- lodging: ${(cfg.lodging || []).map((l) => l.name).join(" · ")}`);
  console.log(
    `- stay: ${asObject(cfg.stay).checkin} → ${asObject(cfg.stay).checkout} · cards: ${
      asObject(cfg.stay).cards?.length ?? 0
    }`
  );
  console.log(
    `- trip: ${asObject(cfg.trip).origins?.length ?? 0} orígenes · vuelo ${
      asObject(cfg.trip).modes?.flight?.enabled ? "on" : "off"
    } · tren ${asObject(cfg.trip).modes?.train?.enabled ? "on" : "off"} · bus ${
      asObject(cfg.trip).modes?.bus?.enabled ? "on" : "off"
    }`
  );
  console.log(
    `- registry: allow_custom=${asObject(cfg.registry).allow_custom} · banco=${
      asObject(cfg.registry).bank?.bank_name || "—"
    } · bank_eur=${asObject(cfg.registry).bank_eur?.enabled ? "on" : "off"}`
  );
  console.log(`- music_url conservada: ${cfg.music_url ? "sí" : "vacía"}`);
}

try {
  await main();
} catch (err) {
  console.error("Error:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
