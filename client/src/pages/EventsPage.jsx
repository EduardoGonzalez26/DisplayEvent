import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Modal, inputClass, Button } from "../components/ui.jsx";

const emptyForm = { name: "", date: "", time: "", place: "" };

function EventForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");

  useEffect(() => {
    api.templates.list().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({ ...form, templateId });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Nombre del evento</label>
        <input
          className={inputClass}
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ej. Fiesta de cumpleaños"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Día
          <input
            className={`${inputClass} mt-1`}
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
          />
        </label>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Hora
          <input
            className={`${inputClass} mt-1`}
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Lugar</label>
        <input
          className={inputClass}
          name="place"
          value={form.place}
          onChange={handleChange}
          placeholder="Ej. Salón Los Pinos"
          required
        />
      </div>

      {templates.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Empezar desde plantilla (opcional)
          </label>
          <select
            className={inputClass}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">Sin plantilla</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Copia la invitación (formato, textos, galería, contactos) al nuevo evento.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // null | { mode: "create" } | { mode: "edit", event }

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

  const handleSubmit = async (form) => {
    if (modal.mode === "edit") {
      await api.events.update(modal.event.id, form);
    } else {
      const created = await api.events.create(form);
      if (form.templateId) {
        const tpl = await api.templates.get(form.templateId);
        await api.events.setInvitation(created.id, tpl.config);
      }
    }
    setModal(null);
    await load();
  };

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
                className="group rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-950/30 hover:-translate-y-0.5"
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
                      <Link to={`/events/${e.id}`}>
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
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(e)}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 text-xs">
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

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Editar evento" : "Nuevo evento"}
      >
        {modal && (
          <EventForm
            initial={modal.mode === "edit" ? { ...modal.event } : emptyForm}
            onSubmit={handleSubmit}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}