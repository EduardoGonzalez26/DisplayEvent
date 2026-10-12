import { Router } from "express";
import multer from "multer";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, "..", "..", "uploads");
const CLOUD_TIMEOUT_MS = 10000;

// Cuota por usuario: evita saturar el almacenamiento (local o Cloudinary).
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyFn: (req) => `user:${req.user?.id ?? req.ip}`,
});

// Tipos permitidos y límites por clase de archivo. El límite global de multer
// es el mayor (audio); la cuota específica de imágenes se valida en el handler
// para poder devolver un mensaje preciso por tipo.
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO_MIMES = new Set(["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/ogg"]);
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const AUDIO_MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MESSAGE =
  "Solo se permiten imágenes JPG, PNG, WEBP o GIF y audio MP3, M4A u OGG";

// Extensión de archivo por mimetype (para el fallback local).
const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIMES.has(file.mimetype) && !AUDIO_MIMES.has(file.mimetype)) {
      return cb(new Error(ALLOWED_MESSAGE));
    }
    cb(null, true);
  },
});

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      (process.env.CLOUDINARY_PRESET ||
        (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET))
  );
}

// Sube a Cloudinary. `resourceType` es "image" o "video" (Cloudinary trata
// los audios como recurso de tipo video: /video/upload).
async function uploadToCloudinary(
  buffer,
  folder,
  resourceType = "image",
  filename = "upload",
  contentType = "application/octet-stream"
) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_PRESET;
  const folderName = folder || "displayevent";
  const boundary = randomUUID();
  const field = (name, value) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;

  const bodyHeadParts = [field("folder", folderName)];
  const params = { folder: folderName };

  if (preset) {
    // Subida unsigned: no requiere API key ni firma.
    bodyHeadParts.push(field("upload_preset", preset));
  } else {
    // Subida firmada con API key/secret.
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    params.timestamp = timestamp;
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");
    bodyHeadParts.push(field("timestamp", timestamp), field("signature", signature), field("api_key", apiKey));
  }

  const head = Buffer.from(
    bodyHeadParts.join("") +
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, buffer, tail]);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: "POST",
        hostname: "api.cloudinary.com",
        path: `/v1_1/${cloud}/${resourceType}/upload`,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
        timeout: CLOUD_TIMEOUT_MS,
      },
      (res) => {
        let out = "";
        res.on("data", (d) => (out += d));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(out);
            if (res.statusCode >= 400 || !parsed.secure_url) {
              const msg = parsed?.error?.message || `HTTP ${res.statusCode}`;
              return reject(new Error(`Cloudinary: ${msg}`));
            }
            resolve({ secure_url: parsed.secure_url, public_id: parsed.public_id });
          } catch (err) {
            reject(new Error(`Cloudinary: respuesta inválida (HTTP ${res.statusCode})`));
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("Cloudinary: la subida tardó demasiado"));
    });
    req.on("error", reject);
    req.end(body);
  });
}

async function saveLocally(buffer, ext) {
  await mkdirAsync(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFileAsync(join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

router.post("/", uploadLimiter, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo" });
    }

    // Cuota por tipo: multer ya limita a 15 MB (audio), aquí se aplica la de
    // imágenes (8 MB) con mensaje específico.
    const isAudio = AUDIO_MIMES.has(req.file.mimetype);
    if (req.file.size > (isAudio ? AUDIO_MAX_BYTES : IMAGE_MAX_BYTES)) {
      return res.status(400).json({
        error: isAudio
          ? "El audio supera el tamaño máximo de 15 MB"
          : "La imagen supera el tamaño máximo de 8 MB",
      });
    }

    const ext = EXT_BY_MIME[req.file.mimetype] || "bin";
    const resourceType = isAudio ? "video" : "image";

    if (cloudinaryConfigured()) {
      try {
        const result = await uploadToCloudinary(
          req.file.buffer,
          "displayevent",
          resourceType,
          `upload.${ext}`,
          req.file.mimetype
        );
        return res.status(201).json({ url: result.secure_url, public_id: result.public_id });
      } catch (cloudErr) {
        console.error(`[uploads] Cloudinary falló, guardando en local: ${cloudErr.message}`);
      }
    }

    const url = await saveLocally(req.file.buffer, ext);
    res.status(201).json({ url, public_id: null });
  } catch (err) {
    next(err);
  }
});

export default router;