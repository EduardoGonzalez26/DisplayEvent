/* ------------------------------------------------------------------
   Piezas de las tarjetas de búsqueda (Hospedaje / Viaje): el botón
   "Buscar ↗" y la línea con los datos que se van a buscar (fechas,
   ruta). Así se entiende que hay que tocar y que el resultado depende de
   lo elegido, sin texto explicativo.
------------------------------------------------------------------- */

const dayMonthFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });

export function dayMonth(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return dayMonthFmt.format(d).replace(/\./g, "").replace(/ de /g, " ");
}

// "8–12 jun" (mismo mes) o "30 jun → 2 jul".
export function rangeLabel(start, end) {
  const a = dayMonth(start);
  const b = dayMonth(end);
  if (a && b) {
    const [da, ma] = a.split(" ");
    const [db, mb] = b.split(" ");
    if (ma === mb && String(start).slice(0, 4) === String(end).slice(0, 4)) return `${da}–${db} ${mb}`;
    return `${a} → ${b}`;
  }
  return a || b || "";
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

// `lines`: cada dato en su renglón (ruta, fechas) para que no se amontone
// en tarjetas estrechas.
export function SearchMeta({ lines = [] }) {
  const items = lines.filter(Boolean);
  if (!items.length) return null;
  return (
    <span className="mjv3-search-meta">
      <CalendarIcon />
      <span className="mjv3-search-meta-lines">
        {items.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
    </span>
  );
}

export function SearchButton({ label = "Buscar" }) {
  return (
    <span className="mjv3-provider-cta">
      <span className="mjv3-go">
        {label}
        <svg viewBox="0 0 24 24" aria-hidden="true" className="mjv3-go-arrow">
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </span>
    </span>
  );
}
