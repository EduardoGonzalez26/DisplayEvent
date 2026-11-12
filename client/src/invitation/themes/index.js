import { lazy } from "react";
import { xv } from "./xv.js";
import { boda } from "./boda.js";
import { cumpleanos } from "./cumpleanos.js";
import { baby_shower } from "./baby_shower.js";
import { alice_xv } from "./alice_xv.js";
import { boda_jorge_macarena } from "./boda_jorge_macarena.js";

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
  [alice_xv.id]: alice_xv,
  [boda_jorge_macarena.id]: boda_jorge_macarena,
};

// Tema por defecto: todo evento sin campo `template` (o con uno
// desconocido) se renderiza con el formato clásico de XV años.
export const DEFAULT_THEME_ID = xv.id;

export function getTheme(templateId) {
  if (templateId && registry[templateId]) return registry[templateId];
  return xv;
}

// Layouts lazy hoisteados a nivel de módulo. Crear un `lazy()` dentro de
// `getThemeLayout` devolvía un tipo de componente distinto en cada render y
// React desmontaba/remontaba todo el Layout (parpadeo al abrir el sobre).
const LazyBoda = lazy(() => import("../boda/BodaLayout.jsx"));
const LazyCumpleanos = lazy(() => import("../cumpleanos/CumpleanosLayout.jsx"));
const LazyBabyShower = lazy(() => import("../baby_shower/BabyShowerLayout.jsx"));
const LazyAliceXv = lazy(() => import("../alice_xv/AliceXvLayout.jsx"));
const LazyBodaJorgeMacarena = lazy(() =>
  import("../boda_jorge_macarena/BodaJorgeMacarenaLayout.jsx")
);
const LazyXv = lazy(() => import("../xv/XvLayout.jsx"));

// Layout (componente de composición) por plantilla. Se carga perezosamente
// para que el bundle del editor/admin nunca arrastre las secciones de la
// invitación pública. Siempre devuelve la misma referencia por template.
export function getThemeLayout(templateId) {
  switch (templateId) {
    case "boda":
      return LazyBoda;
    case "cumpleanos":
      return LazyCumpleanos;
    case "baby_shower":
      return LazyBabyShower;
    case "alice_xv":
      return LazyAliceXv;
    case "boda_jorge_macarena":
      return LazyBodaJorgeMacarena;
    case "xv":
    default:
      return LazyXv;
  }
}

export const TEMPLATES = Object.values(registry).map((t) => ({
  id: t.id,
  label: t.label,
  description: t.description,
}));

export default registry;