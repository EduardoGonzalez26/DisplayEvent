// Campos específicos por formato. El editor los muestra solo si el template
// activo los declara; la invitación los renderiza de forma condicional.
// `key` es una ruta separada por puntos dentro del JSONB events.invitation.

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

export function getFieldsForTemplate(templateId) {
  return EXTRA_FIELDS[templateId] || [];
}

export function getField(cfg, key) {
  return key.split(".").reduce((o, k) => (o == null ? o : o[k]), cfg);
}

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