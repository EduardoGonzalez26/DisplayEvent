import { Drawing } from "./index.js";
import { V3 } from "./assets.js";
import { displayNames, initialsOf, longDateLine, parseEventDate } from "../helpers.js";

const FALLBACK_DATE = "10 de junio de 2027";

export default function ClosingSection({ event, cfg, hideBrand = false }) {
  const names = displayNames(cfg);
  const initials = initialsOf(cfg);
  const left = initials[0] || "M";
  const right = initials[1] || "J";
  const dateLine =
    longDateLine(parseEventDate(event?.date)) || FALLBACK_DATE;
  const place = String(event?.place || "").trim() || "Granada, España";

  return (
    <div className="mjv3-closing">
      <div className="mjv3-drawing mjv3-drawing--closing">
        <Drawing
          src={V3.p5}
          alt="Macarena y Jorge en la Mezquita de Córdoba"
          ratio="3 / 4"
          rotate={-0.98}
        />
      </div>
      <p className="mjv3-closing-phrase">
        Dos ciudades, un camino, una nueva historia.
      </p>
      <div className="mjv3-monogram" aria-label={names.join(" y ")}>
        <div className="mjv3-monogram-outer" aria-hidden="true" />
        <div className="mjv3-monogram-inner" aria-hidden="true">
          {left}
          <span>&amp;</span>
          {right}
        </div>
      </div>
      <div className="mjv3-closing-place">
        {place} · {dateLine}
      </div>
      <a
        className="mjv3-webi"
        href="https://webi.mx"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>Powered by</span>
        <img src={V3.webiLogo} alt="Webi" width="62" height="22" />
      </a>
      {!hideBrand ? <p className="mjv3-displayevent">DisplayEvent</p> : null}
    </div>
  );
}
