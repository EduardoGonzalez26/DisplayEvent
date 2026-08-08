import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api.js";
import { StatCard, Button } from "../../components/ui.jsx";
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

  if (!event && !error) return <p className="text-gray-400">Cargando…</p>;
  if (error && !event) return <p className="text-red-400">{error}</p>;
  if (!event) return null;

  const date = new Date(`${event.date}T00:00:00`);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{event.name}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {date.toLocaleDateString("es-MX", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {event.time} · {event.place}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Editar evento
        </Button>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <StatCard label="Grupos" value={stats.total_groups} />
            <StatCard label="Invitados" value={stats.total_guests} />
            <StatCard label="Niños" value={stats.children_count} accent="text-sky-400" />
            <StatCard label="Adultos" value={stats.adults_count} />
            <StatCard
              label="Registrados"
              value={stats.registered_count}
              accent="text-emerald-400"
            />
            <StatCard
              label="Faltan por registrar"
              value={stats.unregistered_count}
              accent="text-amber-400"
            />
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-sm text-gray-400">
              Administra a los invitados en la sección{" "}
              <Link
                to={`/events/${id}/invitados`}
                className="text-indigo-400 hover:text-indigo-300"
              >
                Invitados
              </Link>{" "}
              y consulta las estadísticas detalladas en el{" "}
              <Link
                to={`/events/${id}/dashboard`}
                className="text-indigo-400 hover:text-indigo-300"
              >
                Dashboard
              </Link>
              .
            </p>
          </div>
        </>
      )}

      {editing && (
        <EventFormModal event={event} onClose={() => setEditing(false)} onSaved={load} />
      )}
    </div>
  );
}