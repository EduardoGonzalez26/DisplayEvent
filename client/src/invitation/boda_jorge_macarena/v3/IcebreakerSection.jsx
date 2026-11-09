import { Drawing, Eyebrow, InfoCard, OrnamentRule } from "./index.js";
import { V3, resolveInvitationImage } from "./assets.js";
import { DEFAULT_ICEBREAKER_TEXT } from "./index.js";

export default function IcebreakerSection({ cfg }) {
  const icebreaker = cfg?.icebreaker;
  if (!icebreaker?.enabled) return null;

  const image = resolveInvitationImage(icebreaker.image, V3.icebreaker);
  const dateLabel = String(icebreaker.date_label || "").trim() || "Por confirmar";
  const timePlace = String(icebreaker.time_place_label || "").trim() || "Por confirmar";

  return (
    <div className="mjv3-split mjv3-split--reverse">
      <div className="mjv3-split-media">
        <Drawing
          src={image}
          alt="Macarena y Jorge"
          ratio="3 / 4"
          rotate={-1.17}
        />
      </div>
      <div className="mjv3-split-copy">
        <Eyebrow>{icebreaker.eyebrow || "Antes del gran día"}</Eyebrow>
        <OrnamentRule />
        <h2 className="mj-display mjv3-icebreaker-title">
          {icebreaker.title || "Icebreaker"}
        </h2>
        <p className="mj-copy mjv3-icebreaker-copy">
          {String(icebreaker.text || "").trim() || DEFAULT_ICEBREAKER_TEXT}
        </p>
        <div className="mjv3-info-grid">
          <InfoCard
            compact
            label="Fecha"
            value={dateLabel}
            valueSize="mjv3-info-value--sm"
            className="mjv3-info-card--compact"
          />
          <InfoCard
            compact
            label="Horario y lugar"
            value={timePlace}
            valueSize="mjv3-info-value--sm"
            className="mjv3-info-card--compact"
          />
        </div>
      </div>
    </div>
  );
}
