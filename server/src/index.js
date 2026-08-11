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
import invitationsRouter from "./routes/invitations.js";
import uploadsRouter from "./routes/uploads.js";
import authRouter from "./routes/auth.js";
import { requireAuth, csrfProtection } from "./middleware/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/uploads", express.static(join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Públicas: autenticación e invitaciones (enlace con token que recibe el invitado).
app.use("/api/auth", authRouter);
app.use("/api/invitations", invitationsRouter);

// Protegidas: todo el panel de administración.
app.use("/api", csrfProtection);
app.use("/api/events", requireAuth, eventsRouter);
app.use("/api/events/:eventId/groups", requireAuth, groupsRouter);
app.use("/api/events/:eventId/guests", requireAuth, guestsRouter);
app.use("/api/events/:eventId/tables", requireAuth, tablesRouter);
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
  res.status(500).json({ error: "Error interno del servidor", detail: err.message });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API de DisplayEvent escuchando en http://localhost:${PORT}`);
});