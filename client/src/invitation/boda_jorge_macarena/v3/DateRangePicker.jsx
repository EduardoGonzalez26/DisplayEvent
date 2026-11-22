import { useEffect, useId, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------
   Selector de rango de fechas (Hospedaje / Viaje).
   Un solo campo con las dos fechas y las noches; al tocarlo se despliega
   un calendario de un mes: primer toque = inicio, segundo = fin (se cierra
   solo). Fechas en "YYYY-MM-DD" (hora local, sin zonas horarias).
------------------------------------------------------------------- */

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function parseISO(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const dayFmt = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const monthFmt = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });
const fullFmt = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// "Mié 9 jun": día de la semana con mayúscula inicial, sin "de" ni puntos.
function shortLabel(date) {
  if (!date) return "—";
  const parts = Object.fromEntries(
    dayFmt.formatToParts(date).map((part) => [part.type, part.value.replace(/\./g, "")])
  );
  const weekday = parts.weekday || "";
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${parts.day} ${parts.month}`;
}

function nightsBetween(a, b) {
  if (!a || !b) return 0;
  return Math.round((b - a) / 86400000);
}

export default function DateRangePicker({
  start,
  end,
  onChange,
  startLabel = "Llegada",
  endLabel = "Salida",
  unit = "noche",
}) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(null); // fecha de inicio provisional
  const [hover, setHover] = useState(null);
  const [view, setView] = useState(() => {
    const base = startDate || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const rootRef = useRef(null);
  const panelId = useId();

  // Cerrar al tocar fuera o con Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setPicking(null);
      }
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setPicking(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // lunes primero
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < offset; i += 1) cells.push(null);
    for (let d = 1; d <= count; d += 1) {
      cells.push(new Date(view.getFullYear(), view.getMonth(), d));
    }
    return cells;
  }, [view]);

  const toggle = () => {
    const next = !open;
    if (next && startDate) {
      setView(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
    }
    if (!next) setPicking(null);
    setOpen(next);
  };

  const pick = (date) => {
    if (!picking) {
      setPicking(date);
      return;
    }
    let a = picking;
    let b = date;
    if (b < a) [a, b] = [b, a];
    if (toISO(a) === toISO(b)) b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1);
    onChange?.({ start: toISO(a), end: toISO(b) });
    setPicking(null);
    setHover(null);
    setOpen(false);
  };

  // Rango que se pinta: el definitivo, o el provisional mientras se elige.
  const rangeA = picking || startDate;
  const rangeB = picking ? hover || picking : endDate;
  const lo = rangeA && rangeB && rangeB < rangeA ? rangeB : rangeA;
  const hi = rangeA && rangeB && rangeB < rangeA ? rangeA : rangeB;

  const nights = nightsBetween(startDate, endDate);
  const unitLabel = nights === 1 ? unit : `${unit}s`;

  return (
    <div className="mjv3-range" ref={rootRef} data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="mjv3-range-field"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className="mjv3-range-part">
          <span className="mjv3-field-label">{startLabel}</span>
          <span className="mjv3-range-date">{shortLabel(startDate)}</span>
        </span>
        <span className="mjv3-range-arrow" aria-hidden="true">
          →
        </span>
        <span className="mjv3-range-part">
          <span className="mjv3-field-label">{endLabel}</span>
          <span className="mjv3-range-date">{shortLabel(endDate)}</span>
        </span>
        {nights > 0 ? (
          <span className="mjv3-range-nights">
            {nights} {unitLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="mjv3-range-panel" id={panelId} role="dialog" aria-label="Elegir fechas">
          <div className="mjv3-range-head">
            <button
              type="button"
              className="mjv3-range-nav"
              aria-label="Mes anterior"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <span className="mjv3-range-month">{monthFmt.format(view)}</span>
            <button
              type="button"
              className="mjv3-range-nav"
              aria-label="Mes siguiente"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>
          <p className="mjv3-range-hint">
            {picking ? `Ahora elige ${endLabel.toLowerCase()}` : `Elige ${startLabel.toLowerCase()}`}
          </p>
          <div className="mjv3-range-grid" role="grid">
            {WEEKDAYS.map((day) => (
              <span key={day} className="mjv3-range-wd" aria-hidden="true">
                {day}
              </span>
            ))}
            {days.map((date, index) => {
              if (!date) return <span key={`e-${index}`} />;
              const iso = toISO(date);
              const isStart = lo && iso === toISO(lo);
              const isEnd = hi && iso === toISO(hi);
              const inRange = lo && hi && date > lo && date < hi;
              return (
                <button
                  key={iso}
                  type="button"
                  className="mjv3-range-day"
                  data-start={isStart ? "true" : undefined}
                  data-end={isEnd ? "true" : undefined}
                  data-in={inRange ? "true" : undefined}
                  aria-label={fullFmt.format(date)}
                  aria-pressed={isStart || isEnd ? true : undefined}
                  onClick={() => pick(date)}
                  onPointerEnter={() => picking && setHover(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
