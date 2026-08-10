export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade"
      onClick={onClose}
    >
      <div
        className={`bg-gray-900 border border-gray-800 rounded-2xl w-full p-6 shadow-2xl shadow-indigo-950/40 animate-modal-in ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-50 flex items-center gap-2.5">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-500 to-violet-500" />
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-lg grid place-items-center text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-gray-300 mb-1">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-colors";

export function StatCard({ label, value, accent = "text-gray-50" }) {
  return (
    <div className="relative rounded-2xl border border-gray-800 bg-gray-900 p-5 text-center overflow-hidden transition-all hover:-translate-y-0.5 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-950/20">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-500/70 via-indigo-500/70 to-violet-500/70" />
      <div className={`text-3xl font-bold ${accent}`}>{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const styles = {
    primary:
      "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/30",
    secondary:
      "bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700",
    ghost:
      "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent",
    danger:
      "bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-900",
  };
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[.98] active:shadow-none disabled:opacity-50 disabled:pointer-events-none ${styles[variant]} ${className}`}
      {...props}
    />
  );
}