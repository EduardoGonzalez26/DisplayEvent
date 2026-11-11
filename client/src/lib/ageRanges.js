/* ------------------------------------------------------------------
   Rangos de edad del dashboard.

   Contrato: cada rango es { label, min, max }. `max` es EXCLUSIVO y
   `max: null` significa abierto (sin límite superior). El backend valida
   y persiste el array tal cual; aquí se normaliza, valida y calculan los
   conteos para la UI.
------------------------------------------------------------------- */

export const DEFAULT_AGE_RANGES = Object.freeze([
  Object.freeze({ label: "Bebé", min: 0, max: 3 }),
  Object.freeze({ label: "Niño", min: 3, max: 12 }),
  Object.freeze({ label: "Adolescente", min: 12, max: 18 }),
  Object.freeze({ label: "Adulto", min: 18, max: null }),
]);

const MAX_RANGES = 20;
const MIN_AGE = 0;
const MAX_AGE = 120;

function cloneDefaults() {
  return DEFAULT_AGE_RANGES.map((range) => ({ ...range }));
}

function toInteger(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  const number = Number(raw);
  return Number.isFinite(number) && Number.isInteger(number)
    ? number
    : NaN;
}

function toMax(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : NaN;
}

/* null/undefined -> defaults; [] se respeta. Un valor no-array se sanea a []. */
export function normalizeAgeRanges(raw) {
  if (raw === undefined || raw === null) return cloneDefaults();
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const min = Number(item.min);
      const maxValue = item.max;
      const max =
        maxValue === null || maxValue === undefined || String(maxValue).trim() === ""
          ? null
          : Number(maxValue);
      return {
        label: String(item.label ?? "").trim(),
        min: Number.isFinite(min) ? Math.trunc(min) : 0,
        max:
          max === null
            ? null
            : Number.isFinite(max)
              ? Math.trunc(max)
              : null,
      };
    });
}

/* Devuelve "" si es válido; si no, el primer error legible. */
export function validateAgeRanges(ranges) {
  if (!Array.isArray(ranges)) return "Los rangos deben ser una lista.";
  if (ranges.length > MAX_RANGES) {
    return `Puedes definir un máximo de ${MAX_RANGES} rangos.`;
  }

  const parsed = [];
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index] || {};
    const label = String(range.label ?? "").trim();
    if (!label) {
      return `El rango ${index + 1} necesita una etiqueta.`;
    }
    if (label.length > 40) {
      return `La etiqueta "${label}" no puede superar los 40 caracteres.`;
    }

    const min = toInteger(range.min);
    if (
      !Number.isInteger(min) ||
      min < MIN_AGE ||
      min > MAX_AGE
    ) {
      return `El "desde" de "${label}" debe ser un entero entre ${MIN_AGE} y ${MAX_AGE}.`;
    }

    const max = toMax(range.max);
    if (Number.isNaN(max)) {
      return `El "hasta" de "${label}" debe ser un número o quedar vacío.`;
    }
    if (max !== null && (!Number.isInteger(max) || max > MAX_AGE)) {
      return `El "hasta" de "${label}" debe ser un entero menor o igual a ${MAX_AGE} o quedar vacío.`;
    }
    if (max !== null && max <= min) {
      return `El "hasta" de "${label}" debe ser mayor que el "desde" o quedar vacío.`;
    }
    if (max === null && index !== ranges.length - 1) {
      return `El rango abierto "${label}" debe ser el último.`;
    }

    parsed.push({ label, min, max });
  }

  for (let i = 0; i < parsed.length; i += 1) {
    for (let j = i + 1; j < parsed.length; j += 1) {
      const a = parsed[i];
      const b = parsed[j];
      const aMax = a.max === null ? Infinity : a.max;
      const bMax = b.max === null ? Infinity : b.max;
      if (a.min < bMax && b.min < aMax) {
        return `Los rangos "${a.label}" y "${b.label}" se solapan.`;
      }
    }
  }

  return "";
}

function numericAge(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function inRange(age, range) {
  const min = Number(range.min);
  if (!Number.isFinite(min)) return false;
  if (range.max === null || range.max === undefined) return age >= min;
  const max = Number(range.max);
  if (!Number.isFinite(max)) return false;
  return age >= min && age < max;
}

export function computeAgeRangeStats(guests, ranges) {
  const guestList = Array.isArray(guests) ? guests : [];
  const rangeList = Array.isArray(ranges) ? ranges : [];

  const rangeStats = rangeList.map((range) => {
    let total = 0;
    let confirmed = 0;
    for (const guest of guestList) {
      const age = numericAge(guest?.age);
      if (age === null) continue;
      if (!inRange(age, range)) continue;
      total += 1;
      if (guest.registered) confirmed += 1;
    }
    return { ...range, total, confirmed };
  });

  let withoutAge = 0;
  let unclassified = 0;
  for (const guest of guestList) {
    if (guest?.age === null || guest?.age === undefined) {
      withoutAge += 1;
      continue;
    }
    const age = numericAge(guest.age);
    if (age === null) {
      unclassified += 1;
      continue;
    }
    if (!rangeList.some((range) => inRange(age, range))) {
      unclassified += 1;
    }
  }

  return { ranges: rangeStats, withoutAge, unclassified };
}

export function formatRange(range) {
  if (!range) return "";
  const min = Number(range.min);
  if (!Number.isFinite(min)) return "—";
  if (range.max === null || range.max === undefined) return `${min}+`;
  const max = Number(range.max);
  if (!Number.isFinite(max)) return `${min}+`;
  return `${min}–${max}`;
}
