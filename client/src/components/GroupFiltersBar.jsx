/* ------------------------------------------------------------------
   Barra reutilizable de búsqueda y filtros para listas de grupos.
   Es controlada: el estado vive en la página (DEFAULT_GROUP_FILTERS) y
   aquí solo se emite el siguiente estado por `onChange`.
   Sin debounce: el filtrado es local e instantáneo.
------------------------------------------------------------------ */
import {
  DEFAULT_GROUP_FILTERS,
  hasActiveGroupFilters,
  WHATSAPP_FILTER_OPTIONS,
  RSVP_FILTER_OPTIONS,
} from "../lib/groupFilters.js";
import { inputClass } from "./ui.jsx";

// Chips segmentados de un filtro (aria-pressed marca el activo).
function FilterChips({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={`Filtro ${label}`} className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
      <div className="flex flex-wrap gap-0.5 rounded-xl border border-gray-800 bg-gray-950/60 p-0.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                active
                  ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm shadow-indigo-900/30"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800/70"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function GroupFiltersBar({
  filters,
  onChange,
  shown = 0,
  total = 0,
  className = "",
}) {
  const active = hasActiveGroupFilters(filters);
  const update = (patch) => onChange({ ...filters, ...patch });

  return (
    <div
      role="search"
      aria-label="Buscar y filtrar grupos"
      className={`rounded-2xl border border-gray-800 bg-gray-900 p-3.5 ${className}`}
    >
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          placeholder="Buscar por grupo, líder o invitado…"
          aria-label="Buscar grupo, líder o invitado"
          className={`${inputClass} pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none`}
        />
        {filters.query !== "" && (
          <button
            type="button"
            onClick={() => update({ query: "" })}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-md text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 mt-3">
        <FilterChips
          label="WhatsApp"
          options={WHATSAPP_FILTER_OPTIONS}
          value={filters.wa}
          onChange={(wa) => update({ wa })}
        />
        <FilterChips
          label="RSVP"
          options={RSVP_FILTER_OPTIONS}
          value={filters.rsvp}
          onChange={(rsvp) => update({ rsvp })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
        <span className="text-gray-400" aria-live="polite">
          Mostrando <span className="font-medium text-gray-200">{shown}</span> de {total} grupos
        </span>
        {active && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_GROUP_FILTERS })}
            className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
