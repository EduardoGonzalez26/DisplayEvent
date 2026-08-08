import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { api } from "../api.js";

const navLinkClass = ({ isActive }) =>
  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? "bg-indigo-600 text-white"
      : "text-gray-400 hover:bg-gray-800 hover:text-white"
  }`;

export default function EventPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    api
      .events
      .get(id)
      .then(setEvent)
      .catch(() => setEvent(null));
  }, [id]);

  return (
    <div className="flex gap-8">
      <aside className="w-56 shrink-0">
        <Link to="/" className="text-sm text-gray-400 hover:text-white inline-block mb-4">
          ← Eventos
        </Link>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 mb-4">
          <div className="text-xs uppercase tracking-wide text-indigo-400 font-medium mb-1">
            Evento
          </div>
          <div className="font-semibold text-white truncate">{event ? event.name : "…"}</div>
          {event && <div className="text-xs text-gray-400 mt-1">{event.place}</div>}
        </div>

        <nav className="flex flex-col gap-1">
          <NavLink to={`/events/${id}`} end className={navLinkClass}>
            Inicio
          </NavLink>
          <NavLink to={`/events/${id}/invitados`} className={navLinkClass}>
            Invitados
          </NavLink>
          <NavLink to={`/events/${id}/mesas`} className={navLinkClass}>
            Mesas
          </NavLink>
          <NavLink to={`/events/${id}/dashboard`} className={navLinkClass}>
            Dashboard
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}