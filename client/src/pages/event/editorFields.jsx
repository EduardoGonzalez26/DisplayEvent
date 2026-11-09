import { useRef, useState } from "react";
import { api } from "../../api.js";
import { Button } from "../../components/ui.jsx";

/* ------------------------------------------------------------------
   Subida de archivos del editor (imágenes y audio) vía POST /api/uploads.
   Extraído de EventInvitation para reutilizarlo en el editor dedicado v3.
------------------------------------------------------------------- */

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
    help: "Sube la imagen directamente, sin URL.",
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

function fileExt(name) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function validateUploadFile(file, config) {
  if (file.size > config.maxBytes) return { error: config.sizeError };
  const inferred = EXT_TO_MIME[fileExt(file.name)] || "";
  const mime = file.type || inferred;
  if (mime && !config.mimes.includes(mime)) return { error: config.mimeError };
  if (!file.type && inferred && config.mimes.includes(inferred)) {
    try {
      return { file: new File([file], file.name, { type: inferred }) };
    } catch {
      /* noop */
    }
  }
  return { file };
}

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

export function FileUploader({ label, value, onChange, kind = "image", onUploadingChange }) {
  const config = UPLOAD_KINDS[kind] || UPLOAD_KINDS.image;
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    const { file: safeFile, error: validationError } = validateUploadFile(file, config);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
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
            <img
              src={value}
              alt={label}
              className="w-28 h-20 shrink-0 rounded-lg border border-gold-400/30 object-cover"
            />
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
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Subiendo…" : value ? config.replaceLabel : config.idleLabel}
            </Button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-sm text-red-500 hover:text-red-400"
              >
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
