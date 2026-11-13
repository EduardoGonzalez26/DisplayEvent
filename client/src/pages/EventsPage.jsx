import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { Button } from "../components/ui.jsx";
import EventFormModal from "../components/EventFormModal.jsx";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // null | { mode: "create" } | { mode: "edit", event }
  // Aviso de regreso del onboarding de Stripe: null | "return" | "refresh".
  const [stripeNotice, setStripeNotice] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const monthAbbr = (d) =>
    d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");

  const load = async (p) => {
    try {
      const res = await api.events.list({ page: p ?? page, limit: 20 });
      setEvents(res.data);
      setPage(res.page);
      setTotalPages(res.total_pages);
      setTotal(res.total);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regreso del onboarding de Stripe: muestra el aviso, lanza una
  // sincronización de estado (el GET de cuentas refresca los flags desde
  // Stripe en el backend) y limpia el query param de la URL.
  useEffect(() => {
    const stripe = new URLSearchParams(location.search).get("stripe");
    if (stripe !== "return" && stripe !== "refresh") return;
    setStripeNotice(stripe);
    api.stripe.accounts().catch(() => {});
    navigate("/eventos", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleDelete = async (event) => {
    if (!confirm(`¿Eliminar el evento "${event.name}"?`)) return;
    try {
      await api.events.remove(event.id);
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animate-page-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-medium mb-1">
            Panel de control
          </p>
          <h1 className="text-3xl font-bold text-gray-50">Tus eventos</h1>
          <p className="text-sm text-gray-400 mt-1">Crea y administra tus celebraciones</p>
        </div>
        <Button onClick={() => setModal({ mode: "create" })}>+ Nuevo evento</Button>
      </div>

      {stripeNotice && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-indigo-200">
              {stripeNotice === "return"
                ? "Volviendo del onboarding de Stripe; el estado puede tardar unos segundos…"
                : "El enlace de onboarding de Stripe caducó; tu progreso se conserva. Genera uno nuevo desde el editor de la invitación."}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Revisa el estado en el evento → Invitación → “Pagos / Conectar
              Stripe” y pulsa “Actualizar estado”.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStripeNotice(null)}
            className="shrink-0 text-sm text-indigo-300 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Cargando…</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 p-12 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-indigo-500/30 grid place-items-center text-indigo-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-200 mb-1">Todavía no tienes eventos</h2>
          <p className="text-gray-400 text-sm mb-5">Crea el primero para empezar a organizar.</p>
          <Button onClick={() => setModal({ mode: "create" })}>+ Crear mi primer evento</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((e) => {
            const date = new Date(`${e.date}T00:00:00`);
            return (
              <div
                key={e.id}
                className="group flex h-full flex-col rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-950/30 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="shrink-0 w-14 rounded-xl border border-indigo-500/30 bg-gradient-to-b from-blue-500/15 to-violet-500/15 grid place-items-center py-2">
                      <div className="text-2xl font-bold leading-none text-indigo-300">
                        {date.getDate()}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">
                        {monthAbbr(date)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/events/${e.id}`}
                        title={`Abrir panel del evento ${e.name}`}
                        aria-label={`Abrir panel del evento ${e.name}`}
                        className="block max-w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                      >
                        <h2 className="font-semibold text-gray-50 text-lg truncate group-hover:text-indigo-300 transition-colors">
                          {e.name}
                        </h2>
                      </Link>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {date.toLocaleDateString("es-MX", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-gray-400">
                        {e.time} · {e.place}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => setModal({ mode: "edit", event: e })}
                      className="rounded px-1 py-0.5 text-xs text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      Editar datos
                    </button>
                    <button
                      onClick={() => handleDelete(e)}
                      className="rounded px-1 py-0.5 text-xs text-red-500 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="mt-4 mb-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-gray-800 px-3 py-1 text-gray-300">
                    {e.groups_count ?? 0} grupos
                  </span>
                  <span className="rounded-full bg-gray-800 px-3 py-1 text-gray-300">
                    {e.guests_count ?? 0} invitados
                  </span>
                  <span className="rounded-full bg-emerald-900/40 text-emerald-300 px-3 py-1">
                    {e.registered_count ?? 0} confirmados
                  </span>
                </div>
                <Link
                  to={`/events/${e.id}`}
                  title={`Configurar evento ${e.name}`}
                  aria-label={`Configurar evento: ${e.name}`}
                  className="group/cta mt-auto inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition-all hover:from-blue-500 hover:to-violet-500 hover:shadow-indigo-900/50 active:scale-[.99] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.241.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                  </svg>
                  Configurar evento
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4 shrink-0 transition-transform group-hover/cta:translate-x-0.5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between mt-6 text-sm text-gray-400">
          <span>
            {total} evento{total === 1 ? "" : "s"} · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:pointer-events-none"
              disabled={page <= 1}
              onClick={() => load(page - 1)}
            >
              ← Anterior
            </button>
            <button
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:pointer-events-none"
              disabled={page >= totalPages}
              onClick={() => load(page + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {modal && (
        <EventFormModal
          event={modal.mode === "edit" ? modal.event : null}
          onClose={() => setModal(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}