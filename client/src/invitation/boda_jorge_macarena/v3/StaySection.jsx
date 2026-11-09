import { useState } from "react";
import { Drawing, Eyebrow, OrnamentRule } from "./index.js";
import { V3 } from "./assets.js";
import { buildStayUrl, safeHttpUrl } from "../../../wedding/stayTravelLinks.js";
import {
  DEFAULT_LODGING,
  DEFAULT_STAY_QUOTE,
  DEFAULT_STAY_QUOTE_AUTHOR,
} from "./index.js";

const DEFAULT_INTRO =
  "Granada se disfruta sin prisa. Os recomendamos el Albaicín y sus alrededores, a un paseo de la iglesia y del Carmen. Aquí tenéis nuestros hoteles favoritos y buscadores para encontrar más opciones.";
const DEFAULT_CHECKIN = "2027-06-08";
const DEFAULT_CHECKOUT = "2027-06-12";
const ALBAICIN_MAPS =
  "https://www.google.com/maps/search/?api=1&query=Albaic%C3%ADn%2C%20Granada";

const DEFAULT_CARDS = [
  { id: "booking", platform: "booking", title: "Booking.com", description: "Hoteles, apartamentos y casas en el Albaicín y alrededores.", url: "", auto: true },
  { id: "airbnb", platform: "airbnb", title: "Airbnb", description: "Alojamientos completos y habitaciones en Granada.", url: "", auto: true },
  { id: "trivago", platform: "trivago", title: "Trivago", description: "Compara precios de hoteles en Granada.", url: "", auto: true },
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
  const cards =
    Array.isArray(stay.cards) && stay.cards.length ? stay.cards : DEFAULT_CARDS;
  const zone = stay.zone || {};
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

      <div className="mjv3-hotel-grid">
        {hotels.map((hotel, index) => {
          const href = hotelLink(hotel);
          const content = (
            <>
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
        <div className="mjv3-stay-map-img">
          <div
            role="img"
            aria-label="Mapa del Albaicín"
            className="mj-drawing"
            style={{ backgroundImage: `url("${V3.mapaAlbaicin}")` }}
          />
        </div>
        <div className="mjv3-stay-map-foot">
          <div>
            <div className="mjv3-hotel-label">Zona sugerida</div>
            <div className="mjv3-stay-zone">Albaicín y alrededores</div>
          </div>
          <a
            className="mjv3-stay-map-link"
            href={ALBAICIN_MAPS}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en Google Maps<span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className="mjv3-stay-dates">
        <label>
          <span className="mjv3-field-label">Llegada</span>
          <input
            type="date"
            className="mjv3-field"
            value={checkin}
            onChange={(event) => setCheckin(event.target.value)}
          />
        </label>
        <label>
          <span className="mjv3-field-label">Salida</span>
          <input
            type="date"
            className="mjv3-field"
            value={checkout}
            onChange={(event) => setCheckout(event.target.value)}
          />
        </label>
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

      <figure className="mjv3-quote">
        <blockquote>{quote}</blockquote>
        <figcaption>{quoteAuthor}</figcaption>
      </figure>
    </div>
  );
}
