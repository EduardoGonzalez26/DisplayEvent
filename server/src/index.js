import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import eventsRouter from "./routes/events.js";
import groupsRouter from "./routes/groups.js";
import guestsRouter from "./routes/guests.js";
import tablesRouter from "./routes/tables.js";
import templatesRouter from "./routes/templates.js";
import whatsappRouter from "./routes/whatsapp.js";
import invitationsRouter from "./routes/invitations.js";
import publicRouter from "./routes/public.js";
import uploadsRouter from "./routes/uploads.js";
import stripeRouter from "./routes/stripe.js";
import authRouter from "./routes/auth.js";
import webhooksRouter from "./routes/webhooks.js";
import { requireAuth, csrfProtection } from "./middleware/auth.js";
import { eventAccess } from "./middleware/eventAccess.js";
import { clientUrl } from "./utils/clientUrl.js";
import { findInvitationByToken } from "./utils/invitationLookup.js";
import { findEventByCustomDomain } from "./utils/eventLookup.js";
import { normalizeHost } from "./utils/customDomain.js";
import {
  invitationTokenFromPath,
  buildInvitationMeta,
  injectInvitationMeta,
  buildEventMeta,
  injectEventMeta,
  injectCustomDomainMarker,
} from "./utils/ogMeta.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const app = express();

// Render y otros proxies envían X-Forwarded-For; sin esto req.ip siempre es el proxy.
app.set("trust proxy", 1);

// Webhooks de Stripe: ANTES de cors() y express.json(). La ruta usa
// express.raw() internamente para verificar la firma sobre el body crudo.
// Al estar montada primero, no pasa por CORS (Stripe es server-to-server).
app.use("/api/webhooks", webhooksRouter);

// Solo orígenes permitidos: la URL pública del frontend y localhost en desarrollo.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error("Origen no permitido por CORS"));
  },
  credentials: true,
});

// El paquete `cors` no recibe `req` en su opción `origin`, así que resolvemos
// aquí el caso "mismo host que el servidor" (p. ej. la invitación servida
// desde el dominio personalizado del evento, donde Origin coincide con Host)
// con el mismo criterio que `csrfProtection`. El resto se delega al
// middleware estándar, conservando el comportamiento actual.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  let sameHost = false;
  if (origin) {
    try {
      sameHost = new URL(origin).host === req.get("host");
    } catch {
      sameHost = false;
    }
  }
  if (!sameHost) return corsMiddleware(req, res, next);

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    const requestedHeaders = req.headers["access-control-request-headers"];
    if (requestedHeaders) res.setHeader("Access-Control-Allow-Headers", requestedHeaders);
    res.statusCode = 204;
    res.setHeader("Content-Length", "0");
    return res.end();
  }
  next();
});
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/uploads", express.static(join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Protección CSRF: aplica a todo /api (auth e invitaciones incluidas).
app.use("/api", csrfProtection);

// Públicas: autenticación, invitaciones (enlace con token que recibe el
// invitado) y portada de un dominio personalizado (resuelta por host).
app.use("/api/auth", authRouter);
app.use("/api/invitations", invitationsRouter);
app.use("/api/public", publicRouter);

// Protegidas: todo el panel de administración.
app.use("/api/events", requireAuth, eventsRouter);
app.use("/api/events/:eventId/groups", requireAuth, eventAccess, groupsRouter);
app.use("/api/events/:eventId/guests", requireAuth, eventAccess, guestsRouter);
app.use("/api/events/:eventId/tables", requireAuth, eventAccess, tablesRouter);
app.use("/api/events/:eventId/whatsapp", requireAuth, eventAccess, whatsappRouter);
app.use("/api/templates", requireAuth, templatesRouter);
app.use("/api/uploads", requireAuth, uploadsRouter);
app.use("/api/stripe", requireAuth, stripeRouter);

