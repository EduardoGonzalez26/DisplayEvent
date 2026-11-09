import { useMemo } from "react";
import { useCountdown } from "../../shared/Countdown.jsx";
import { displayNames, parseEventDate } from "../helpers.js";
import { Drawing, WEDDING_TARGET } from "./index.js";

function pad2(value) {
  return String(Math.max(0, Number(value) || 0)).padStart(2, "0");
}

function countdownTarget(event) {
  const raw = String(event?.date || "").trim();
  if (raw) {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T${String(event?.time || "18:00:00").trim() || "18:00:00"}`
      : raw;
    const ts = new Date(iso).getTime();
    if (Number.isFinite(ts)) return ts;
  }
  return new Date(WEDDING_TARGET).getTime();
}

export default function CoverSection({ event, cfg, drawing = null, reveal = true }) {
  const names = displayNames(cfg);
  const first = names[0] || "Macarena";
  const second = names[1] || "Jorge";
  const target = countdownTarget(event);
  const { days, hours, minutes, seconds, done } = useCountdown(target);

  const dateParts = parseEventDate(event?.date) || parseEventDate("2027-06-10");
  const dateOverlay = useMemo(() => {
    const y = String(dateParts?.year || 2027).slice(-2);
    return [pad2(dateParts?.day || 10), pad2(dateParts?.monthNumber || 6), y];
  }, [dateParts]);

  return (
    <div className="mjv3-cover">
      <div className="mjv3-cover-gradient" aria-hidden="true" />
      <div className={`mjv3-cover-content${reveal ? " is-revealed" : ""}`}>
        <div className="mj-label mj-label--xl">Nos casamos</div>
        <h1 className="mjv3-cover-title">
          <span>{first}</span>
          <span className="mjv3-cover-amp" aria-hidden="true">
            &amp;
          </span>
          <span>{second}</span>
        </h1>

        <div className="mjv3-cover-drawing">
          <Drawing
            src={drawing}
            alt={`${first} y ${second}`}
            ratio="3 / 4"
            rotate={-0.6}
          >
            <div className="mjv3-date-overlay" aria-hidden="true">
              <span>{dateOverlay[0]}</span>
              <span aria-hidden="true" />
              <span>{dateOverlay[1]}</span>
              <span aria-hidden="true" />
              <span>{dateOverlay[2]}</span>
            </div>
          </Drawing>
        </div>

        <div className="mjv3-cover-place">
          {String(event?.place || "").trim() || "Granada, España"}
        </div>

        {!done ? (
          <div
            className="mjv3-countdown-grid"
            role="timer"
            aria-label={`Faltan ${days} días, ${hours} horas, ${minutes} minutos y ${seconds} segundos`}
          >
            <div className="mjv3-countdown-cell">
              <div className="mjv3-countdown-value">{days}</div>
              <div className="mjv3-countdown-label">Días</div>
            </div>
            <div className="mjv3-countdown-cell">
              <div className="mjv3-countdown-value">{pad2(hours)}</div>
              <div className="mjv3-countdown-label">Horas</div>
            </div>
            <div className="mjv3-countdown-cell">
              <div className="mjv3-countdown-value">{pad2(minutes)}</div>
              <div className="mjv3-countdown-label">Min</div>
            </div>
            <div className="mjv3-countdown-cell">
              <div className="mjv3-countdown-value">{pad2(seconds)}</div>
              <div className="mjv3-countdown-label">Seg</div>
            </div>
          </div>
        ) : (
          <div className="mj-label mj-label--md">¡Es hoy!</div>
        )}

        <div className="mjv3-scroll-hint">
          Desliza
          <div />
        </div>
      </div>
    </div>
  );
}
