import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api.js";
import { buildInviteUrl, normalizeDomain } from "../../lib/publicDomain.js";
import { Button } from "../../components/ui.jsx";
import { TEMPLATES } from "../../invitation/themes/index.js";
import InvitationView from "../../invitation/InvitationView.jsx";
import {
  getFieldsForTemplate,
  getField,
  setField,
} from "../../invitation/schema/fields.js";
import {
  toFormState,
  serializeForm,
  withUid,
} from "../../invitation/schema/normalize.js";
import StayTravelEditor from "./StayTravelEditor.jsx";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MIN = 3;
const SLUG_MAX = 60;

// Claves de `EXTRA_FIELDS` que se editan en secciones dedicadas (no en la
// grilla genérica "Datos del formato"): historia/música, hospedaje/viaje
// legado y los bloques nuevos `stay`/`trip` del formato editorial
// `boda_jorge_macarena` (fase B del editor).
const CUSTOM_EXTRA_KEYS = new Set([
  "story",
  "music_url",
  "lodging",
  "travel",
  "stay",
  "trip",
]);

/* ------------------------------------------------------------------
   Stripe Connect (panel): país de la cuenta y estado legible.
------------------------------------------------------------------ */

const STRIPE_COUNTRY_OPTIONS = [
  { value: "MX", label: "México (MXN)" },
  { value: "ES", label: "España (EUR)" },
];

function stripeCountryLabel(code) {
  const found = STRIPE_COUNTRY_OPTIONS.find(
    (o) => o.value === String(code || "").trim().toUpperCase()
  );
  return found ? found.label : String(code || "—");
}

/* Estado de una cuenta Connect a partir de sus flags:
   - Activa: cobros y retiros habilitados.
   - Sin completar: el onboarding no se ha enviado.
   - Con observaciones: enviado pero con una capability pendiente/limitada.
   - En revisión: enviado y sin capabilities activas todavía. */
function stripeAccountStatus(acc) {
  const charges = !!acc?.charges_enabled;
  const payouts = !!acc?.payouts_enabled;
  const submitted = !!acc?.details_submitted;
  if (charges && payouts) {
    return {
      label: "Activa",
      cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    };
  }
  if (!submitted) {
    return {
      label: "Sin completar",
      cls: "border-gray-600/60 bg-gray-800 text-gray-400",
    };
  }
  if (charges || payouts) {
    return {
      label: "Con observaciones",
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    };
  }
  return {
    label: "En revisión",
    cls: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  };
}

// Convierte el nombre del evento en un slug URL-amigable (misma lógica que el
// backend) para sugerirlo cuando el evento todavía no tiene slug.
function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

// Devuelve el motivo del error o "" si el slug es válido (vacío = autogenerar).
function slugFormatError(slug) {
  if (!slug) return "";
  if (slug.length < SLUG_MIN) return `debe tener al menos ${SLUG_MIN} caracteres`;
  if (slug.length > SLUG_MAX) return `no puede superar los ${SLUG_MAX} caracteres`;
  if (!SLUG_RE.test(slug)) {
    return "solo puede contener minúsculas, números y guiones (sin guiones dobles ni en los extremos)";
  }
  return "";
}

// Mismo formato y longitud que valida el backend para `custom_domain`:
// hostname con al menos un punto (ej. macarenayjorge.com), sin protocolo.
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const DOMAIN_MAX = 255;

// Devuelve el motivo del error o "" si el dominio es válido (vacío = sin dominio).
function domainFormatError(domain) {
  if (!domain) return "";
  if (domain.length > DOMAIN_MAX) return `no puede superar los ${DOMAIN_MAX} caracteres`;
  if (!DOMAIN_RE.test(domain)) {
    return "debe ser un hostname válido, por ejemplo macarenayjorge.com (sin protocolo ni ruta)";
  }
  return "";
}

/* ------------------------------------------------------------------
   Subida de archivos del editor (imágenes y audio) vía POST /api/uploads.
   El endpoint acepta imágenes (JPG/PNG/WEBP/GIF, 8 MB) y audio
   (MP3/M4A/OGG, 15 MB), y responde { url }. La configuración por tipo
   (accept, mimes, límite y textos) vive en `UPLOAD_KINDS`; el componente
   se usa igual para la foto de portada (kind="image", por defecto) y para
   el archivo de música (kind="audio").
------------------------------------------------------------------ */

// Extensión -> mimetype esperado. Se usa SOLO como respaldo cuando el
// navegador no reporta `file.type` (evita rechazar audios válidos) y para
// re-envolver el archivo con el mime correcto antes de subirlo.
const EXT_TO_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
};

