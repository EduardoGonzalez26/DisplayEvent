import { Drawing, Eyebrow, OrnamentRule } from "./index.js";
import { V3, resolveInvitationImage } from "./assets.js";
import { DEFAULT_RECOMMENDATIONS } from "./index.js";

/* Texto enriquecido mínimo del prototipo v4: **negrita** y {phone}. */
function renderRichText(text, phone) {
  const source = String(text || "");
  const phoneHref = String(phone || "").replace(/[^\d+]/g, "");
  const tokens = source.split(/(\*\*[^*]+\*\*|\{phone\})/g);
  return tokens.map((token, index) => {
    if (!token) return null;
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={`b-${index}`}>{token.slice(2, -2)}</strong>;
    }
    if (token === "{phone}") {
      if (!phone) return null;
      return (
        <a key={`t-${index}`} className="mjv3-rec-phone" href={`tel:${phoneHref}`}>
          {phone}
        </a>
      );
    }
    return token;
  });
}

function RecommendationIcon({ icon }) {
  switch (icon) {
    case "shoe":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 16h18v2H3zM4 16l1-7 4 2 3-1 6 3 3 3" />
        </svg>
      );
    case "weather":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="9" r="3.5" />
          <path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M4 4l1 1M13 13l1 1M4 14l1-1M13 5l1-1" />
          <path d="M14 20a4 4 0 1 1 3.5-6 3 3 0 1 1 .5 6z" />
        </svg>
      );
    case "transport":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="3" width="14" height="13" rx="3" />
          <path d="M5 10h14M8 19l-2 2M16 19l2 2M3 3l18 18" />
        </svg>
      );
    case "taxi":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 11l1.5-4.5h11L19 11" />
          <rect x="3" y="11" width="18" height="6" rx="1.5" />
          <path d="M6.5 17v2M17.5 17v2M9 4h6" />
          <circle cx="7.5" cy="14" r="0.8" />
          <circle cx="16.5" cy="14" r="0.8" />
        </svg>
      );
    case "stay":
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 11 12 4l9 7" />
          <path d="M5 10v10h14V10M10 20v-6h4v6" />
        </svg>
      );
  }
}

export default function RecommendationsSection({ cfg }) {
  const recommendations = cfg?.recommendations;
  if (!recommendations?.enabled) return null;

  const items = Array.isArray(recommendations.items) && recommendations.items.length
    ? recommendations.items
    : DEFAULT_RECOMMENDATIONS;
  const image = resolveInvitationImage(recommendations.image, V3.p10);

  return (
    <div className="mjv3-split mjv3-split--reverse">
      <div className="mjv3-split-media">
        <Drawing
          src={image}
          alt="Macarena y Jorge en el Real Alcázar"
          ratio="4 / 3"
          rotate={-1.3}
        />
      </div>
      <div className="mjv3-split-copy">
        <Eyebrow>{recommendations.eyebrow || "Para que todo salga perfecto"}</Eyebrow>
        <OrnamentRule />
        <h2 className="mj-display mjv3-rec-heading">
          {recommendations.title || "Recomendaciones"}
        </h2>
        <div className="mjv3-rec-list">
          {items.map((item, index) => (
            <div className="mjv3-rec-card" key={`${item.icon || "stay"}-${index}`}>
              <span className="mjv3-rec-icon" aria-hidden="true">
                <RecommendationIcon icon={item.icon} />
              </span>
              <div>
                <div className="mjv3-rec-title">{item.title}</div>
                {item.text ? (
                  <p className="mjv3-rec-text">{renderRichText(item.text, item.phone)}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
