import { useState } from "react";
import { Drawing, Eyebrow, OrnamentRule } from "./index.js";
import { V3, v3Asset } from "./assets.js";
import DateRangePicker from "./DateRangePicker.jsx";
import { buildStayUrl, safeHttpUrl } from "../../../wedding/stayTravelLinks.js";
import {
  DEFAULT_LODGING,
  DEFAULT_STAY_QUOTE,
  DEFAULT_STAY_QUOTE_AUTHOR,
} from "./index.js";

const DEFAULT_INTRO =
  "Granada se disfruta sin prisa. Les recomendamos el Albaicín y sus alrededores, a un paseo de la iglesia y del Carmen. Aquí tienen nuestros hoteles favoritos y buscadores para encontrar más opciones.";
const DEFAULT_CHECKIN = "2027-06-08";
const DEFAULT_CHECKOUT = "2027-06-12";
// Zona sugerida (fija en la plantilla): Albaicín bajo, de San Nicolás a
// Carrera del Darro / San Pedro y hasta la Cuesta del Chapiz. Es la que
// pinta el mapa `m-zona.webp` y la que usan los buscadores (Booking por
// centro+radio, Airbnb por recuadro del mapa).
const SUGGESTED_ZONE = {
  lat: 37.18046,
  lng: -3.59048,
  radius_km: 0.42,
  label: "Albaicín, Granada",
};
const ZONE_NAME = "Albaicín bajo y Carrera del Darro";
// Google Maps no admite dibujar la zona por URL: se abre con un pin en el
// centro de la zona y zoom 17 (solo el Albaicín bajo, no todo el barrio).
const ZONE_MAPS = `https://www.google.com/maps/place/${SUGGESTED_ZONE.lat},${SUGGESTED_ZONE.lng}/@${SUGGESTED_ZONE.lat},${SUGGESTED_ZONE.lng},17z`;

const HOTELS_NOTE =
  "Recomendamos estos hoteles de alta gama, pero por cercanía y comodidad les sugerimos buscar en Airbnb dentro de la zona marcada en el mapa. Los buscadores de abajo los llevan directo a esa zona.";

// Fotos de los hoteles recomendados, por nombre (el JSON del evento no
// guarda imagen por hotel).
const HOTEL_PHOTOS = [
  { match: /alhambra\s+palace/i, file: "hotel-alhambra-palace.webp", position: "50% 38%" },
  { match: /parador/i, file: "hotel-parador.webp", position: "50% 45%" },
];

function hotelPhoto(name) {
  const found = HOTEL_PHOTOS.find((item) => item.match.test(String(name || "")));
  return found ? { src: v3Asset(found.file), position: found.position } : null;
}

const DEFAULT_CARDS = [
  { id: "booking", platform: "booking", title: "Booking.com", description: "Hoteles, apartamentos y casas en el Albaicín y alrededores.", url: "", auto: true },
  { id: "airbnb", platform: "airbnb", title: "Airbnb", description: "Alojamientos completos y habitaciones en Granada.", url: "", auto: true },
  { id: "google_hotels", platform: "google_hotels", title: "Google Hotels", description: "Busca hoteles y compara opciones cerca de la zona.", url: "", auto: true },
];

