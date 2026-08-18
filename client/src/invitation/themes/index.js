import { xv } from "./xv.js";
import { boda } from "./boda.js";

// Registry: id de template -> definición de tema.
const registry = { [xv.id]: xv, [boda.id]: boda };

// Tema por defecto: todo evento sin campo `template` (o con uno
// desconocido) se renderiza con el formato clásico de XV años.
export const DEFAULT_THEME_ID = xv.id;

export function getTheme(templateId) {
  if (templateId && registry[templateId]) return registry[templateId];
  return xv;
}

export const TEMPLATES = Object.values(registry).map((t) => ({
  id: t.id,
  label: t.label,
  description: t.description,
}));

export default registry;