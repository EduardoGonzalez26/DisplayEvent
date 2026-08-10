import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api.js";
import { StatCard } from "../../components/ui.jsx";
import EventFormModal from "../../components/EventFormModal.jsx";

export default function EventHome() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const load = async () => {
    try {
      const [ev, s] = await Promise.all([api.events.get(id), api.events.stats(id)]);
      setEvent(ev);
      setStats(s);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!event && !error) return <p className="text-gray-400 animate-page-in">Cargando…</p>;
  if (error && !event) return <p className="text-red-400">{error}</p>;
  if (!event) return null;

  const date = new Date(`${event.date}T00:00:00`);

  return (
    <div className="animate-page-in">
      {/* Banner principal del evento */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 mb-6 shadow-xl shadow-indigo-950/30">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-fuchsia-500/25 blur-2xl pointer-events-none" />
<div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.3em] text-[#fff]/80 font-medium mb-2">
                Detalles del evento
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-[#fff] leading-tight">
                {event.name}
              </h1>
              <p className="text-[#fff]/90 mt-3 text-base">
                {date.toLocaleDateString("es-MX", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <div className="flex flex-wrap gap-3 mt-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[#fff]">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-80">
                    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
                  </svg>
                  {event.place}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[#fff]">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-80">
                    <path d="M13 3 5 13h5l-1 8 8-10h-5l1-8Z" />
                  </svg>
                  {event.time}
                </span>
              </div>
            </div>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 px-4 py-2 text-sm font-medium backdrop-blur transition-all active:scale-[.98]"
            style={{ color: "#fff" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
            </svg>
            Editar evento
          </button>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <StatCard label="Grupos" value={stats.total_groups} />
            <StatCard label="Invitados" value={stats.total_guests} />
            <StatCard label="Niños" value={stats.children_count} accent="text-sky-400" />
            <StatCard label="Adultos" value={stats.adults_count} />
            <StatCard
              label="Confirmados"
              value={stats.registered_count}
              accent="text-emerald-400"
            />
            <StatCard
              label="Sin confirmar"
              value={stats.unregistered_count}
              accent="text-amber-400"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              to={`/events/${id}/invitados`}
              className="group rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-950/30 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                    <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Zm-11.25 12a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
                  </svg>
                </span>
                <h3 className="font-semibold text-gray-50 group-hover:text-indigo-300 transition-colors">
                  Invitados
                </h3>
              </div>
              <p className="text-sm text-gray-400">
                Administra los grupos, marca niños y registra confirmaciones.
              </p>
            </Link>

            <Link
              to={`/events/${id}/dashboard`}
              className="group rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-violet-500/50 hover:shadow-xl hover:shadow-indigo-950/30 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                    <path d="M3 21h18M4 21V9m5 12V5m5 16V9m6 12v-8" strokeLinecap="round" />
                  </svg>
                </span>
                <h3 className="font-semibold text-gray-50 group-hover:text-violet-300 transition-colors">
                  Dashboard
                </h3>
              </div>
              <p className="text-sm text-gray-400">
                Consulta estadísticas detalladas del evento por grupo.
              </p>
            </Link>
          </div>
        </>
      )}

      {editing && (
        <EventFormModal event={event} onClose={() => setEditing(false)} onSaved={load} />
      )}
    </div>
  );
}