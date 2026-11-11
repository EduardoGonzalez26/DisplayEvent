/* ------------------------------------------------------------------
   Rangos de edad del evento (`events.age_ranges`, JSONB).

   `max` es EXCLUSIVO: [min, max). Por tanto `0–3` cubre 0,1,2 y `3–12`
   cubre 3..11; el siguiente `min` puede ser igual al `max` anterior.
   `max: null` representa un rango abierto y solo puede quedar al final.

   Este módulo es la única fuente de la validación/saneado para que el
   endpoint del dashboard y la lectura pública del RSVP no diverjan.
------------------------------------------------------------------ */

export const DEFAULT_AGE_RANGES = Object.freeze([
  Object.freeze({ id: "baby", label: "Bebé", min: 0, max: 3 }),
  Object.freeze({ id: "child", label: "Niño", min: 3, max: 12 }),
  Object.freeze({ id: "teen", label: "Adolescente", min: 12, max: 18 }),
  Object.freeze({ id: "adult", label: "Adulto", min: 18, max: null }),
]);

export const AGE_RANGES_MAX_COUNT = 20;
export const AGE_RANGE_ID_MAX = 80;
export const AGE_RANGE_LABEL_MAX = 40;
export const AGE_RANGE_MIN = 0;
export const AGE_RANGE_MAX = 120;

function cloneDefaultAgeRanges() {
  return DEFAULT_AGE_RANGES.map((range) => ({ ...range }));
}

export function normalizeAgeRangeId(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeAgeRangeLabel(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Validación estricta del payload del dashboard. Devuelve { ranges } ya
// saneados/ordenados o { error } con un mensaje apto para 400.
// - `id` ausente/vacío se autogenera de forma estable (`range-<n>`).
// - `id` explícito debe ser string único de 1..80 caracteres.
export function parseAgeRangesInput(value) {
  if (!Array.isArray(value)) {
    return { error: 'El campo "ranges" debe ser un arreglo' };
  }
  if (value.length > AGE_RANGES_MAX_COUNT) {
    return { error: `No se permiten más de ${AGE_RANGES_MAX_COUNT} rangos de edad` };
  }

  const items = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { error: `ranges[${index}] es inválido` };
    }

    if (typeof item.label !== "string") {
      return { error: `ranges[${index}].label debe ser texto` };
    }
    const label = normalizeAgeRangeLabel(item.label);
    if (!label) {
      return { error: `ranges[${index}].label es obligatorio` };
    }
    if (label.length > AGE_RANGE_LABEL_MAX) {
      return {
        error: `ranges[${index}].label no puede superar los ${AGE_RANGE_LABEL_MAX} caracteres`,
      };
    }

    if (
      !Number.isInteger(item.min) ||
      item.min < AGE_RANGE_MIN ||
      item.min > AGE_RANGE_MAX
    ) {
      return {
        error: `ranges[${index}].min debe ser un entero entre ${AGE_RANGE_MIN} y ${AGE_RANGE_MAX}`,
      };
    }

    if (
      item.max !== null &&
      (!Number.isInteger(item.max) ||
        item.max <= item.min ||
        item.max > AGE_RANGE_MAX)
    ) {
      return {
        error: `ranges[${index}].max debe ser un entero mayor que min y menor o igual a ${AGE_RANGE_MAX}, o null (el máximo es exclusivo)`,
      };
    }

    items.push({ rawId: item.id, label, min: item.min, max: item.max });
  }

  // Primera pasada de ids: validar los explícitos y reservarlos para que los
  // autogenerados no colisionen con ellos.
  const usedIds = new Set();
  for (let index = 0; index < items.length; index += 1) {
    const rawId = items[index].rawId;
    if (rawId === undefined || rawId === null) continue;
    if (typeof rawId !== "string") {
      return { error: `ranges[${index}].id debe ser texto` };
    }
    const id = normalizeAgeRangeId(rawId);
    if (!id) continue; // vacío/espacios = ausente -> se autogenera
    if (id.length > AGE_RANGE_ID_MAX) {
      return {
        error: `ranges[${index}].id no puede superar los ${AGE_RANGE_ID_MAX} caracteres`,
      };
    }
    if (usedIds.has(id)) {
      return { error: `ranges[${index}].id está duplicado: "${id}"` };
    }
    usedIds.add(id);
  }

  const ranges = items.map((item, index) => {
    let id = normalizeAgeRangeId(item.rawId);
    if (!id) {
      let suffix = index + 1;
      id = `range-${suffix}`;
      while (usedIds.has(id)) {
        suffix += 1;
        id = `range-${suffix}`;
      }
      usedIds.add(id);
    }
    return { id, label: item.label, min: item.min, max: item.max };
  });

  ranges.sort((a, b) => a.min - b.min);

  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1];
    if (previous.max === null) {
      return { error: "Un rango con max null solo puede ser el último" };
    }
    // `max` exclusivo: min === max es contiguo (válido); solo min < max solapa.
    if (ranges[index].min < previous.max) {
      return { error: "Los rangos de edad no pueden solaparse (el máximo es exclusivo)" };
    }
  }

  return { ranges };
}

// Normalización tolerante para LECTURA (BD/JSONB). Nunca lanza:
// - null/undefined o un valor no-array -> defaults.
// - [] -> [] (se respeta).
// - array válido -> saneado (ids generados si faltan, ordenado).
// - array corrupto -> defaults (la UI siempre recibe rangos utilizables).
export function normalizeAgeRanges(raw) {
  if (raw == null) return cloneDefaultAgeRanges();
  if (!Array.isArray(raw)) return cloneDefaultAgeRanges();
  if (raw.length === 0) return [];

  const parsed = parseAgeRangesInput(raw);
  return parsed.error ? cloneDefaultAgeRanges() : parsed.ranges;
}

// Busca un rango por id dentro de una lista ya normalizada.
export function findAgeRange(ranges, id) {
  const normalizedId = normalizeAgeRangeId(id);
  if (!normalizedId || !Array.isArray(ranges)) return null;
  return ranges.find((range) => range && range.id === normalizedId) || null;
}
