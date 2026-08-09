import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api.js";
import { Button } from "../../components/ui.jsx";

const EMPTY = {
  kicker: "",
  hero_image: "",
  tagline: "",
  message: "",
  itinerary: [{ label: "", time: "" }],
  locations: [{ label: "", place: "", url: "" }],
  gallery: [],
  dress_code: "",
};

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

  useEffect(() => {
    api.events
      .invitation(id)
      .then((cfg) => {
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

        setForm({
          ...EMPTY,
          ...cfg,
          itinerary: formItinerary.length ? formItinerary : EMPTY.itinerary,
          locations: formLocations.length ? formLocations : EMPTY.locations,
          gallery: cfg.gallery || [],
          dress_code: (cfg.dress_code || []).map((d) => d.label || d).join("\n"),
        });
      })
      .catch(() => setForm(EMPTY))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setItin = (i, key, value) =>
    setForm((f) => ({
      ...f,
      itinerary: f.itinerary.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)),
    }));
  const addItin = () => setForm((f) => ({ ...f, itinerary: [...f.itinerary, { label: "", time: "" }] }));
  const delItin = (i) =>
    setForm((f) => ({ ...f, itinerary: f.itinerary.filter((_, idx) => idx !== i) }));
  const setLoc = (i, key, value) =>
    setForm((f) => ({
      ...f,
      locations: f.locations.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)),
    }));
  const addLoc = () =>
    setForm((f) => ({ ...f, locations: [...f.locations, { label: "", place: "", url: "" }] }));
  const delLoc = (i) =>
    setForm((f) => ({ ...f, locations: f.locations.filter((_, idx) => idx !== i) }));

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
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        ...form,
        gallery: form.gallery.filter(Boolean),
        dress_code: form.dress_code.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => ({ label: line })),
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

  const inputCls =
    "w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-white">Invitación</h1>
        <Button onClick={save} disabled={saving || uploading}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Configura el contenido de la landing pública /invitacion/&lt;hash&gt;. Los grupos tienen enlaces únicos activos desde su creación.
      </p>
      {message && <p className="text-sm text-emerald-400 mb-4">{message}</p>}
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <form onSubmit={save} className="space-y-6">
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
              <div key={i} className="rounded-xl border border-gray-800 p-3 grid md:grid-cols-2 gap-2">
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
              <div key={i} className="rounded-xl border border-gray-800 p-3 grid md:grid-cols-2 gap-2">
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
              {form.gallery.map((src, i) => (
                <div key={i} className="group relative">
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
    </div>
  );
}