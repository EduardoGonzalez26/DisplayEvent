/* ------------------------------------------------------------------
   Enlaces de los hoteles de la portada. `cfg.lodging[].url` puede ser:
   - un enlace de mapas (Google/Apple/Waze) -> "Ver mapa";
   - un enlace de reserva (Booking o web del hotel) -> "Ver disponibilidad";
   - vacío -> mapa por nombre + lugar y búsqueda en Booking.

   Lógica pura (sin React) para poder probarla de forma aislada.
------------------------------------------------------------------ */

import {
  isMapsUrl,
  mapsSearchUrl,
  safeHttpUrl,
} from "../invitation/boda_jorge_macarena/helpers.js";

/* Fecha local a mediodía: evita que un ISO sin hora caiga en el día
   anterior/siguiente por la zona horaria al sumar o restar días. */
function parseDateAtNoon(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function addDays(date, amount) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + amount);
  return next;
}

function isoDay(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* Búsqueda de disponibilidad en Booking para las noches alrededor de la
   boda (la noche anterior y la del evento). Sin fecha válida, se omite
   el rango y queda una búsqueda por nombre + lugar. */
function bookingUrl(name, place, eventDate) {
  const query = [String(name || "").trim(), String(place || "").trim()]
    .filter(Boolean)
    .join(" ");
  if (!query) return "";

  const stayDate = parseDateAtNoon(eventDate);
  const dateQuery = stayDate
    ? `&checkin=${isoDay(addDays(stayDate, -1))}&checkout=${isoDay(addDays(stayDate, 1))}`
    : "";

  return `https://www.booking.com/searchresults.es.html?ss=${encodeURIComponent(
    query
  )}${dateQuery}&group_adults=2&no_rooms=1&group_children=0&selected_currency=EUR`;
}

/* Devuelve los enlaces de mapa y reserva de un hotel.
   - Si `url` es de mapas, "Ver mapa" lo usa tal cual y "Ver
     disponibilidad" busca en Booking las noches alrededor de la boda.
   - Si `url` es de reserva (Booking o web del hotel), se usa tal cual en
     "Ver disponibilidad" y el mapa se genera por nombre + lugar.
   - Sin `url`, ambos enlaces se generan (mapa y búsqueda en Booking).
   `reserveIsBooking` indica si el enlace de reserva es una búsqueda de
   Booking (para el aria-label) o el enlace directo del hotel. */
export function hotelLinks(hotel, place, eventDate) {
  const name = String(hotel?.name || "").trim();
  const note = String(hotel?.note || "").trim();
  const directUrl = safeHttpUrl(hotel?.url);
  const mapQuery = [name, place].filter(Boolean).join(" ").trim();

  const directMap = directUrl && isMapsUrl(directUrl) ? directUrl : "";
  const mapHref = directMap || (mapQuery ? mapsSearchUrl(mapQuery) : "");
  const directReservation = directUrl && !isMapsUrl(directUrl) ? directUrl : "";
  const reserveHref =
    directReservation || (name ? bookingUrl(name, place, eventDate) : "");

  return {
    name,
    note,
    mapHref,
    reserveHref,
    reserveIsBooking: !directReservation,
  };
}
