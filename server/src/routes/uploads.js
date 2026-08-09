import { Router } from "express";
import multer from "multer";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, "..", "..", "uploads");

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
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

async function uploadToCloudinary(buffer, folder) {
  const { default: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder || "displayevent", resource_type: "image" },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
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
      const result = await uploadToCloudinary(req.file.buffer, "displayevent");
      return res.status(201).json({ url: result.secure_url, public_id: result.public_id });
    }

    const url = await saveLocally(req.file.buffer, ext);
    res.status(201).json({ url, public_id: null });
  } catch (err) {
    next(err);
  }
});

export default router;