const UPLOAD_KINDS = {
  image: {
    accept: "image/jpeg,image/png,image/webp,image/gif",
    mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxBytes: 8 * 1024 * 1024,
    emptyText: "Sin imagen",
    idleLabel: "Subir imagen",
    replaceLabel: "Reemplazar imagen",
    mimeError: "Solo se permiten imágenes JPG, PNG, WEBP o GIF",
    sizeError: "La imagen supera el tamaño máximo de 8 MB",
    help: "Se almacena vía API de subida (Cloudinary o disco local). Sube la imagen directamente, sin URL.",
  },
  audio: {
    accept: ".mp3,.m4a,.ogg,audio/*",
    mimes: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/ogg"],
    maxBytes: 15 * 1024 * 1024,
    emptyText: "Sin audio",
    idleLabel: "Subir audio",
    replaceLabel: "Reemplazar audio",
    mimeError: "Solo se permiten audios MP3, M4A u OGG",
    sizeError: "El audio supera el tamaño máximo de 15 MB",
    help: "MP3, M4A u OGG · máx. 15 MB.",
  },
};

// Extensión en minúsculas de un nombre de archivo ("" si no tiene).
function fileExt(name) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

/* Valida tamaño y tipo ANTES de subir (espejo del endpoint). El mime que
   reporta el navegador manda; si viene vacío se infiere por extensión y, en
   ese caso, se re-envuelve el File con el mime inferido para que el backend
   lo acepte con su content-type correcto. Devuelve `{ file }` o `{ error }`. */
function validateUploadFile(file, config) {
  if (file.size > config.maxBytes) return { error: config.sizeError };
  const inferred = EXT_TO_MIME[fileExt(file.name)] || "";
  const mime = file.type || inferred;
  if (mime && !config.mimes.includes(mime)) return { error: config.mimeError };
  if (!file.type && inferred && config.mimes.includes(inferred)) {
    try {
      return { file: new File([file], file.name, { type: inferred }) };
    } catch {
      /* noop: navegadores sin constructor File conservan el original */
    }
  }
  return { file };
}

/* Ícono de nota musical (estado "audio cargado"). */
function MusicNoteIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </svg>
  );
}

