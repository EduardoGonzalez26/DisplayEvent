/* ------------------------------------------------------------------
   Helpers compartidos por las secciones de "boda_jorge_macarena" (v2):
   fechas/horas en español, URLs seguras y nombres de la pareja en el
   orden del diseño (novia & novio: Macarena & Jorge).
------------------------------------------------------------------ */

/* Capitaliza la primera letra (los meses/días de `es-MX` llegan en minúscula). */
export function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* Nombres de la pareja en orden de diseño: nameB (novia) y luego nameA
   (novio) — el mock muestra "Macarena & Jorge". */
export function displayNames(cfg) {
  const couple = cfg?.couple || {};
  return [couple.nameB, couple.nameA]
    .map((n) => String(n || "").trim())
    .filter(Boolean);
}

/* Iniciales en orden de diseño: ["M", "J"]. */
export function initialsOf(cfg) {
  return displayNames(cfg).map((n) => n.charAt(0).toUpperCase());
}

/* Fecha del evento -> partes en español. Acepta "YYYY-MM-DD" (formato del
   API público) o un ISO completo. Sin fecha válida -> null. */
export function parseEventDate(date) {
  const raw = String(date || "").trim();
  if (!raw) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00`)
    : new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: d.getDate(),
    month: cap(d.toLocaleDateString("es-MX", { month: "long" })),
    year: d.getFullYear(),
    weekday: cap(d.toLocaleDateString("es-MX", { weekday: "long" })),
    date: d,
  };
}

/* "19 de junio de 2027" (con el mes en minúscula, como el diseño). */
export function longDateLine(parts) {
  if (!parts) return "";
  const month = String(parts.month || "").toLowerCase();
  return `${parts.day} de ${month} de ${parts.year}`;
}

/* "Junio 2027" para el cierre. */
export function monthYearLine(parts) {
  if (!parts) return "";
  return `${parts.month} ${parts.year}`;
}

/* Hora "HH:mm" sin el placeholder de medianoche (00:00 / 00:00:00 -> "").
   El evento de esta boda guarda 00:00:00 cuando no hay hora definida: no
   mostramos "00:00" en las cajas de hora ni en el hero. */
export function prettyTime(time) {
  const raw = String(time || "").trim();
  if (!raw) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (!m) return "";
  const hh = m[1].padStart(2, "0");
  const mm = m[2];
  if (hh === "00" && mm === "00") return "";
  return `${hh}:${mm}`;
}

/* URL absoluta http(s) segura, o null. */
export function safeHttpUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(String(url));
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    /* noop: solo se aceptan URLs absolutas http(s) */
  }
  return null;
}

/* Enlace de búsqueda en Google Maps por texto libre. */
export function mapsSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(query || ""))}`;
}
