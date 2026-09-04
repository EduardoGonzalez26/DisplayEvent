import { lazy } from "react";
import { xv } from "./xv.js";
import { boda } from "./boda.js";
import { cumpleanos } from "./cumpleanos.js";
import { baby_shower } from "./baby_shower.js";

// RECETA para agregar un formato nuevo:
//   1. Crea el archivo de tema en `themes/<formato>.js` (id, label, labels, etc.).
//   2. Regístralo aquí: importa el tema, añádelo a `registry` y agrega su caso
//      en `getThemeLayout` (lazy import del layout en `../<formato>/`).
//   3. Declara sus campos en `schema/fields.js` (entrada en `EXTRA_FIELDS`).
//   4. Crea `layouts/<formato>/Hero.jsx` + `layouts/<formato>/<Formato>Layout.jsx`.
//   5. Añade `TEMPLATES` + la variante del schema en `server/src/schemas/invitation.js`.
// Registry: id de template -> definición de tema.
const registry = {
  [xv.id]: xv,
  [boda.id]: boda,
  [cumpleanos.id]: cumpleanos,
  [baby_shower.id]: baby_shower,
};

// Tema por defecto: todo evento sin campo `template` (o con uno
// desconocido) se renderiza con el formato clásico de XV años.
export const DEFAULT_THEME_ID = xv.id;

export function getTheme(templateId) {
  if (templateId && registry[templateId]) return registry[templateId];
  return xv;
}

// Layout (componente de composición) por plantilla. Se carga perezosamente
// para que el bundle del editor/admin nunca arrastre las secciones de la
// invitación pública.
export function getThemeLayout(templateId) {
  switch (templateId) {
    case "boda":
      return lazy(() => import("../boda/BodaLayout.jsx"));
    case "cumpleanos":
      return lazy(() => import("../cumpleanos/CumpleanosLayout.jsx"));
    case "baby_shower":
      return lazy(() => import("../baby_shower/BabyShowerLayout.jsx"));
    case "xv":
    default:
      return lazy(() => import("../xv/XvLayout.jsx"));
  }
}

export const TEMPLATES = Object.values(registry).map((t) => ({
  id: t.id,
  label: t.label,
  description: t.description,
}));

export default registry;