// Si existe el build del cliente, lo servimos igual que la API
// (permite hostear frontend + backend en un solo servicio, p. ej. Render).
const CLIENT_DIST = join(__dirname, "..", "..", "client", "dist");
if (existsSync(CLIENT_DIST)) {
  // Host canónico de la SPA (CLIENT_URL). El HTML servido desde otro host
  // (p. ej. el dominio personalizado de un evento) no debe indexarse.
  let canonicalHost = "";
  try {
    canonicalHost = new URL(clientUrl()).host;
  } catch {
    canonicalHost = "";
  }

  // `index: false` deja que `/` llegue al catch-all de la SPA, donde se
  // resuelve el dominio personalizado. `/index.html` se redirige para no
  // servir nunca el HTML crudo sin marker.
  app.get("/index.html", (_req, res) => res.redirect(301, "/"));
  app.use(express.static(CLIENT_DIST, { index: false }));

  // Plantilla de la SPA cacheada UNA sola vez (no se lee por petición): las
  // respuestas de /invitacion/<token> inyectan metadatos OG por invitación y
  // la raíz de un dominio propio inyecta los de la portada del evento.
  const INDEX_HTML = join(CLIENT_DIST, "index.html");
  let htmlTemplate = "";
  try {
    htmlTemplate = readFileSync(INDEX_HTML, "utf8");
  } catch (err) {
    console.error("[spa] No se pudo cachear index.html; se servirá con sendFile", err);
  }

  app.get(/^\/(?!api|uploads).*/, async function (req, res) {
    // Resolución única del host para toda la petición HTML. Si la BD falla,
    // se sirve el HTML estático (sin marker): el sitio nunca se cae por esto.
    const host = normalizeHost(req.hostname);
    let customEvent = null;
    try {
      customEvent = await findEventByCustomDomain(host);
    } catch (err) {
      console.error("[custom-domain] No se pudo resolver el dominio personalizado", err);
    }

    const isCustomRoot = Boolean(customEvent) && req.path === "/";

    // Hosts no canónicos: no indexar (comportamiento actual). La raíz de un
    // dominio propio es la excepción: ahí el contenido ES canónico.
    if (canonicalHost && req.get("host") !== canonicalHost && !isCustomRoot) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }

    // Portada pública: OG del evento, canonical https://<dominio>/ y robots
    // index. Sin X-Robots-Tag aunque el host no sea el canónico.
    if (isCustomRoot && htmlTemplate) {
      res.removeHeader("X-Robots-Tag");
      const meta = buildEventMeta(customEvent, req);
      // Mismo contrato de caché que `res.sendFile`: revalidación con ETag.
      res.setHeader("Cache-Control", "public, max-age=0");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(injectEventMeta(htmlTemplate, meta));
    }

    // Previews de WhatsApp/redes: resuelve el token y sustituye título, og:*
    // y twitter:* en la plantilla. Token inválido/inexistente o error de DB
    // => se sirve el HTML estático tal como antes.
    const token = invitationTokenFromPath(req.path);
    if (token && htmlTemplate) {
      try {
        const inv = await findInvitationByToken(token);
        if (inv) {
          const meta = buildInvitationMeta(inv, token, req);
          let html = injectInvitationMeta(htmlTemplate, meta);
          // Invitación white-label: el cliente necesita el marker y la página
          // sigue sin indexarse (cabecera X-Robots-Tag + meta robots).
          if (customEvent) {
            html = injectCustomDomainMarker(html, { robots: "noindex, nofollow" });
          }
          // Mismo contrato de caché que `res.sendFile`: revalidación con ETag.
          res.setHeader("Cache-Control", "public, max-age=0");
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          return res.status(200).send(html);
        }
      } catch (err) {
        console.error("[og] No se pudieron resolver los metadatos de la invitación", err);
      }
    }

    // Cualquier otra ruta HTML del dominio propio: al menos el marker para
    // que la navegación cliente aplique el white-label.
    if (customEvent && htmlTemplate) {
      res.setHeader("Cache-Control", "public, max-age=0");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(injectCustomDomainMarker(htmlTemplate));
    }

    res.sendFile(INDEX_HTML);
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
        ? "El archivo supera el tamaño máximo permitido (8 MB para imágenes, 15 MB para audio)"
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