function hotelLink(hotel) {
  const direct = safeHttpUrl(hotel?.url);
  if (direct) return direct;
  const name = String(hotel?.name || "").trim();
  return name
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`
    : "";
}

function BedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 20V6M3 16h18v4M21 16v-3a3 3 0 0 0-3-3h-7v6" />
      <circle cx="7" cy="12" r="2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

/* Grupo (siempre desplegado). */
function StayGroup({ title, icon, children }) {
  return (
    <div className="mjv3-mode mjv3-stay-group" data-open="true">
      <h3 className="mjv3-mode-heading">
        <span className="mjv3-mode-head">
          <span className="mjv3-mode-icon" aria-hidden="true">
            {icon}
          </span>
          <span className="mjv3-mode-title">{title}</span>
          <span className="mjv3-mode-line" aria-hidden="true" />
        </span>
      </h3>
      <div className="mjv3-mode-body">{children}</div>
    </div>
  );
}

export default function StaySection({ cfg }) {
  const stay = cfg?.stay || {};
  const [checkin, setCheckin] = useState(
    () => String(stay.checkin || "").trim() || DEFAULT_CHECKIN
  );
  const [checkout, setCheckout] = useState(
    () => String(stay.checkout || "").trim() || DEFAULT_CHECKOUT
  );

  if (!stay.enabled) return null;

  const lodging = (Array.isArray(cfg?.lodging) ? cfg.lodging : [])
    .filter((item) => item && (item.name || item.note))
    .slice(0, 2);
  const hotels = lodging.length ? lodging : DEFAULT_LODGING;
  // Trivago fuera: no permite llevar a la zona sugerida.
  const cards = (
    Array.isArray(stay.cards) && stay.cards.length ? stay.cards : DEFAULT_CARDS
  ).filter((card) => String(card?.platform || card?.id || "").toLowerCase() !== "trivago");
  const zone = SUGGESTED_ZONE;
  const quote = String(stay.quote || "").trim() || DEFAULT_STAY_QUOTE;
  const quoteAuthor =
    String(stay.quote_author || "").trim() || DEFAULT_STAY_QUOTE_AUTHOR;

  return (
    <div className="mjv3-stack">
      <div className="mjv3-drawing mjv3-drawing--small">
        <Drawing
          src={V3.p3}
          alt="Macarena y Jorge con el Albaicín de fondo"
          ratio="4 / 3"
          rotate={1.3}
        />
      </div>
      <Eyebrow>La estancia</Eyebrow>
      <OrnamentRule />
      <h2 className="mj-display">Hospedaje</h2>
      <p className="mj-copy mjv3-travel-intro">
        {String(stay.intro || "").trim() || DEFAULT_INTRO}
      </p>

      <div className="mjv3-travel-modes">
        <StayGroup title="Hoteles recomendados" icon={<BedIcon />}>
          <p className="mjv3-mode-desc mjv3-hotels-note">{HOTELS_NOTE}</p>
          <div className="mjv3-hotel-grid">
            {hotels.map((hotel, index) => {
              const href = hotelLink(hotel);
              const photo = hotelPhoto(hotel.name);
              const content = (
                <>
                  {photo ? (
                    <img
                      className="mjv3-hotel-photo"
                      src={photo.src}
                      alt={hotel.name || "Hotel recomendado"}
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: photo.position }}
                    />
                  ) : null}
                  <span className="mjv3-hotel-label">Hotel recomendado</span>
                  <span className="mjv3-hotel-name">
                    {hotel.name || `Hotel ${index + 1}`}
                  </span>
                  {hotel.note ? (
                    <span className="mjv3-hotel-note">{hotel.note}</span>
                  ) : null}
                  <span className="mjv3-hotel-link">
                    Ver ubicación<span aria-hidden="true">→</span>
                  </span>
                </>
              );
              return href ? (
                <a
                  key={`${hotel.name || "hotel"}-${index}`}
                  className="mjv3-hotel-card"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {content}
                </a>
              ) : (
                <div key={`${hotel.name || "hotel"}-${index}`} className="mjv3-hotel-card">
                  {content}
                </div>
              );
            })}
          </div>

          <div className="mjv3-stay-map">
            <a
              className="mjv3-stay-map-img mjv3-stay-map-img--zone"
              href={V3.mapaZona}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver en grande el mapa con la zona sugerida: ${ZONE_NAME}`}
            >
              <div
                role="img"
                aria-label={`Mapa con la zona sugerida: ${ZONE_NAME}`}
                className="mj-drawing mjv3-stay-map-zone"
                style={{ backgroundImage: `url("${V3.mapaZona}")` }}
              />
            </a>
            <div className="mjv3-stay-map-foot">
              <div>
                <div className="mjv3-hotel-label">Zona sugerida</div>
                <div className="mjv3-stay-zone">{ZONE_NAME}</div>
              </div>
              <a
                className="mjv3-stay-map-link"
                href={ZONE_MAPS}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir en Google Maps<span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </StayGroup>
        <StayGroup title="Buscar hospedaje" icon={<SearchIcon />}>
          <div className="mjv3-stay-dates">
            <DateRangePicker
              start={checkin}
              end={checkout}
              startLabel="Llegada"
              endLabel="Salida"
              onChange={({ start, end }) => {
                setCheckin(start);
                setCheckout(end);
              }}
            />
          </div>

          <div className="mjv3-stay-platforms">
            {cards.map((card, index) => {
              const href = card.auto
                ? buildStayUrl(card.platform, {
                    zone,
                    checkin,
                    checkout,
                    adults: 1,
                  })
                : safeHttpUrl(card.url);
              if (!href) return null;
              return (
                <a
                  key={card.id || `${card.platform}-${index}`}
                  className="mjv3-stay-platform"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <span className="mjv3-stay-platform-name">
                      {card.title || card.platform}
                    </span>
                    {card.description ? (
                      <span className="mjv3-stay-platform-desc">{card.description}</span>
                    ) : null}
                  </span>
                  <span className="mjv3-provider-cta">
                    Buscar hospedaje<span aria-hidden="true">→</span>
                  </span>
                </a>
              );
            })}
          </div>
        </StayGroup>
      </div>

      <figure className="mjv3-quote">
        <blockquote>{quote}</blockquote>
        <figcaption>{quoteAuthor}</figcaption>
      </figure>
    </div>
  );
}
