import { useEffect } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import EventsPage from "./pages/EventsPage.jsx";
import EventPage from "./pages/EventPage.jsx";
import EventHome from "./pages/event/EventHome.jsx";
import EventGuests from "./pages/event/EventGuests.jsx";
import EventTables from "./pages/event/EventTables.jsx";
import EventDashboard from "./pages/event/EventDashboard.jsx";
import EventInvitation from "./pages/event/EventInvitation.jsx";
import InvitationPage from "./pages/invitation/InvitationPage.jsx";
import { useTheme } from "./theme.jsx";

export default function App() {
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const isInvitation = location.pathname.startsWith("/invitacion/");

  useEffect(() => {
    document.documentElement.dataset.theme = isInvitation ? "dark" : theme;
  }, [isInvitation, theme]);

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md shadow-indigo-900/40"
        : "text-gray-300 hover:bg-gray-800 hover:text-white"
    }`;

  if (isInvitation) {
    return (
      <Routes>
        <Route path="/invitacion/:token" element={<InvitationPage />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-body">
      {/* Fondo decorativo: resplandores azules y morados */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-[26rem] h-[26rem] rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <header className="border-b border-gray-800 bg-gray-900/70 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-2.5 font-bold text-lg text-gray-50">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md shadow-indigo-900/40">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Zm2 14H7v-2h7v2Zm3-4H7v-2h10v2Zm0-4H7V7h10v2Z" />
              </svg>
            </span>
            DisplayEvent
          </NavLink>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              <NavLink to="/" className={linkClass} end>
                Eventos
              </NavLink>
            </nav>

            <button
              onClick={toggle}
              aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
              title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
              className="relative w-9 h-9 rounded-full grid place-items-center text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700 bg-gray-900 transition-colors"
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 3a.9.9 0 0 1 .9.9v1.2a.9.9 0 1 1-1.8 0V21a.9.9 0 0 1 .9-.9Zm0-16a.9.9 0 0 1-.9-.9V1.9a.9.9 0 1 1 1.8 0v1.2a.9.9 0 0 1-.9.9ZM4.6 14.6a.9.9 0 0 1 .4 1.7l-1 .6a.9.9 0 1 1-.9-1.5l1-.6a.9.9 0 0 1 .5-.2Zm14.8-5.2a.9.9 0 0 1-.4-1.7l1-.6a.9.9 0 0 1 .9 1.5l-1 .6a.9.9 0 0 1-.5.2ZM4.2 6.5a.9.9 0 0 1 1.6.8l-.6 1a.9.9 0 0 1-1.6-.8l.6-1Zm15.6 11a.9.9 0 0 1-1.6-.8l.6-1a.9.9 0 1 1 1.6.8l-.6 1ZM5 12a.9.9 0 0 1-.9.9H2.9a.9.9 0 1 1 0-1.8h1.2A.9.9 0 0 1 5 12Zm16 0a.9.9 0 0 1-.9.9h-1.2a.9.9 0 1 1 0-1.8h1.2a.9.9 0 0 1 .9.9Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M21.53 15.93c-.16-.27-.61-.52-1.43-.66a7.07 7.07 0 0 1-2.09-.64c-2.06-1.03-3.1-2.7-3.1-4.72 0-1.39.64-2.7 1.87-3.8.5-.44.82-1.11.93-1.93.04-.34-.12-.67-.42-.84a1.4 1.4 0 0 0-.94-.1 10.3 10.3 0 1 0 13.06 12.4c.15-.36.03-.8-.32-.95a1.9 1.9 0 0 0-.31-.07ZM11 19.83A8.3 8.3 0 0 1 2.67 11.5a8.34 8.34 0 0 1 5.83-7.94c-.08.2-.14.42-.2.64-.22.9-.32 1.94.01 2.6.83 1.68 2.3 3.02 4.05 3.02 1.97 0 3.55-2.2 3.67-3.82.03-.4.06-.8.08-1.19.02-.35.02-.71.1-1.02a8.36 8.36 0 0 1 4.87 5.41A8.3 8.3 0 0 1 11 19.83Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventPage />}>
            <Route index element={<EventHome />} />
            <Route path="invitados" element={<EventGuests />} />
            <Route path="mesas" element={<EventTables />} />
            <Route path="dashboard" element={<EventDashboard />} />
            <Route path="invitacion" element={<EventInvitation />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}