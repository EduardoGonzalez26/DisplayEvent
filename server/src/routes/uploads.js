import { Router } from "express";
import multer from "multer";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, "..", "..", "uploads");
const CLOUD_TIMEOUT_MS = 10000;

const allowedMime = /^image\/(jpeg|png|webp|gif)$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.test(file.mimetype)) {
      return cb(new Error("Solo se permiten imágenes JPG, PNG, WEBP o GIF"));
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

async function uploadToCloudinary(buffer, folder) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_PRESET;
  const boundary = randomUUID();
  const field = (name, value) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;

  const bodyHeadParts = [field("folder", folder || "displayevent")];
  const params = { folder: folder || "display" };

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
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="img"\r\nContent-Type: application/octet-stream\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, buffer, tail]);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: "POST",
        hostname: "api.cloudinary.com",
        path: `/v1_1/${cloud}/image/upload`,
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

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo" });
    }
    const ext = req.file.mimetype.split("/")[1] === "jpeg" ? "jpg" : req.file.mimetype.split("/")[1];

    if (cloudinaryConfigured()) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, "displayevent");
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