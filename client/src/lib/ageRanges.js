/* ------------------------------------------------------------------
   Rangos de edad del dashboard y del RSVP.

   Contrato: cada rango es { id, label, min, max }. `max` es EXCLUSIVO y
   `max: null` significa abierto (sin límite superior). El backend valida
   y persiste el array; aquí se normaliza, valida y calculan los conteos
   para la UI.
------------------------------------------------------------------- */

export const DEFAULT_AGE_RANGES = Object.freeze([
  Object.freeze({ id: "baby", label: "Bebé", min: 0, max: 3 }),
  Object.freeze({ id: "child", label: "Niño", min: 3, max: 12 }),
  Object.freeze({ id: "teen", label: "Adolescente", min: 12, max: 18 }),
  Object.freeze({ id: "adult", label: "Adulto", min: 18, max: null }),
]);

const MAX_RANGES = 20;
const MIN_AGE = 0;
const MAX_AGE = 120;
const MAX_ID_LENGTH = 80;
const MAX_LABEL_LENGTH = 40;

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

function fallbackRangeId(index) {
  return `range-${index + 1}`;
}

/* null/undefined -> defaults; [] se respeta. Un valor no-array se sanea a []. */
export function normalizeAgeRanges(raw) {
  if (raw === undefined || raw === null) return cloneDefaults();
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => {
      const label = String(item.label ?? "").trim();
      const id =
        String(item.id ?? "").trim() || fallbackRangeId(index);
      const min = Number(item.min);
      const maxValue = item.max;
      const max =
        maxValue === null || maxValue === undefined || String(maxValue).trim() === ""
          ? null
          : Number(maxValue);
      return {
        id,
        label,
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
  const seenIds = new Set();
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index] || {};
    const id = String(range.id ?? "").trim();
    if (!id || id.length > MAX_ID_LENGTH) {
      return `El rango ${index + 1} necesita un id de 1 a ${MAX_ID_LENGTH} caracteres.`;
    }
    if (seenIds.has(id)) {
      return `El id "${id}" está repetido entre los rangos.`;
    }
    seenIds.add(id);

    const label = String(range.label ?? "").trim();
    if (!label) {
      return `El rango ${index + 1} necesita una etiqueta.`;
    }
    if (label.length > MAX_LABEL_LENGTH) {
      return `La etiqueta "${label}" no puede superar los ${MAX_LABEL_LENGTH} caracteres.`;
    }

    const min = toInteger(range.min);
    if (!Number.isInteger(min) || min < MIN_AGE || min > MAX_AGE) {
      return `El "desde" de "${label}" debe ser un entero entre ${MIN_AGE} y ${MAX_AGE}.`;
    }

    const max = toMax(range.max);
    if (Number.isNaN(max)) {
      return `El "hasta" de "${label}" debe ser un número o quedar vacío.`;
    }
    if (
      max !== null &&
      (!Number.isInteger(max) || max > MAX_AGE)
    ) {
      return `El "hasta" de "${label}" debe ser un entero menor o igual a ${MAX_AGE} o quedar vacío.`;
    }
    if (max !== null && max <= min) {
      return `El "hasta" de "${label}" debe ser mayor que el "desde" o quedar vacío.`;
    }
    if (max === null && index !== ranges.length - 1) {
      return `El rango abierto "${label}" debe ser el último.`;
    }

    parsed.push({ id, label, min, max });
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

function rangeForGuest(guest, ranges) {
  const storedId = guest?.age_range_id;
  const hasStoredId =
    storedId !== null &&
    storedId !== undefined &&
    String(storedId).trim() !== "";

  if (hasStoredId) {
    return (
      ranges.find((range) => String(range.id) === String(storedId).trim()) ||
      null
    );
  }

  const age = numericAge(guest?.age);
  if (age === null) return null;
  return ranges.find((range) => inRange(age, range)) || null;
}

export function computeAgeRangeStats(guests, ranges) {
  const guestList = Array.isArray(guests) ? guests : [];
  const rangeList = Array.isArray(ranges) ? ranges : [];
  const matches = guestList.map((guest) => rangeForGuest(guest, rangeList));

  const rangeStats = rangeList.map((range) => {
    let total = 0;
    let confirmed = 0;
    guestList.forEach((guest, index) => {
      const match = matches[index];
      if (!match || String(match.id) !== String(range.id)) return;
      total += 1;
      if (guest.registered) confirmed += 1;
    });
    return { ...range, total, confirmed };
  });

  let withoutAge = 0;
  let unclassified = 0;
  guestList.forEach((guest, index) => {
    const storedId = guest?.age_range_id;
    const hasStoredId =
      storedId !== null &&
      storedId !== undefined &&
      String(storedId).trim() !== "";
    const age = numericAge(guest?.age);

    if (!hasStoredId && age === null) {
      withoutAge += 1;
      return;
    }
    if (!matches[index]) unclassified += 1;
  });

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
