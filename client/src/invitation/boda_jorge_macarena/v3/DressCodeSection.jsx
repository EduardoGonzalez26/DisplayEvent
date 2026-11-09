import { Drawing, Eyebrow, OrnamentRule } from "./index.js";
import { V3 } from "./assets.js";
import { DEFAULT_DRESS } from "./index.js";

function dressLabels(raw) {
  const list = Array.isArray(raw)
    ? raw
        .map((item) =>
          typeof item === "object" && item ? item.label : item
        )
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : String(raw || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
  return list.length ? list : DEFAULT_DRESS.labels;
}

export default function DressCodeSection({ cfg }) {
  const labels = dressLabels(cfg?.dress_code);
  const note = String(cfg?.dress_note || "").trim() || DEFAULT_DRESS.note;

  return (
    <div className="mjv3-split mjv3-split--reverse">
      <div className="mjv3-split-media">
        <Drawing
          src={V3.p7}
          alt="Macarena y Jorge vestidos de gala en Puebla"
          ratio="3 / 4"
          rotate={1.04}
        />
      </div>
      <div className="mjv3-split-copy">
        <Eyebrow>Código de vestimenta</Eyebrow>
        <OrnamentRule />
        <h2 className="mj-display mj-display--lg">{labels.join(" · ")}</h2>
        {note ? <p className="mj-copy">{note}</p> : null}
      </div>
    </div>
  );
}
