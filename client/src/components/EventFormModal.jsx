import { useState } from "react";
import { Modal, Field, inputClass, Button } from "./ui.jsx";
import { api } from "../api.js";

const emptyForm = { name: "", date: "", time: "", place: "" };

export default function EventFormModal({ event, onClose, onSaved }) {
  const isEdit = Boolean(event);
  const [form, setForm] = useState(event ? { ...event } : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (isEdit) await api.events.update(event.id, form);
      else await api.events.create(form);
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? "Editar evento" : "Nuevo evento"}>
      <form onSubmit={handleSubmit}>
        <Field label="Nombre del evento">
          <input
            className={inputClass}
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ej. Fiesta de cumpleaños"
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Día">
            <input
              className={inputClass}
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </Field>
          <Field label="Hora">
            <input
              className={inputClass}
              type="time"
              name="time"
              value={form.time}
              onChange={handleChange}
              required
            />
          </Field>
        </div>
        <Field label="Lugar">
          <input
            className={inputClass}
            name="place"
            value={form.place}
            onChange={handleChange}
            required
          />
        </Field>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}