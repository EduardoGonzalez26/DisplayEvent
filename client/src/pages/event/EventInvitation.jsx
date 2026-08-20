import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api.js";
import { Button } from "../../components/ui.jsx";
import { TEMPLATES, DEFAULT_THEME_ID } from "../../invitation/themes/index.js";
import InvitationView from "../../invitation/InvitationView.jsx";
import {
  getFieldsForTemplate,
  getField,
  setField,
} from "../../invitation/themes/fields.js";

const EMPTY = {
  version: 1,
  template: DEFAULT_THEME_ID,
  kicker: "",
  hero_image: "",
  tagline: "",
  message: "",
  celebrants: "",
  celebrant_name: "",
  registry_note: "",
  padrinos: [],
  itinerary: [{ label: "", time: "" }],
  locations: [{ label: "", place: "", url: "" }],
  gallery: [],
  dress_code: "",
  dress_note: "",
  contacts: [{ name: "", phone: "" }],
  contact_note: "",
};

// Convierte un config guardado (JSONB) al estado del formulario, tolerando
// formatos viejos (itinerario con place, dress_code como string, etc.).
function toFormState(cfg) {
  const oldItin = cfg.itinerary || [];
  const hasLocations = Array.isArray(cfg.locations) && cfg.locations.length;
  const legacy = oldItin.filter((it) => it.place);
  const formItinerary = oldItin
    .map((it) => ({ label: it.label, time: it.time }))
    .filter((it) => it.label || it.time);
  const mapLoc = (l) => ({ label: l.label, place: l.place, url: l.url || "" });
  const formLocations = hasLocations
    ? cfg.locations.map(mapLoc)
    : legacy.map(mapLoc).filter((l) => l.place);
  return {
    ...EMPTY,
    ...cfg,
    version: cfg.version || 1,
    template: cfg.template || DEFAULT_THEME_ID,
    itinerary: formItinerary.length ? formItinerary : EMPTY.itinerary,
    locations: formLocations.length ? formLocations : EMPTY.locations,
    gallery: cfg.gallery || [],
    contacts:
      cfg.contacts && cfg.contacts.length
        ? cfg.contacts.map((c) => ({ name: c.name || "", phone: c.phone || "" }))
        : [{ name: "", phone: "" }],
    contact_note: cfg.contact_note || "",
    dress_note: cfg.dress_note || "",
    parents:
      Array.isArray(cfg.parents)
        ? cfg.parents.map((p) => (p && typeof p === "object" ? p.name : p) || "")
        : [],
    padrinos:
      Array.isArray(cfg.padrinos)
        ? cfg.padrinos.map((p) => (p && typeof p === "object" ? p.name : p) || "")
        : [],
    dress_code: (cfg.dress_code || []).map((d) => d.label || d).join("\n"),
  };
}

// Claves estables por fila de listas editables: se conservan al reordenar y se
// descartan al guardar (save() serializa solo los campos conocidos).
let rowUid = 0;
const withUid = (item) => ({ ...item, _uid: ++rowUid });
const withUids = (list) => list.map((item) => (item && item._uid ? item : withUid(item)));

function normalizeLists(f) {
  return {
    ...f,
    itinerary: withUids(f.itinerary || []),
    locations: withUids(f.locations || []),
    contacts: withUids(f.contacts || []),
  };
}