function FileUploader({ label, value, onChange, kind = "image", onUploadingChange }) {
  const config = UPLOAD_KINDS[kind] || UPLOAD_KINDS.image;
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    const { file: safeFile, error: validationError } = validateUploadFile(file, config);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
    // Avisa al editor: mientras haya una subida en curso, "Guardar cambios"
    // se deshabilita para no persistir el valor anterior del campo.
    onUploadingChange?.(true);
    try {
      const { url } = await api.upload(safeFile);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div>
      <div className="flex items-start gap-3">
        {value ? (
          kind === "audio" ? (
            <div className="w-28 h-20 shrink-0 rounded-lg border border-gold-400/30 grid place-items-center text-gold-300">
              <MusicNoteIcon className="w-6 h-6" />
            </div>
          ) : (
            <img src={value} alt={label} className="w-28 h-20 shrink-0 rounded-lg border border-gold-400/30 object-cover" />
          )
        ) : (
          <div className="w-28 h-20 shrink-0 rounded-lg border border-dashed border-gray-700 grid place-items-center text-gray-600 text-xs">
            {config.emptyText}
          </div>
        )}
        <div className="flex-1">
          <span className="text-sm text-gray-400 mb-1.5 block">{label}</span>
          <input
            ref={inputRef}
            type="file"
            accept={config.accept}
            className="hidden"
            onChange={handleFiles}
          />
          <div className="flex gap-2 items-center">
            <Button type="button" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? "Subiendo…" : value ? config.replaceLabel : config.idleLabel}
            </Button>
            {value && (
              <button type="button" onClick={() => onChange("")} className="text-sm text-red-500 hover:text-red-400">
                Quitar
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1.5">{config.help}</p>
        </div>
      </div>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}

// Editor de lista de montos (suggested_mxn / suggested_eur). Los valores se
// editan como strings y `normalizeRegistry` los coerce a enteros al guardar.
function AmountListEditor({ inputCls, label, values, onChange }) {
  const update = (i, v) => onChange(values.map((x, idx) => (idx === i ? v : x)));
  const add = () => onChange([...values, ""]);
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="block">
      <span className="text-sm text-gray-400 mb-1 block">{label}</span>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="number"
              min={0}
              step={1}
              className={inputCls}
              value={String(v ?? "")}
              onChange={(e) => update(i, e.target.value)}
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 text-sm text-red-500 hover:text-red-400 px-2"
            >
              Quitar
            </button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={add}>
          + Agregar monto
        </Button>
      </div>
    </div>
  );
}

export default function EventInvitation() {
  const { id } = useParams();
  const [form, setForm] = useState(() => toFormState({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const galleryInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  // Subidas de archivo sueltas (portada / audio). Cuenta las activas para
  // bloquear "Guardar cambios" mientras alguna esté en curso y evitar que un
  // guardado a medias persista el valor anterior del campo.
  const fileUploadsRef = useRef(0);
  const [fileUploading, setFileUploading] = useState(false);
  const onFileUploadingChange = (active) => {
    fileUploadsRef.current = Math.max(0, fileUploadsRef.current + (active ? 1 : -1));
    setFileUploading(fileUploadsRef.current > 0);
  };
  const [event, setEvent] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplSaving, setTplSaving] = useState(false);
  const [tplError, setTplError] = useState("");
  const [slug, setSlug] = useState("");
  // Dominio personalizado del evento (hostname sin protocolo; "" = sin dominio).
  const [customDomain, setCustomDomain] = useState("");
  // null | "checking" | "available" | "taken" | "current"
  const [slugStatus, setSlugStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  // Stripe Connect: cuentas del usuario (para cobrar con tarjeta).
  const [stripeAccounts, setStripeAccounts] = useState([]);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeError, setStripeError] = useState("");
  const [stripeErrorHint, setStripeErrorHint] = useState("");
  const [stripeCountry, setStripeCountry] = useState("MX");
  const [stripeConnecting, setStripeConnecting] = useState(false);
  // Cuenta Connect elegida para este evento (`events.stripe_account_id`).
  // "" = automática (el backend resuelve por moneda/dueño). Se persiste con
  // el update del evento, no con la configuración de invitación.
  const [stripeAccountId, setStripeAccountId] = useState("");
  // Solo la preselección automática inicial puede rellenar el selector; si el
  // usuario elige "Automática" explícitamente, no se vuelve a imponer.
  const stripeSelectionTouchedRef = useRef(false);

  const loadStripeAccounts = () => {
    setStripeLoading(true);
    setStripeError("");
    setStripeErrorHint("");
    api.stripe
      .accounts()
      .then((list) => setStripeAccounts(Array.isArray(list) ? list : []))
      .catch((err) => setStripeError(err.message))
      .finally(() => setStripeLoading(false));
  };

  // Crea la cuenta Express y redirige al onboarding de Stripe.
  const connectStripe = async () => {
    setStripeConnecting(true);
    setStripeError("");
    setStripeErrorHint("");
    try {
      const { url } = await api.stripe.createAccount({ country: stripeCountry });
      if (!url) throw new Error("Stripe no devolvió la URL de onboarding.");
      window.location.href = url; // navega fuera de la SPA
    } catch (err) {
      setStripeError(err.message);
      // El 502 típico es la política de la cuenta de Stripe: requiere
      // habilitar la creación de cuentas Connect ("Accounts v1").
      if (err.status === 502) {
        setStripeErrorHint(
          "Activa la creación de cuentas Connect en tu dashboard de Stripe " +
            "(Connect → Accounts v1) y vuelve a intentarlo."
        );
      }
      setStripeConnecting(false);
    }
  };

  // Al volver del onboarding (?stripe=return|refresh) el estado puede haber
  // cambiado: se recargan las cuentas al entrar al editor.
  useEffect(() => {
    loadStripeAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preselecciona la única cuenta habilitada cuando el evento aún no tiene una
  // asignada. Es solo estado local: no se guarda hasta pulsar "Guardar cambios".
  useEffect(() => {
    if (stripeSelectionTouchedRef.current) return;
    if (stripeLoading || !event || stripeAccountId) return;
    const enabled = stripeAccounts.filter((acc) => acc?.charges_enabled === true);
    if (enabled.length === 1) {
      setStripeAccountId(enabled[0].stripe_account_id || "");
    }
  }, [event, stripeAccountId, stripeAccounts, stripeLoading]);

  useEffect(() => {
    setEvent(null);
    setSlug("");
    setCustomDomain("");
    setStripeAccountId("");
    stripeSelectionTouchedRef.current = false;
    api.events
      .get(id)
      .then((ev) => {
        setEvent(ev);
        // Si el evento aún no tiene slug (eventos antiguos), sugerimos uno.
        setSlug(ev?.slug || slugify(ev?.name || ""));
        setCustomDomain(ev?.custom_domain || "");
        setStripeAccountId(ev?.stripe_account_id || "");
      })
      .catch(() => setEvent(null));
    api.templates.list().then(setTemplates).catch(() => setTemplates([]));
    api.groups.list(id).then(setGroups).catch(() => setGroups([]));
    api.events
      .invitation(id)
      .then((cfg) => setForm(toFormState(cfg)))
      .catch(() => setForm(toFormState({})))
      .finally(() => setLoading(false));
  }, [id]);

  const slugValue = slug.trim().toLowerCase();
  const slugError = slugFormatError(slugValue);
  const slugHint = slugError
    ? { text: `El slug ${slugError}.`, cls: "text-red-400" }
    : !slugValue
      ? {
          text: "Déjalo vacío para generarlo automáticamente desde el nombre del evento.",
          cls: "text-gray-500",
        }
      : slugStatus === "checking"
        ? { text: "Comprobando disponibilidad…", cls: "text-gray-500" }
        : slugStatus === "available" || slugStatus === "current"
          ? { text: "Disponible.", cls: "text-emerald-400" }
          : slugStatus === "taken"
            ? {
                text: "Ya está en uso; al guardar se usará una variante con sufijo.",
                cls: "text-amber-400",
              }
            : null;

  // Comprueba disponibilidad del slug con un pequeño debounce. Si el endpoint
  // aún no existe en el backend, se ignora en silencio (sin bloquear el guardado).
  useEffect(() => {
    if (!slugValue || slugError) {
      setSlugStatus(null);
      return;
    }
    if (event?.slug && slugValue === event.slug) {
      setSlugStatus("current");
      return;
    }
    let cancelled = false;
    setSlugStatus("checking");
    const timer = setTimeout(() => {
      api.events
        .slugAvailable(slugValue)
        .then((res) => {
          if (!cancelled) setSlugStatus(res.available ? "available" : "taken");
        })
        .catch(() => {
          if (!cancelled) setSlugStatus(null);
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slugValue, slugError, event?.slug]);

  const invitationToken = groups.find((g) => g.invitation_token)?.invitation_token;
  const domainValue = normalizeDomain(customDomain);
  const domainError = domainFormatError(domainValue);
  // Con dominio propio el enlace no lleva slug: https://<dominio>/invitacion/<token>.
  // Sin dominio se conserva el formato actual (origen + slug + token).
  const publicUrl = buildInviteUrl({
    domain: domainValue,
    slug: slugValue,
    token: invitationToken,
  });

  // Para "Ver invitación" usamos el slug ya guardado, no el borrador del formulario.
  const openInvitation = () => {
    if (!invitationToken) return;
    const path = event?.slug
      ? `/invitacion/${event.slug}/${invitationToken}`
      : `/invitacion/${invitationToken}`;
    window.open(path, "_blank", "noopener");
  };

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err.message);
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

  // Mesa de Regalos (`registry`): objeto con `bank` anidado. Escritura por
  // dot-path reutiliza `setField`; las listas de montos se editan como arrays.
  const setReg = (key, value) => setForm((f) => setField(f, `registry.${key}`, value));
  const setBank = (key, value) => setForm((f) => setField(f, `registry.bank.${key}`, value));

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
      if (
        (templateId === "boda" || templateId === "boda_jorge_macarena") &&
        !f.locations.some((l) => l.place)
      ) {
        next.locations = [
          withUid({ label: "Ceremonia", place: "", url: "" }),
          withUid({ label: "Recepción", place: "", url: "" }),
        ];
      }
      return next;
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
      setForm(toFormState(full.config));
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
    if (slugError) {
      setError(`Slug inválido: ${slugError}.`);
      return;
    }
    if (domainError) {
      setError(`El dominio personalizado ${domainError}.`);
      return;
    }
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
      const payload = serializeForm(form);
      const requests = [api.events.setInvitation(id, payload)];
      let updatedEvent = null;
      // El slug y el dominio personalizado viven en el evento (no en la config
      // de invitación): se guardan con el update del evento, reenviando sus
      // campos actuales. `custom_domain: ""` borra el dominio.
      if (event) {
        const eventPayload = {
          name: event.name,
          date: event.date,
          time: event.time,
          place: event.place,
          slug: slugValue,
          custom_domain: domainValue,
        };
        // Si la cuenta guardada ya no está habilitada o no aparece en la lista,
        // se omite la clave para que el backend conserve el valor almacenado y
        // se puedan guardar los demás cambios. "" (Automática) sí se reenvía
        // para limpiar la elección cuando el usuario la hace explícitamente.
        if (!stripeSelectionInvalid) {
          eventPayload.stripe_account_id = stripeAccountId || "";
        }
        requests.push(
          api.events
            .update(id, eventPayload)
            .then((updated) => {
              updatedEvent = updated;
              return updated;
            }),
        );
      }
      await Promise.all(requests);

      const finalSlug = updatedEvent?.slug || slugValue;
      if (updatedEvent) {
        setEvent(updatedEvent);
        setStripeAccountId(updatedEvent.stripe_account_id || "");
        // El backend normaliza el dominio (minúsculas, sin www): refleja lo guardado.
        if (typeof updatedEvent.custom_domain === "string") {
          setCustomDomain(updatedEvent.custom_domain);
        }
      }
      if (finalSlug && finalSlug !== slugValue) {
        setSlug(finalSlug);
        setMessage(
          slugValue
            ? `Configuración guardada. El slug "${slugValue}" ya estaba en uso; se guardó como "${finalSlug}".`
            : `Configuración guardada. Se asignó el slug "${finalSlug}".`,
        );
      } else {
        setMessage("Configuración guardada correctamente.");
      }
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

  const enabledStripeAccounts = stripeAccounts.filter(
    (acc) => acc?.charges_enabled === true
  );
  // Cuenta guardada en el evento: si desapareció de la lista o perdió los
  // cobros, no se reenvía al backend para no bloquear cambios no relacionados
  // ni redirigir cobros a otra cuenta sin una elección explícita del usuario.
  const selectedStripeAccount = stripeAccounts.find(
    (acc) => acc.stripe_account_id === stripeAccountId
  );
  const stripeSelectionInvalid =
    !!stripeAccountId &&
    (!selectedStripeAccount || selectedStripeAccount.charges_enabled !== true);
  // Aviso de la mesa de regalos: hay tarjeta activa, pero falta alguna lista de
  // montos y no se permite monto libre. No aplica con Payment Link externo
  // (el invitado elige el monto directamente en Stripe).
  const registryCfg = form.registry || {};
  const hasPaymentLink =
    String(registryCfg.payment_link_url || "").trim() !== "";
  const missingSuggestedAmounts =
    !!registryCfg.stripe_enabled &&
    !hasPaymentLink &&
    !registryCfg.allow_custom &&
    ["suggested_mxn", "suggested_eur"].some((key) => {
      const list = registryCfg[key];
      return (
        !Array.isArray(list) ||
        list.every((value) => String(value ?? "").trim() === "")
      );
    });

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
          <Button onClick={save} disabled={saving || uploading || fileUploading}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Configura el contenido de la invitación pública. Cada grupo tiene su propio
        enlace único (/invitacion/&lt;slug&gt;/&lt;token&gt;) activo desde su creación.
      </p>
      {message && <p className="text-sm text-emerald-400 mb-4">{message}</p>}
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <form onSubmit={save} className="space-y-6">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-base font-semibold text-white mb-1">Enlace público</h2>
          <p className="text-sm text-gray-500 mb-4">
            Personaliza la URL bonita de la invitación. El slug debe ser único: si
            ya está en uso, al guardar se añadirá un sufijo automáticamente.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="block">
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor="event-slug" className="text-sm text-gray-400">
                  Slug del evento
                </label>
                {event?.name && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlug(slugify(event.name));
                      setCopied(false);
                    }}
                    className="text-xs font-normal text-indigo-400 hover:text-indigo-300"
                  >
                    Usar sugerencia
                  </button>
                )}
              </div>
              <div className="flex items-center overflow-hidden rounded-lg border border-gray-700 bg-gray-950 focus-within:border-gold-400">
                <span aria-hidden="true" className="hidden sm:inline pl-3 text-sm text-gray-500 select-none">
                  /invitacion/
                </span>
                <input
                  id="event-slug"
                  className="w-full bg-transparent px-3 sm:pl-1.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase());
                    setCopied(false);
                  }}
                  placeholder="mi-evento-2026"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={80}
                  aria-invalid={slugError ? "true" : undefined}
                  aria-describedby={slugHint ? "event-slug-help" : undefined}
                />
              </div>
              {slugHint && (
                <p id="event-slug-help" className={`text-xs mt-1.5 ${slugHint.cls}`}>
                  {slugHint.text}
                </p>
              )}
            </div>

            <div className="block">
              <label htmlFor="event-custom-domain" className="text-sm text-gray-400 mb-1 block">
                Dominio personalizado
              </label>
              <div className="flex items-center overflow-hidden rounded-lg border border-gray-700 bg-gray-950 focus-within:border-gold-400">
                <span aria-hidden="true" className="hidden sm:inline pl-3 text-sm text-gray-500 select-none">
                  https://
                </span>
                <input
                  id="event-custom-domain"
                  className="w-full bg-transparent px-3 sm:pl-1.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
                  value={customDomain}
                  onChange={(e) => {
                    setCustomDomain(e.target.value);
                    setCopied(false);
                  }}
                  onBlur={() => setCustomDomain((v) => normalizeDomain(v))}
                  placeholder="macarenayjorge.com"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={DOMAIN_MAX}
                  aria-invalid={domainError ? "true" : undefined}
                  aria-describedby="event-custom-domain-help"
                />
              </div>
              <p
                id="event-custom-domain-help"
                className={`text-xs mt-1.5 ${domainError ? "text-red-400" : "text-gray-500"}`}
              >
                {domainError
                  ? `El dominio ${domainError}.`
                  : "Sin protocolo (ej. macarenayjorge.com). Con dominio, el enlace será https://{dominio}/invitacion/{token} y se oculta la marca DisplayEvent."}
              </p>
            </div>
          </div>

          <div className="min-w-0 mt-4">
            <span className="text-sm text-gray-400 mb-1 block">Vista previa</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-300">
                {publicUrl || "Aún no hay grupos con enlace"}
              </code>
              <Button
                type="button"
                variant="secondary"
                disabled={!publicUrl}
                onClick={copyPublicUrl}
              >
                {copied ? "Copiado ✓" : "Copiar"}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              La URL se activa al guardar. El token mostrado es el del primer grupo;
              cada grupo tiene su propio enlace, cópialos desde “Invitados”.
              {domainValue
                ? " Con dominio propio, el enlace no incluye el slug."
                : ""}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-base font-semibold text-white mb-1">
            Formato de invitación
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Define el estilo y los datos que pide la invitación. Se aplica a la
            invitación pública de cada grupo.
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
              {templateFields
                .filter((f) => !CUSTOM_EXTRA_KEYS.has(f.key))
                .map((f) => {
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
            <FileUploader
              label="Foto de fondo (subida directa)"
              value={form.hero_image}
              onChange={(url) => set("hero_image", url)}
              onUploadingChange={onFileUploadingChange}
            />
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

        {form.template === "boda_jorge_macarena" && (
          <>
            <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="text-base font-semibold text-white mb-1">
                Nuestra historia y música
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Relato de la sección "Nuestra historia" y audio de fondo
                (opcional, sin autoplay).
              </p>
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">
                  Nuestra historia
                </span>
                <textarea
                  className={inputCls}
                  rows={5}
                  value={form.story || ""}
                  onChange={(e) => set("story", e.target.value)}
                  placeholder={"Cuenten su historia…\nLos saltos de línea se respetan."}
                />
                <span className="block text-xs text-gray-500 mt-1.5">
                  Si la dejas vacía, se usa el "Mensaje de bienvenida" de la
                  portada.
                </span>
              </label>
              <div className="mt-4">
                <label className="block">
                  <span className="text-sm text-gray-400 mb-1 block">
                    Música (URL del audio)
                  </span>
                  <input
                    className={inputCls}
                    value={form.music_url || ""}
                    onChange={(e) => set("music_url", e.target.value)}
                    placeholder="https://… (MP3 / M4A)"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <div className="mt-3">
                  <FileUploader
                    label="Archivo de audio"
                    value={form.music_url || ""}
                    onChange={(url) => set("music_url", url)}
                    kind="audio"
                    onUploadingChange={onFileUploadingChange}
                  />
                </div>
                <span className="block text-xs text-gray-500 mt-1.5">
                  Se reproduce en bucle al tocar el botón de música. Sin URL, el
                  botón se oculta.
                </span>
              </div>
            </section>

            <StayTravelEditor
              form={form}
              setForm={setForm}
              inputCls={inputCls}
            />
          </>
        )}

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
          <h2 className="text-base font-semibold text-white mb-1">
            Confirmación de asistencia
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Controla si los invitados pueden modificar su respuesta una vez enviada.
          </p>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.rsvp_editable}
              onChange={(e) => set("rsvp_editable", e.target.checked)}
              className="h-4 w-4 accent-gold-400"
            />
            <span className="text-sm text-gray-300">
              Permitir que los invitados editen su confirmación
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Si está desactivado, una vez que confirmen ya no podrán cambiarla.
          </p>

          {form.rsvp_editable && (
            <div className="mt-4 border-l border-gray-800 pl-6">
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">
                  Límite para confirmar o editar (opcional)
                </span>
                <input
                  type="datetime-local"
                  step={60}
                  className={inputCls}
                  value={form.rsvp_edit_deadline || ""}
                  onChange={(e) => set("rsvp_edit_deadline", e.target.value)}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Después de esta fecha y hora, los invitados ya no podrán confirmar
                ni modificar su respuesta. Déjalo vacío para permitir cambios en
                cualquier momento.
              </p>
              {form.rsvp_edit_deadline ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => set("rsvp_edit_deadline", "")}
                >
                  Quitar límite
                </Button>
              ) : null}
            </div>
          )}
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
                <div key={`${src}-${i}`} className="group relative">
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

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-base font-semibold text-white mb-1">Mesa de Regalos</h2>
          <p className="text-sm text-gray-500 mb-4">
            Regalos monetarios: montos sugeridos, depósito bancario y/o pago con
            tarjeta (Stripe). Disponible en todos los formatos.
          </p>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.registry?.enabled}
              onChange={(e) => setReg("enabled", e.target.checked)}
              className="h-4 w-4 accent-gold-400"
            />
            <span className="text-sm text-gray-300">Activar mesa de regalos</span>
          </label>

          {form.registry?.enabled && (
            <div className="mt-5 space-y-5 pl-6 border-l border-gray-800">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!form.registry?.allow_custom}
                  onChange={(e) => setReg("allow_custom", e.target.checked)}
                  className="h-4 w-4 accent-gold-400"
                />
                <span className="text-sm text-gray-300">Permitir monto libre</span>
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-400 mb-1 block">Monto mínimo (MXN)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={inputCls}
                    value={form.registry?.min_mxn ?? ""}
                    onChange={(e) => setReg("min_mxn", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-400 mb-1 block">Monto mínimo (EUR)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={inputCls}
                    value={form.registry?.min_eur ?? ""}
                    onChange={(e) => setReg("min_eur", e.target.value)}
                  />
                </label>
              </div>

              <AmountListEditor
                inputCls={inputCls}
                label="Montos sugeridos (MXN)"
                values={form.registry?.suggested_mxn || []}
                onChange={(next) => setReg("suggested_mxn", next)}
              />
              <AmountListEditor
                inputCls={inputCls}
                label="Montos sugeridos (EUR)"
                values={form.registry?.suggested_eur || []}
                onChange={(next) => setReg("suggested_eur", next)}
              />

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!form.registry?.stripe_enabled}
                  onChange={(e) => setReg("stripe_enabled", e.target.checked)}
                  className="h-4 w-4 accent-gold-400"
                />
                <span className="text-sm text-gray-300">Habilitar pago con tarjeta (Stripe)</span>
              </label>

              {missingSuggestedAmounts && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                  <p className="text-sm text-amber-300">
                    Sin montos sugeridos y sin monto libre, los invitados no podrán
                    pagar con tarjeta en esa moneda.
                  </p>
                </div>
              )}

              {form.registry?.stripe_enabled && (
                <label className="block">
                  <span className="text-sm text-gray-400 mb-1 block">
                    Link de pago de Stripe (opcional)
                  </span>
                  <input
                    className={inputCls}
                    value={form.registry?.payment_link_url || ""}
                    onChange={(e) => setReg("payment_link_url", e.target.value)}
                    placeholder="https://buy.stripe.com/…"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span className="block text-xs text-gray-500 mt-1.5">
                    Si lo defines, el botón de tarjeta abre este link y el invitado elige
                    el monto en Stripe; si lo dejas vacío, se usa el pago integrado.
                  </span>
                </label>
              )}

              <div className="rounded-xl border border-gray-800 p-4 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!form.registry?.bank?.enabled}
                    onChange={(e) => setBank("enabled", e.target.checked)}
                    className="h-4 w-4 accent-gold-400"
                  />
                  <span className="text-sm text-gray-300 font-medium">
                    Depósito / transferencia bancaria
                  </span>
                </label>

                {form.registry?.bank?.enabled && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm text-gray-400 mb-1 block">Banco</span>
                      <input
                        className={inputCls}
                        value={form.registry?.bank?.bank_name || ""}
                        onChange={(e) => setBank("bank_name", e.target.value)}
                        placeholder="Ej. BBVA"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm text-gray-400 mb-1 block">Titular de la cuenta</span>
                      <input
                        className={inputCls}
                        value={form.registry?.bank?.holder || ""}
                        onChange={(e) => setBank("holder", e.target.value)}
                        placeholder="Ej. Alice Pérez"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm text-gray-400 mb-1 block">Número de cuenta / CLABE</span>
                      <input
                        className={inputCls}
                        value={form.registry?.bank?.account_number || ""}
                        onChange={(e) => setBank("account_number", e.target.value)}
                        placeholder="Ej. 0123456789"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm text-gray-400 mb-1 block">Concepto</span>
                      <input
                        className={inputCls}
                        value={form.registry?.bank?.concept || ""}
                        onChange={(e) => setBank("concept", e.target.value)}
                        placeholder="Ej. Regalo para Alice"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Pagos con tarjeta: se agrupa junto a la Mesa de Regalos porque
            Connect es el requisito para que el cobro llegue a la cuenta del
            anfitrión (sin cuenta destino, la tarjeta queda sin disponibilidad
            por moneda y la invitación ofrece solo transferencia). */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="text-base font-semibold text-white">
              Pagos / Conectar Stripe
            </h2>
            <Button
              type="button"
              variant="secondary"
              disabled={stripeLoading}
              onClick={loadStripeAccounts}
            >
              {stripeLoading ? "Actualizando…" : "Actualizar estado"}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Conecta una cuenta de Stripe para cobrar la mesa de regalos con
            tarjeta: el importe llega directo a tu cuenta. La transferencia
            bancaria no necesita Stripe.
          </p>

          {stripeError && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/5 p-3">
              <p className="text-sm text-red-400">{stripeError}</p>
              {stripeErrorHint && (
                <p className="text-xs text-gray-400 mt-1">{stripeErrorHint}</p>
              )}
            </div>
          )}

          <div className="mb-5">
            <label
              htmlFor="event-stripe-account"
              className="text-sm text-gray-400 mb-1 block"
            >
              Cuenta de Stripe para este evento
            </label>
            <select
              id="event-stripe-account"
              className={inputCls}
              value={stripeAccountId}
              onChange={(e) => {
                stripeSelectionTouchedRef.current = true;
                setStripeAccountId(e.target.value);
              }}
            >
              <option value="">Automática (no recomendada)</option>
              {stripeAccounts.map((acc) => {
                const st = stripeAccountStatus(acc);
                const enabled = acc.charges_enabled === true;
                const country = stripeCountryLabel(acc.country);
                const currency = String(acc.default_currency || "")
                  .trim()
                  .toUpperCase();
                const countryWithCurrency =
                  currency && !country.toUpperCase().includes(currency)
                    ? `${country} · ${currency}`
                    : country;
                return (
                  <option
                    key={acc.id}
                    value={acc.stripe_account_id}
                    disabled={!enabled}
                  >
                    {countryWithCurrency} · {st.label}
                    {!enabled ? " (sin cobros habilitados)" : ""}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Solo esta cuenta recibirá los pagos del evento, en MXN y EUR
              (Stripe convierte si la moneda no coincide).
            </p>
            {stripeSelectionInvalid && (
              <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                La cuenta seleccionada ya no está habilitada o no está
                disponible. Elige otra o 'Automática'; mientras tanto, el evento
                no cobrará con tarjeta.
              </p>
            )}
            {enabledStripeAccounts.length >= 2 && !stripeAccountId && (
              <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                Tienes varias cuentas habilitadas. Selecciona una para que este
                evento cobre siempre en la misma.
              </p>
            )}
          </div>

          {stripeLoading && stripeAccounts.length === 0 ? (
            <p className="text-sm text-gray-400">
              Consultando cuentas de Stripe…
            </p>
          ) : stripeAccounts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-700 px-4 py-5 text-sm text-gray-500">
              Aún no tienes una cuenta de Stripe conectada. Elige tu país y
              pulsa “Conectar Stripe”.
            </p>
          ) : (
            <div className="space-y-2">
              {stripeAccounts.map((acc) => {
                const st = stripeAccountStatus(acc);
                return (
                  <div
                    key={acc.id}
                    className="rounded-xl border border-gray-800 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {stripeCountryLabel(acc.country)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${st.cls}`}
                      >
                        {st.label}
                      </span>
                      {acc.stripe_account_id === stripeAccountId &&
                        acc.charges_enabled === true && (
                          <span className="rounded-full border border-gold-400/40 bg-gold-400/10 px-2.5 py-0.5 text-[11px] font-medium text-gold-300">
                            Activa para este evento
                          </span>
                        )}
                    </div>
                    <div className="mt-1.5 truncate font-mono text-xs text-gray-500">
                      {acc.stripe_account_id}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Cobros: {acc.charges_enabled ? "activos" : "inactivos"} ·
                      Retiros: {acc.payouts_enabled ? "activos" : "inactivos"} ·
                      Datos: {acc.details_submitted ? "enviados" : "pendientes"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 border-t border-gray-800 pt-5">
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">
                  País de tu cuenta de Stripe
                </span>
                <select
                  className={inputCls}
                  value={stripeCountry}
                  onChange={(e) => setStripeCountry(e.target.value)}
                  disabled={stripeConnecting}
                >
                  {STRIPE_COUNTRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                onClick={connectStripe}
                disabled={stripeConnecting}
              >
                {stripeConnecting ? "Redirigiendo…" : "Conectar Stripe"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Te llevaremos al formulario seguro de Stripe para verificar tu
              identidad y tu cuenta bancaria. Al terminar volverás al panel
              automáticamente.
            </p>
          </div>
        </section>

        <footer className="flex justify-end">
          <Button type="submit" disabled={saving || uploading || fileUploading}>
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