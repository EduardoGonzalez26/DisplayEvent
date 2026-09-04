// Descriptor declarativo del contrato de invitación (espeja
// `server/src/schemas/invitation.js`). Fuente única de verdad de los campos
// en el frontend.
//
// Cada campo: `{ key, label, type, required, placeholder?, itemLabel?, options? }`.
// `key` es una ruta separada por puntos dentro del JSONB `events.invitation`.
// Tipos: `text`, `textarea`, `list` (array simple de strings) y `select`.
//
// El editor muestra `EXTRA_FIELDS` (por formato) en la sección "Datos del
// formato"; los campos comunes se renderizan en secciones dedicadas. La
// normalización/serialización vive en `schema/normalize.js`.

// Campos comunes a todos los formatos. Las listas especiales (itinerary,
// locations, contacts, gallery) y `dress_code` tienen representación canónica
// de array pero se editan en secciones propias del editor.
export const COMMON_FIELDS = [
  { key: "hero_image", label: "Foto de portada", type: "text", required: false, placeholder: "https://…" },
  { key: "kicker", label: "Frase superior (eyebrow)", type: "text", required: false, placeholder: "Invitación especial" },
  { key: "tagline", label: "Frase bajo el título", type: "text", required: false, placeholder: "Los invitamos a celebrar…" },
  { key: "message", label: "Mensaje de bienvenida", type: "textarea", required: false },
  { key: "celebrants", label: "¿Quién celebra?", type: "text", required: false, placeholder: "Alice" },
  { key: "dress_code", label: "Dress code", type: "list", itemLabel: "Código", required: false },
  { key: "dress_note", label: "Nota del dress code", type: "text", required: false },
  { key: "itinerary", label: "Itinerario", type: "list", itemLabel: "Momento", required: false },
  { key: "locations", label: "Ubicaciones", type: "list", itemLabel: "Ubicación", required: false },
  { key: "gallery", label: "Galería de fotos", type: "list", itemLabel: "Imagen", required: false },
  { key: "contacts", label: "Contactos (RSVP)", type: "list", itemLabel: "Contacto", required: false },
  { key: "contact_note", label: "Mensaje de aclaración", type: "text", required: false },
];

// Campos específicos por formato. El editor los muestra solo si el template
// activo los declara; la invitación los renderiza de forma condicional.
export const EXTRA_FIELDS = {
  xv: [
    {
      key: "celebrant_name",
      label: "Nombre de la quinceañera",
      placeholder: "Ej. Alice",
      type: "text",
      required: true,
    },
    {
      key: "parents",
      label: "Papá y mamá (quienes invitan)",
      placeholder: "Nombre del papá o de la mamá",
      itemLabel: "Papá/Mamá",
      type: "list",
      required: false,
    },
    {
      key: "padrinos",
      label: "Padrinos (opcional)",
      placeholder: "Nombre del padrino o madrina",
      itemLabel: "Padrino/Madrina",
      type: "list",
      required: false,
    },
    {
      key: "registry_note",
      label: "Mesa de regalos",
      placeholder:
        "Ej. Compartiremos una mesa de regalos. Si desean honrarnos con un detalle, será bienvenido.",
      type: "textarea",
      required: false,
    },
  ],
  cumpleanos: [
    {
      key: "age",
      label: "Edad que cumple",
      placeholder: "15",
      type: "text",
      required: false,
    },
    {
      key: "theme_name",
      label: "Tema de la fiesta",
      placeholder: "Ej. Fiesta de unicornios",
      type: "text",
      required: false,
    },
  ],
  boda: [
    {
      key: "couple.nameA",
      label: "Nombre del novio",
      placeholder: "Andrés",
      type: "text",
      required: true,
    },
    {
      key: "couple.nameB",
      label: "Nombre de la novia",
      placeholder: "María",
      type: "text",
      required: true,
    },
    {
      key: "registry_note",
      label: "Mesa de regalos",
      placeholder:
        "Ej. Compartiremos una mesa de regalos. Si desean apoyarnos con un detalle, será bienvenido.",
      type: "textarea",
      required: false,
    },
  ],
  baby_shower: [
    {
      key: "parents",
      label: "Papás del bebé",
      placeholder: "Nombre del papá o mamá",
      itemLabel: "Papá/Mamá",
      type: "list",
      required: true,
    },
    {
      key: "gender",
      label: "Género del bebé",
      type: "select",
      options: [
        { value: "niño", label: "Niño" },
        { value: "niña", label: "Niña" },
        { value: "sorpresa", label: "Sorpresa" },
      ],
      required: false,
    },
    {
      key: "registry_note",
      label: "Nota de regalos",
      placeholder:
        "Ej. Si desean regalar algo, sugerimos ropa talla 3 meses. Su presencia es el mejor regalo.",
      type: "textarea",
      required: false,
    },
  ],
};

// Descriptor completo por formato: campos comunes + específicos.
export const FIELDS_BY_TEMPLATE = Object.fromEntries(
  Object.keys(EXTRA_FIELDS).map((templateId) => [
    templateId,
    [...COMMON_FIELDS, ...EXTRA_FIELDS[templateId]],
  ]),
);

// Campos propios del formato (los que muestra la sección "Datos del formato").
export function getFieldsForTemplate(templateId) {
  return EXTRA_FIELDS[templateId] || [];
}

// Lectura por dot-path: getField(cfg, "couple.nameA") -> cfg.couple.nameA.
export function getField(cfg, key) {
  return key.split(".").reduce((o, k) => (o == null ? o : o[k]), cfg);
}

// Escritura por dot-path sin mutar el objeto original.
export function setField(cfg, key, value) {
  const parts = key.split(".");
  const last = parts.pop();
  const next = { ...cfg };
  let node = next;
  for (const p of parts) {
    const cur = node[p];
    node[p] =
      cur && typeof cur === "object" && !Array.isArray(cur) ? { ...cur } : {};
    node = node[p];
  }
  node[last] = value;
  return next;
}
