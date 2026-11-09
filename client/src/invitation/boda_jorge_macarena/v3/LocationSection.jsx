import { Drawing, Eyebrow, InfoCard, OrnamentRule } from "./index.js";
import { mapsSearchUrl, prettyTime, safeHttpUrl } from "../helpers.js";
import { DEFAULT_LOCATION_EYEBROWS } from "./index.js";
import { V3, resolveInvitationImage } from "./assets.js";

const FALLBACK_IMAGES = [V3.iglesia, V3.alhambra];
const FALLBACK_MAPS = [V3.mapaCeremonia, V3.mapaRecepcion];

function locationEyebrow(index, labels) {
  const list = Array.isArray(labels?.locationEyebrows)
    ? labels.locationEyebrows
    : [];
  return list[index] || DEFAULT_LOCATION_EYEBROWS[index] || (index === 0 ? "Ceremonia" : "Celebración");
}

function fallbackMapUrl(place) {
  return place ? mapsSearchUrl(place) : "";
}

export default function LocationSection({ item, index = 0, event, themeLabels }) {
  if (!item) return null;
  const label = String(item.label || "").trim();
  const place = String(item.place || "").trim();
  const title = label || place || "Ubicación";
  const description = String(item.description || "").trim();
  const address = label && place ? place : "";
  const timeLabel = String(item.time_label || "").trim() || "Hora";
  const timeValue =
    String(item.time_value || "").trim() || prettyTime(event?.time);
  const whenLabel = String(item.when_label || "").trim();
  const whenValue = String(item.when_value || "").trim();
  const image = resolveInvitationImage(
    item.image,
    FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]
  );
  const mapImage = resolveInvitationImage(
    item.map_image,
    FALLBACK_MAPS[index % FALLBACK_MAPS.length]
  );
  const mapUrl = safeHttpUrl(item.url) || fallbackMapUrl(place);
  const rotateImage = index % 2 === 0 ? 1.17 : -1.04;
  const rotateMap = index % 2 === 0 ? -0.81 : 0.72;

  const whenCard =
    whenLabel && whenValue ? (
      <InfoCard label={whenLabel} value={whenValue} className="mjv3-location-time" />
    ) : null;
  const timeCard = timeValue ? (
    <InfoCard label={timeLabel} value={timeValue} className="mjv3-location-time" />
  ) : null;

  return (
    <div className="mjv3-stack mjv3-stack--mid">
      <Eyebrow>{locationEyebrow(index, themeLabels)}</Eyebrow>
      <OrnamentRule />
      <h2 className="mj-display mjv3-location-title">{title}</h2>
      {description || address ? (
        <p className="mj-copy">
          {description}
          {description && address ? <br /> : null}
          {address ? <span className="mjv3-location-address">{address}</span> : null}
        </p>
      ) : null}

      {whenCard ? whenCard : timeCard}

      <div className="mjv3-location-media-grid">
        <div>
          <Drawing
            src={image}
            alt={title}
            ratio="3 / 4"
            rotate={rotateImage}
          />
        </div>
        <div>
          <div
            data-foto="1"
            style={{ "--r": `${rotateMap}deg` }}
          >
            <div className="mjv3-map">
              <div
                role="img"
                aria-label={`Mapa: ${title}`}
                className="mj-drawing"
                style={{ backgroundImage: `url("${mapImage}")` }}
              />
              {mapUrl ? (
                <a
                  className="mjv3-map-link"
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ${title} en Google Maps`}
                >
                  <span>Abrir mapa ↗</span>
                </a>
              ) : null}
            </div>
            <div className="mjv3-map-credit">© OpenStreetMap</div>
          </div>
        </div>
      </div>

      {whenCard ? timeCard : null}
    </div>
  );
}
