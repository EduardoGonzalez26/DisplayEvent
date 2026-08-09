import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import EventsPage from "./pages/EventsPage.jsx";
import EventPage from "./pages/EventPage.jsx";
import EventHome from "./pages/event/EventHome.jsx";
import EventGuests from "./pages/event/EventGuests.jsx";
import EventTables from "./pages/event/EventTables.jsx";
import EventDashboard from "./pages/event/EventDashboard.jsx";
import EventInvitation from "./pages/event/EventInvitation.jsx";
import InvitationPage from "./pages/invitation/InvitationPage.jsx";

export default function App() {
  const location = useLocation();
  const isInvitation = location.pathname.startsWith("/invitacion/");

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
    }`;

  if (isInvitation) {
    return (
      <Routes>
        <Route path="/invitacion/:token" element={<InvitationPage />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/70 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-lg text-white">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 grid place-items-center text-sm">E</span>
            DisplayEvent
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink to="/" className={linkClass} end>
              Eventos
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
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