function ImageUploader({ label, value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await api.upload(file);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-start gap-3">
        {value ? (
          <img src={value} alt={label} className="w-28 h-20 shrink-0 rounded-lg border border-gold-400/30 object-cover" />
        ) : (
          <div className="w-28 h-20 shrink-0 rounded-lg border border-dashed border-gray-700 grid place-items-center text-gray-600 text-xs">
            Sin imagen
          </div>
        )}
        <div className="flex-1">
          <span className="text-sm text-gray-400 mb-1.5 block">{label}</span>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFiles} />
          <div className="flex gap-2 items-center">
            <Button type="button" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? "Subiendo…" : value ? "Reemplazar imagen" : "Subir imagen"}
            </Button>
            {value && (
              <button type="button" onClick={() => onChange("")} className="text-sm text-red-500 hover:text-red-400">
                Quitar
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Se almacena vía API de subida (Cloudinary o disco local). Sube la imagen directamente, sin URL.
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}

export default function EventInvitation() {
  const { id } = useParams();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const galleryInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [event, setEvent] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplSaving, setTplSaving] = useState(false);
  const [tplError, setTplError] = useState("");

  useEffect(() => {
    api.events.get(id).then(setEvent).catch(() => setEvent(null));
    api.templates.list().then(setTemplates).catch(() => setTemplates([]));
    api.groups.list(id).then(setGroups).catch(() => setGroups([]));
    api.events
      .invitation(id)
      .then((cfg) => setForm(normalizeLists(toFormState(cfg))))
      .catch(() => setForm(EMPTY))
      .finally(() => setLoading(false));
  }, [id]);

  const invitationToken = groups.find((g) => g.invitation_token)?.invitation_token;
  const openInvitation = () => {
    if (invitationToken) {
      window.open(`/invitacion/${invitationToken}`, "_blank", "noopener");
    }
  };

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setItin = (i, key, value) =>
    setForm((f) => ({
      ...f,
      itinerary: f.itinerary.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)),
    }));
  const addItin = () =>
    setForm((f) => ({ ...f, itinerary: [...f.itinerary, withUid({ label: "", time: "" })] }));
  const delItin = (i) =>
    setForm((f) => ({ ...f, itinerary: f.itinerary.filter((_, idx) => idx !== i) }));
  const setLoc = (i, key, value) =>
    setForm((f) => ({
      ...f,
      locations: f.locations.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)),
    }));
  const addLoc = () =>
    setForm((f) => ({
      ...f,
      locations: [...f.locations, withUid({ label: "", place: "", url: "" })],
    }));
  const delLoc = (i) =>
    setForm((f) => ({ ...f, locations: f.locations.filter((_, idx) => idx !== i) }));

  const setExtra = (key, value) => setForm((f) => setField(f, key, value));

  const listOf = (cfg, key) =>
    Array.isArray(getField(cfg, key)) ? getField(cfg, key) : [];
  const setListItem = (key, idx, value) =>
    setForm((f) =>
      setField(f, key, listOf(f, key).map((it, i) => (i === idx ? value : it))),
    );
  const addListItem = (key) =>
    setForm((f) => setField(f, key, [...listOf(f, key), ""]));
  const removeListItem = (key, idx) =>
    setForm((f) => setField(f, key, listOf(f, key).filter((_, i) => i !== idx)));

  const setContact = (i, key, value) =>
    setForm((f) => ({
      ...f,
      contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)),
    }));
  const addContact = () =>
    setForm((f) => ({ ...f, contacts: [...f.contacts, withUid({ name: "", phone: "" })] }));
  const delContact = (i) =>
    setForm((f) => ({ ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }));

  const selectTemplate = (templateId) => {
    setForm((f) => {
      const next = { ...f, template: templateId };
      // Boda: "Ceremonia y recepción" por defecto si aún no hay ubicaciones reales.
      if (templateId === "boda" && !f.locations.some((l) => l.place)) {
        next.locations = [
          withUid({ label: "Ceremonia", place: "", url: "" }),
          withUid({ label: "Recepción", place: "", url: "" }),
        ];
      }
      return normalizeLists(next);
    });
  };

  const saveTemplate = async () => {
    if (!tplName.trim()) {
      setTplError("Escribe un nombre para la plantilla");
      return;
    }
    setTplSaving(true);
    setTplError("");
    try {
      const tpl = await api.templates.create({ name: tplName.trim(), config: form });
      setTemplates((prev) => [tpl, ...prev]);
      setTplName("");
      setTplError("");
    } catch (err) {
      setTplError(err.message);
    } finally {
      setTplSaving(false);
    }
  };

  const useTemplate = async (tpl) => {
    setTplError("");
    try {
      const full = await api.templates.get(tpl.id);
      setForm(normalizeLists(toFormState(full.config)));
      setTplOpen(false);
      setMessage(`Plantilla "${full.name}" aplicada. Recuerda guardar los cambios.`);
    } catch (err) {
      setTplError(err.message);
    }
  };

  const deleteTemplate = async (tpl) => {
    if (!confirm(`¿Eliminar la plantilla "${tpl.name}"?`)) return;
    try {
      await api.templates.remove(tpl.id);
      setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
    } catch (err) {
      setTplError(err.message);
    }
  };

  const handleGalleryFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = [];
      for (const file of files) {
        const { url } = await api.upload(file);
        urls.push(url);
      }
      setForm((f) => ({ ...f, gallery: [...f.gallery, ...urls] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const missing = templateFields.filter((f) => {
      const value = getField(form, f.key);
      if (f.type === "list") {
        return f.required && (!Array.isArray(value) || value.length === 0 || value.some((s) => !String(s || "").trim()));
      }
      return f.required && !String(value || "").trim();
    });
    if (missing.length > 0) {
      setError(
        `Faltan campos obligatorios del formato: ${missing.map((f) => f.label).join(", ")}`,
      );
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        ...form,
        gallery: form.gallery.filter(Boolean),
        parents: (form.parents || [])
          .map((p) => String(p || "").trim())
          .filter(Boolean),
        padrinos: (form.padrinos || [])
          .map((p) => String(p || "").trim())
          .filter(Boolean),
        contacts: form.contacts
          .map((c) => ({ name: (c.name || "").trim(), phone: (c.phone || "").trim() }))
          .filter((c) => c.name || c.phone),
        contact_note: (form.contact_note || "").trim(),
        dress_code: form.dress_code.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => ({ label: line })),
        dress_note: (form.dress_note || "").trim(),
        itinerary: form.itinerary.map((it) => ({
          label: it.label,
          time: it.time,
        })).filter((it) => it.label || it.time),
        locations: form.locations.map((l) => ({
          label: l.label,
          place: l.place,
          url: l.url,
        })).filter((l) => l.place),
      };
      await api.events.setInvitation(id, payload);
      setMessage("Configuración guardada correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400">Cargando…</p>;

  const templateFields = getFieldsForTemplate(form.template);

  const inputCls =
    "w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-white">Invitación</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            Vista previa
          </Button>
          {invitationToken && (
            <Button variant="secondary" onClick={openInvitation}>
              Ver invitación
            </Button>
          )}
          <Button variant="secondary" onClick={() => setTplOpen(true)}>
            Plantillas
          </Button>
          <Button onClick={save} disabled={saving || uploading}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Configura el contenido de la landing pública /invitacion/&lt;hash&gt;. Los grupos tienen enlaces únicos activos desde su creación.
      </p>
      {message && <p className="text-sm text-emerald-400 mb-4">{message}</p>}
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <form onSubmit={save} className="space-y-6">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-base font-semibold text-white mb-1">
            Formato de invitación
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Define el estilo y los datos que pide la invitación. Se aplica a la
            landing pública /invitacion/&lt;hash&gt;.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {TEMPLATES.map((t) => {
              const active = form.template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTemplate(t.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-gold-400 bg-gold-400/10 ring-1 ring-gold-400/40"
                      : "border-gray-700 bg-gray-950 hover:border-gray-500"
                  }`}
                >
                  <span
                    className={`block text-sm font-semibold ${active ? "text-gold-300" : "text-white"}`}
                  >
                    {t.label}
                  </span>
                  <span className="block mt-1 text-xs text-gray-400">
                    {t.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {templateFields.length > 0 && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-base font-semibold text-white mb-4">
              Datos del formato
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Campos propios de este formato. Los obligatorios se validan al
              guardar.
            </p>
            <div className="grid gap-3">
              {templateFields.map((f) => {
                const value = getField(form, f.key) || "";
                const label = (
                  <span className="text-sm text-gray-400 mb-1 block">
                    {f.label}
                    {f.required && <span className="text-red-400"> *</span>}
                  </span>
                );
                if (f.type === "list") {
                  return (
                    <div key={f.key} className="block">
                      {label}
                      <div className="space-y-2">
                        {listOf(form, f.key).map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              className={inputCls}
                              value={item || ""}
                              onChange={(e) => setListItem(f.key, i, e.target.value)}
                              placeholder={f.placeholder}
                            />
                            <button
                              type="button"
                              onClick={() => removeListItem(f.key, i)}
                              className="shrink-0 text-sm text-red-500 hover:text-red-400 px-2"
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => addListItem(f.key)}
                        >
                          + Agregar {f.itemLabel || "elemento"}
                        </Button>
                      </div>
                    </div>
                  );
                }
                if (f.type === "select") {
                  return (
                    <label key={f.key} className="block">
                      {label}
                      <select
                        className={inputCls}
                        value={value || ""}
                        onChange={(e) => setExtra(f.key, e.target.value)}
                      >
                        <option value="">Sin seleccionar</option>
                        {(f.options || []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }
                return f.type === "textarea" ? (
                  <label key={f.key} className="block">
                    {label}
                    <textarea
                      className={inputCls}
                      rows={3}
                      value={value}
                      onChange={(e) => setExtra(f.key, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  </label>
                ) : (
                  <label key={f.key} className="block">
                    {label}
                    <input
                      className={inputCls}
                      value={value}
                      onChange={(e) => setExtra(f.key, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  </label>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-base font-semibold text-white mb-4">Portada (Hero)</h2>
          <div className="grid gap-3">
            <ImageUploader label="Foto de fondo (subida directa)" value={form.hero_image} onChange={(url) => set("hero_image", url)} />
            <label className="block">
              <span className="text-sm text-gray-400 mb-1 block">O pega una URL (opcional)</span>
              <input className={inputCls} value={form.hero_image} onChange={(e) => set("hero_image", e.target.value)} placeholder="https://…" />
            </label>
            <label className="block">
              <span className="text-sm text-gray-400 mb-1 block">Frase superior (eyebrow)</span>
              <input className={inputCls} value={form.kicker} onChange={(e) => set("kicker", e.target.value)} placeholder="Invitación especial" />
            </label>
            <label className="block">
              <span className="text-sm text-gray-400 mb-1 block">Frase bajo el título</span>
              <input className={inputCls} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Los invitamos a celebrar…" />
            </label>
            <label className="block">
              <span className="text-sm text-gray-400 mb-1 block">¿Quién celebra? (nombre del homenajeado/a)</span>
              <input className={inputCls} value={form.celebrants} onChange={(e) => set("celebrants", e.target.value)} placeholder="Alice" />
            </label>
            <p className="text-xs text-gray-500">
              {`Si dejas vacío "Frase bajo el título", se armará sola: "Los invitados a celebrar junto a {celébrats} este día tan especial."`}
            </p>
            <label className="block">
              <span className="text-sm text-gray-400 mb-1 block">Mensaje de bienvenida (se muestra con el nombre de la familia)</span>
              <textarea className={inputCls} rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Familia …, la alegría de contar con ustedes…" />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Itinerario</h2>
            <Button variant="secondary" type="button" onClick={addItin}>
              + Agregar
            </Button>
          </div>
          <p className="text-sm text-gray-500 mb-3">La secuencia de momentos del evento (etiqueta y hora).</p>
          <div className="space-y-3">
            {form.itinerary.map((it, i) => (
              <div key={it._uid ?? i} className="rounded-xl border border-gray-800 p-3 grid md:grid-cols-2 gap-2">
                <input className={inputCls} value={it.label} onChange={(e) => setItin(i, "label", e.target.value)} placeholder="Etiqueta (Ceremonia)" />
                <div className="flex gap-2">
                  <input className={inputCls} value={it.time} onChange={(e) => setItin(i, "time", e.target.value)} placeholder="Hora (17:00)" />
                  <button type="button" onClick={() => delItin(i)} className="shrink-0 text-sm text-red-500 hover:text-red-400 px-2">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Ubicaciones</h2>
            <Button variant="secondary" type="button" onClick={addLoc}>
              + Agregar
            </Button>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Escribe el lugar y, si lo tienes, pega el enlace del mapa (opcional). Los botones abrirán Google
            Maps/Waze con ese enlace o buscando por el nombre.
          </p>
          <div className="space-y-3">
            {form.locations.map((l, i) => (
              <div key={l._uid ?? i} className="rounded-xl border border-gray-800 p-3 grid md:grid-cols-2 gap-2">
                <input className={inputCls} value={l.label} onChange={(e) => setLoc(i, "label", e.target.value)} placeholder="Etiqueta (Ceremonia)" />
                <input className={inputCls} value={l.place} onChange={(e) => setLoc(i, "place", e.target.value)} placeholder="Lugar (Catedral San José)" />
                <div className="flex gap-2 md:col-span-2">
                  <input className={inputCls} value={l.url} onChange={(e) => setLoc(i, "url", e.target.value)} placeholder="Enlace Google Maps (https://…, opcional)" />
                  <button type="button" onClick={() => delLoc(i)} className="shrink-0 text-sm text-red-500 hover:text-red-400 px-2">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-base font-semibold text-white mb-3">Dress code</h2>
          <textarea className={inputCls} rows={3} value={form.dress_code} onChange={(e) => set("dress_code", e.target.value)} placeholder={"Un elemento por línea, ej.\nFormal"} />
          <label className="block mt-3">
            <span className="text-sm text-gray-400 mb-1 block">Nota del dress code (opcional)</span>
            <input className={inputCls} value={form.dress_note} onChange={(e) => set("dress_note", e.target.value)} placeholder="Ej. No olviden su saco, la noche puede refrescar" />
          </label>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Contactos (RSVP)</h2>
            <Button variant="secondary" type="button" onClick={addContact}>
              + Agregar
            </Button>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Se muestran en el modal de confirmación y en la confirmación final. Si
            no hay ninguno, esa sección se oculta.
          </p>
          <div className="space-y-3">
            {form.contacts.map((c, i) => (
              <div key={c._uid ?? i} className="rounded-xl border border-gray-800 p-3 grid md:grid-cols-2 gap-2">
                <input className={inputCls} value={c.name} onChange={(e) => setContact(i, "name", e.target.value)} placeholder="Nombre (Papá)" />
                <div className="flex gap-2">
                  <input className={inputCls} value={c.phone} onChange={(e) => setContact(i, "phone", e.target.value)} placeholder="Teléfono (Ej. 5512345678)" />
                  <button type="button" onClick={() => delContact(i)} className="shrink-0 text-sm text-red-500 hover:text-red-400 px-2">Quitar</button>
                </div>
              </div>
            ))}
          </div>
          <label className="block mt-4">
            <span className="text-sm text-gray-400 mb-1 block">Mensaje de aclaración (opcional)</span>
            <input className={inputCls} value={form.contact_note} onChange={(e) => set("contact_note", e.target.value)} placeholder="Ej. Escríbenos o llámanos si tienes dudas" />
          </label>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Galería de fotos</h2>
            <Button variant="secondary" type="button" disabled={uploading} onClick={() => galleryInputRef.current?.click()}>
              {uploading ? "Subiendo…" : "+ Subir imágenes"}
            </Button>
            <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={handleGalleryFiles} />
          </div>
          {form.gallery.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay fotos. Sube las que quieras mostrar en la invitación.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {form.gallery.map((src) => (
                <div key={src} className="group relative">
                  <img src={src} alt="" className="aspect-square w-full rounded-lg border border-zinc-700 object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, gallery: f.gallery.filter((_, idx) => idx !== i) }))}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Quitar"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="flex justify-end">
          <Button type="submit" disabled={saving || uploading}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </footer>
      </form>

      {previewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="relative z-10 max-w-3xl mx-auto my-6">
            <div className="sticky top-4 z-20 flex justify-end pr-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-full bg-gray-900/90 border border-gray-700 text-white text-sm px-4 py-2 shadow-lg hover:border-gray-500"
              >
                Cerrar preview
              </button>
            </div>
            {event && (
              <InvitationView
                event={event}
                family="Familia de ejemplo"
                cfg={form}
                preview
              />
            )}
          </div>
        </div>
      )}

      {tplOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center px-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setTplOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-1">Plantillas de invitación</h2>
            <p className="text-sm text-gray-500 mb-4">
              Guarda la configuración actual para reutilizarla en otros eventos. Las plantillas son privadas de tu cuenta.
            </p>

            <label className="block mb-2">
              <span className="text-sm text-gray-400 mb-1 block">Nombre de la plantilla</span>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="Ej. Boda elegante 2026"
                />
                <Button type="button" variant="secondary" disabled={tplSaving} onClick={saveTemplate}>
                  {tplSaving ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </label>

            {tplError && <p className="text-sm text-red-400 mb-3">{tplError}</p>}

            <div className="max-h-64 overflow-y-auto space-y-2 mt-4">
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  Aún no tienes plantillas guardadas.
                </p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-800 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{t.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(t.created_at).toLocaleDateString("es-MX")}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => useTemplate(t)}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Usar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t)}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end mt-5">
              <Button variant="secondary" type="button" onClick={() => setTplOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}