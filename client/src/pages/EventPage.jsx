import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { api } from "../api.js";

const ICONS = {
  Inicio: (
    <path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-6v6H4.5A1.5 1.5 0 0 1 3 19.5v-9Z" />
  ),
  Invitados: (
    <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Zm-11.25 12a7.5 7.5 0 0 1 15 0M12 22l1-1 2-3-2-2h3l-2-3 3-1-1-2H13l3-4-3-1-1-2-1 2-3 1 3 4h-3l-1 2 3 1-2 3h3l-2 2 2 3 1 1" />
  ),
  Mesas: (
    <path d="M3 8h18M5 8l1.5 11a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8L19 8M8.5 8l-.5 11M15.5 8l.5 11" />
  ),
  Dashboard: (
    <path d="M3 21h18M4 21V9m5 12V5m5 16V9m6 12v-8" />
  ),
  Invitación: (
    <path d="M4 6h16v11.2a.8.8 0 0 1-.8.8H4.8a.8.8 0 0 1-.8-.8V6Zm0 3 8 4 8-4" />
  ),
};

const NAV = [
  { to: "", label: "Inicio" },
  { to: "invitados", label: "Invitados" },
  { to: "mesas", label: "Mesas" },
  { to: "dashboard", label: "Dashboard" },
  { to: "invitacion", label: "Invitación" },
];

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
    <div className="flex flex-col md:flex-row gap-8 animate-page-in">
      <aside className="md:w-56 shrink-0">
        <Link to="/" className="text-sm text-gray-400 hover:text-indigo-300 inline-block mb-4 transition-colors">
          ← Volver a eventos
        </Link>

        <div className="rounded-xl border border-indigo-500/25 bg-gradient-to-br from-blue-600/10 to-violet-600/10 p-4 mb-4">
          <div className="text-xs uppercase tracking-wide text-indigo-400 font-medium mb-1">
            Evento
          </div>
          <div className="font-semibold text-gray-50 truncate">
            {event ? event.name : "…"}
          </div>
          {event && <div className="text-xs text-gray-400 mt-1">{event.place}</div>}
        </div>

        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              to={`/events/${id}/${item.to}`}
              end={item.to === ""}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md shadow-indigo-900/40"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`w-4.5 h-4.5 shrink-0 ${isActive ? "" : "opacity-70"}`}
                  >
                    {ICONS[item.label]}
                  </svg>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}