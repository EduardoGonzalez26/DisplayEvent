import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import eventsRouter from "./routes/events.js";
import groupsRouter from "./routes/groups.js";
import guestsRouter from "./routes/guests.js";
import tablesRouter from "./routes/tables.js";
import templatesRouter from "./routes/templates.js";
import invitationsRouter from "./routes/invitations.js";
import uploadsRouter from "./routes/uploads.js";
import authRouter from "./routes/auth.js";
import { requireAuth, csrfProtection } from "./middleware/auth.js";
import { eventAccess } from "./middleware/eventAccess.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const app = express();

// Render y otros proxies envían X-Forwarded-For; sin esto req.ip siempre es el proxy.
app.set("trust proxy", 1);

// Solo orígenes permitidos: la URL pública del frontend y localhost en desarrollo.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error("Origen no permitido por CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/uploads", express.static(join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Protección CSRF: aplica a todo /api (auth e invitaciones incluidas).
app.use("/api", csrfProtection);

// Públicas: autenticación e invitaciones (enlace con token que recibe el invitado).
app.use("/api/auth", authRouter);
app.use("/api/invitations", invitationsRouter);

// Protegidas: todo el panel de administración.
app.use("/api/events", requireAuth, eventsRouter);
app.use("/api/events/:eventId/groups", requireAuth, eventAccess, groupsRouter);
app.use("/api/events/:eventId/guests", requireAuth, eventAccess, guestsRouter);
app.use("/api/events/:eventId/tables", requireAuth, eventAccess, tablesRouter);
app.use("/api/templates", requireAuth, templatesRouter);
app.use("/api/uploads", requireAuth, uploadsRouter);

// Si existe el build del cliente, lo servimos igual que la API
// (permite hostear frontend + backend en un solo servicio, p. ej. Render).
const CLIENT_DIST = join(__dirname, "..", "..", "client", "dist");
if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api|uploads).*/, function (_req, res) {
    res.sendFile(join(CLIENT_DIST, "index.html"));
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON inválido en la petición" });
  }
  if (err.name === "MulterError") {
    const msg =
      err.code === "LIMIT_FILE_SIZE"
        ? "La imagen supera el tamaño máximo de 8 MB"
        : "Error al subir el archivo";
    return res.status(400).json({ error: msg });
  }
  if (err.message === "Origen no permitido por CORS") {
    return res.status(403).json({ error: err.message });
  }
  if (err.message && err.message.startsWith("Solo se permiten")) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API de DisplayEvent escuchando en http://localhost:${PORT}`);
});