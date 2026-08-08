import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Modal, inputClass, Button } from "../components/ui.jsx";

const emptyForm = { name: "", date: "", time: "", place: "" };

function EventForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // null | { mode: "create" } | { mode: "edit", event }

  const load = async () => {
    try {
      setEvents(await api.events.list());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (form) => {
    if (modal.mode === "edit") {
      await api.events.update(modal.event.id, form);
    } else {
      await api.events.create(form);
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Eventos</h1>
          <p className="text-sm text-gray-400">Crea y administra tus eventos</p>
        </div>
        <Button onClick={() => setModal({ mode: "create" })}>+ Nuevo evento</Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando…</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 p-10 text-center text-gray-400">
          Todavía no tienes eventos. Crea el primero.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((e) => {
            const date = new Date(`${e.date}T00:00:00`);
            return (
              <div
                key={e.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/events/${e.id}`}>
                      <h2 className="font-semibold text-white text-lg truncate hover:text-indigo-400">
                        {e.name}
                      </h2>
                    </Link>
                    <p className="text-sm text-gray-400 mt-1">
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
                <div className="flex gap-2 mt-4 text-xs">
                  <span className="rounded-full bg-gray-800 px-3 py-1 text-gray-300">
                    {e.groups_count ?? 0} grupos
                  </span>
                  <span className="rounded-full bg-gray-800 px-3 py-1 text-gray-300">
                    {e.guests_count ?? 0} invitados
                  </span>
                  <span className="rounded-full bg-emerald-900/40 text-emerald-300 px-3 py-1">
                    {e.registered_count ?? 0} registrados
                  </span>
                </div>
              </div>
            );
          })}
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