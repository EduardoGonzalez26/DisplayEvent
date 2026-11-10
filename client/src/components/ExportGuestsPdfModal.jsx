import { useRef, useState } from "react";
import { Modal, Button } from "./ui.jsx";

const MODE_OPTIONS = [
  {
    value: "summary",
    label: "Solo resumen de grupos",
    description: "Totales generales y tabla por grupo con confirmaciones, niños y periqueras.",
  },
  {
    value: "detail",
    label: "Solo detalle de invitados",
    description: "Lista nominal con el estado de cada invitado, líderes, niños y acompañantes.",
  },
  {
    value: "both",
    label: "Resumen y detalle",
    description: "Incluye las dos secciones en un mismo PDF.",
    recommended: true,
  },
];

function CheckIndicator({ selected }) {
  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center shrink-0 w-5 h-5 rounded-full border transition-colors ${
        selected
          ? "border-indigo-400 bg-indigo-500 text-white"
          : "border-gray-600 text-transparent"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3">
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function ExportGuestsPdfModal({
  event,
  eventId,
  groups = [],
  guests = [],
  onClose,
  onDone,
}) {
  const [mode, setMode] = useState("both");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const generatingRef = useRef(false);

  // Mientras se genera, el modal no se puede cerrar por overlay, X ni Cancelar.
  const handleClose = () => {
    if (generating) return;
    onClose?.();
  };

  const selectMode = (value) => {
    setMode(value);
    setError("");
  };

  const handleGenerate = async () => {
    // El ref bloquea un segundo clic antes de que React re-renderice el botón.
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    setError("");
    try {
      // Import dinámico: jsPDF y AutoTable se descargan solo al generar el PDF.
      const { exportGuestsPdf } = await import("../lib/guestsPdf.js");
      await exportGuestsPdf({ event, groups, guests, eventId, mode });
      onDone?.("PDF generado correctamente", "success");
    } catch (err) {
      // El modal permanece abierto para que el usuario pueda reintentar.
      setError(err?.message || "No se pudo generar el PDF");
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  };

  return (
    <Modal open onClose={handleClose} title="Exportar PDF de invitados" wide>
      <p className="text-sm text-gray-400 mb-4">
        Elige qué información quieres incluir. El PDF incluye todos los grupos e invitados del
        evento, aunque haya filtros activos.
      </p>

      <div role="radiogroup" aria-label="Contenido del PDF" className="space-y-2.5">
        {MODE_OPTIONS.map((option) => {
          const selected = mode === option.value;
          return (
            <label
              key={option.value}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${
                generating ? "cursor-not-allowed" : "cursor-pointer"
              } ${
                selected
                  ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-950/20"
                  : "border-gray-800 bg-gray-950/60 hover:border-gray-600 hover:bg-gray-900/60"
              }`}
            >
              <input
                type="radio"
                name="export-guests-pdf-mode"
                value={option.value}
                checked={selected}
                onChange={() => selectMode(option.value)}
                disabled={generating}
                autoFocus={option.recommended}
                className="sr-only"
              />
              <CheckIndicator selected={selected} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-sm font-medium ${
                      selected ? "text-indigo-200" : "text-gray-200"
                    }`}
                  >
                    {option.label}
                  </span>
                  {option.recommended && (
                    <span className="text-[10px] uppercase tracking-wide text-indigo-300 bg-indigo-500/15 rounded-full px-2 py-0.5">
                      Recomendado
                    </span>
                  )}
                </span>
                <span className="block text-xs text-gray-400 mt-1 leading-relaxed">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-400 mt-4 rounded-lg border border-red-900 bg-red-600/10 px-3 py-2"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={handleClose} disabled={generating}>
          Cancelar
        </Button>
        <Button onClick={handleGenerate} disabled={generating} aria-busy={generating}>
          {generating ? "Generando PDF…" : "Generar PDF"}
        </Button>
      </div>
    </Modal>
  );
}
