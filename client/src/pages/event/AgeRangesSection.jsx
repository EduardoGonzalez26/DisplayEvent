import { useMemo, useState } from "react";
import { api } from "../../api.js";
import { Button, inputClass } from "../../components/ui.jsx";
import {
  DEFAULT_AGE_RANGES,
  computeAgeRangeStats,
  formatRange,
  normalizeAgeRanges,
  validateAgeRanges,
} from "../../lib/ageRanges.js";

let rowSeq = 0;

function makeRow(range = {}) {
  const key = ++rowSeq;
  return {
    _key: key,
    id: String(range.id ?? "").trim() || `range-${Date.now()}-${key}`,
    label: String(range.label ?? ""),
    min: range.min == null ? "" : String(range.min),
    max: range.max == null ? "" : String(range.max),
  };
}

function toDraft(ranges) {
  return (Array.isArray(ranges) ? ranges : []).map((range) => makeRow(range));
}

export default function AgeRangesSection({
  eventId,
  initialRanges = null,
  guests = [],
}) {
  const [ranges, setRanges] = useState(() => normalizeAgeRanges(initialRanges));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const stats = useMemo(
    () => computeAgeRangeStats(guests, ranges),
    [guests, ranges]
  );

  const startEdit = () => {
    setDraft(toDraft(ranges));
    setError("");
    setMessage("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(toDraft(ranges));
    setError("");
    setEditing(false);
  };

  const updateRow = (key, patch) =>
    setDraft((current) =>
      current.map((row) => (row._key === key ? { ...row, ...patch } : row))
    );

  const addRow = () => {
    if (draft.length >= 20) {
      setError("Puedes definir un máximo de 20 rangos.");
      return;
    }
    setDraft((current) => [...current, makeRow()]);
    setError("");
  };

  const removeRow = (key) => {
    setDraft((current) => current.filter((row) => row._key !== key));
    setError("");
  };

  const restoreDefaults = () => {
    setDraft(toDraft(DEFAULT_AGE_RANGES));
    setError("");
  };

  const save = async () => {
    if (saving) return;
    setError("");
    setMessage("");

    const candidate = draft.map((row) => ({
      id: row.id,
      label: row.label,
      min: row.min,
      max: String(row.max).trim() === "" ? null : row.max,
    }));
    const validationError = validateAgeRanges(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = candidate.map((row) => ({
      id: String(row.id).trim(),
      label: String(row.label).trim(),
      min: Number(row.min),
      max: row.max === null ? null : Number(row.max),
    }));

    setSaving(true);
    try {
      const response = await api.events.updateAgeRanges(eventId, payload);
      const saved = normalizeAgeRanges(response?.age_ranges ?? payload);
      setRanges(saved);
      setDraft(toDraft(saved));
      setEditing(false);
      setMessage("Rangos de edad guardados.");
    } catch (err) {
      setError(err.message || "No se pudieron guardar los rangos de edad.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-50">Rangos de edad</h2>
          <p className="text-xs text-gray-500 mt-1">
            El límite superior es exclusivo: 0–3 incluye 0, 1 y 2. Un rango
            abierto (18+) es el que no tiene “hasta” y debe quedar al final.
          </p>
        </div>
        {!editing && (
          <Button type="button" variant="secondary" onClick={startEdit}>
            Editar rangos
          </Button>
        )}
      </div>

      {editing ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
          <div className="space-y-3">
            {draft.map((row, index) => (
              <div
                key={row._key}
                className="rounded-xl border border-gray-800 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_100px_120px_auto] sm:items-end">
                  <label className="block">
                    <span className="block text-xs text-gray-400 mb-1">
                      Etiqueta
                    </span>
                    <input
                      className={inputClass}
                      value={row.label}
                      onChange={(event) =>
                        updateRow(row._key, { label: event.target.value })
                      }
                      placeholder={index === 0 ? "Bebé" : "Etiqueta"}
                      maxLength={40}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs text-gray-400 mb-1">
                      Desde
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      step={1}
                      inputMode="numeric"
                      className={inputClass}
                      value={row.min}
                      onChange={(event) =>
                        updateRow(row._key, { min: event.target.value })
                      }
                      placeholder="0"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs text-gray-400 mb-1">
                      Hasta
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className={inputClass}
                      value={row.max}
                      onChange={(event) =>
                        updateRow(row._key, { max: event.target.value })
                      }
                      placeholder="Sin límite"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeRow(row._key)}
                    className="justify-self-start text-sm text-red-500 hover:text-red-400 px-2 py-1 sm:pb-2"
                    aria-label={`Quitar rango ${row.label || index + 1}`}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {draft.length === 0 && (
            <p className="text-sm text-gray-500 py-2">
              No hay rangos configurados. Todos los invitados con edad quedarán
              en “Rango no configurado”.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={addRow}
              disabled={saving || draft.length >= 20}
            >
              + Agregar rango
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={restoreDefaults}
              disabled={saving}
            >
              Restaurar ejemplo
            </Button>
            <span className="text-xs text-gray-500">
              {draft.length}/20 rangos
            </span>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            El “hasta” es exclusivo; por ejemplo, 0–3 incluye 0, 1 y 2. Déjalo
            vacío solo en el último rango para un rango abierto (18+).
          </p>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {stats.ranges.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {stats.ranges.map((range, index) => (
                <div
                  key={`${range.label || "rango"}-${index}`}
                  className="rounded-2xl border border-gray-800 bg-gray-900 p-4"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-indigo-300 truncate">
                    {range.label || `Rango ${index + 1}`}
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <span className="text-2xl font-bold text-gray-50">
                      {formatRange(range)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {range.total} invitados
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-emerald-300">
                    {range.confirmed} confirmados
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
              No hay rangos configurados. Todos los invitados con edad quedarán
              en “Rango no configurado”.
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900/60 px-4 py-3">
              <span className="text-sm text-gray-400">
                Sin rango de edad
              </span>
              <span className="text-lg font-semibold text-gray-50">
                {stats.withoutAge}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900/60 px-4 py-3">
              <span className="text-sm text-gray-400">Rango no configurado</span>
              <span className="text-lg font-semibold text-gray-50">
                {stats.unclassified}
              </span>
            </div>
          </div>

          {message && (
            <p role="status" className="text-sm text-emerald-400 mt-3">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
