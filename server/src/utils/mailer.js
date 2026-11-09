import nodemailer from "nodemailer";
import dns from "node:dns";
import net from "node:net";
import { clientUrl } from "./clientUrl.js";
import { escapeHtml } from "./ogMeta.js";

/* ------------------------------------------------------------------
   Brevo (opcional): API transaccional por HTTPS (puerto 443).
   Preferido en hosting donde el SMTP saliente está bloqueado (Render).
------------------------------------------------------------------ */

export function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function emailChannel() {
  if (brevoConfigured()) return "brevo";
  if (smtpConfigured()) return "smtp";
  return "none";
}

function verificationHtml({ username, verificationUrl }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
    <div style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:16px">DisplayEvent</div>
    <p style="color:#334155;font-size:15px;line-height:1.6">
      Hola <strong>${username}</strong>, gracias por registrarte. Para terminar tu cuenta,
      confirma tu correo con el botón de abajo.
    </p>
    <a href="${verificationUrl}"
       style="display:inline-block;background:linear-gradient(90deg,#2563eb,#7c3aed);color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;margin:20px 0">
      Verificar mi correo
    </a>
    <p style="color:#64748b;font-size:13px;line-height:1.6">
      Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
      <a href="${verificationUrl}" style="color:#2563eb;word-break:break-all">${verificationUrl}</a>
    </p>
    <p style="color:#94a3b8;font-size:12px">El enlace expira en 24 horas.</p>
  </div>`;
}

async function sendViaBrevo({ to, subject, html }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || "DisplayEvent",
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.message || `HTTP ${res.status}`;
    if (body?.code) throw new Error(`${body.code} ${msg}`);
    throw new Error(`Brevo: ${msg}`);
  }
  return body;
}

/* ------------------------------------------------------------------
   SMTP (Nodemailer): respaldo local cuando SMTP_HOST está configurado.
------------------------------------------------------------------ */

let transporterPromise = null;

// Render no tiene salida IPv6 (ENETUNREACH) y Nodemailer intenta IPv6 primero.
// Resolvemos el host a una IP IPv4 literal y conectamos a ella, manteniendo el
// hostname real en el SNI/TLS (servername) para que Gmail acepte la conexión.
function resolveIPv4(host) {
  if (net.isIP(host) === 4) return Promise.resolve(host);
  return new Promise((resolve, reject) => {
    dns.lookup(host, { family: 4, all: true }, (err, addresses) => {
      if (err) return reject(err);
      if (!addresses || addresses.length === 0) {
        return reject(new Error(`No se encontró ninguna IP IPv4 para ${host}`));
      }
      resolve(addresses[0].address);
    });
  });
}

async function createTransporter() {
  const host = process.env.SMTP_HOST;
  const ip = await resolveIPv4(host);
  return nodemailer.createTransport({
    host: ip,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    tls: { servername: host, rejectUnauthorized: true },
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

export function getTransporter() {
  if (!transporterPromise) {
    // No cacheamos la promesa fallida: si falla (p. ej. DNS), se limpia y el
    // siguiente intento vuelve a crear el transporter.
    transporterPromise = createTransporter().catch((err) => {
      transporterPromise = null;
      throw err;
    });
  }
  return transporterPromise;
}

function smtpFromAddress() {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return process.env.SMTP_FROM_NAME
    ? `${process.env.SMTP_FROM_NAME} <${from}>`
    : from;
}

/* ------------------------------------------------------------------
   Mensaje privado para los novios (v3).
------------------------------------------------------------------ */

const CHANNEL_LABELS = {
  transfer: "Transferencia",
  card: "Tarjeta",
};

function channelLabel(channel) {
  return CHANNEL_LABELS[channel] || String(channel || "");
}

// Monto en unidades mayores. Sin monto -> texto explícito del contrato.
function formatAmount(amount, currency) {
  if (amount == null || amount === "") return "No indicó monto";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "No indicó monto";
  const code = String(currency || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return String(value);
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${code}`;
  }
}

// Fecha/hora del aviso en la zona de España, independientemente del host.
function formatMadridDateTime(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function giftMessageHtml({
  eventName,
  senderName,
  senderLeader,
  message,
  amount,
  currency,
  channel,
  eventId,
}) {
  const safeEvent = escapeHtml(eventName || "el evento");
  const safeSender = escapeHtml(senderName || "Un invitado");
  const safeLeader = escapeHtml(senderLeader || "");
  const safeMessage = escapeHtml(message || "").replace(/\r?\n/g, "<br>");
  const amountText = escapeHtml(formatAmount(amount, currency));
  const channelText = escapeHtml(channelLabel(channel));
  const dateText = escapeHtml(formatMadridDateTime());
  const panelUrl = `${clientUrl().replace(/\/+$/, "")}/events/${encodeURIComponent(eventId)}/mensajes`;
  const safePanelUrl = escapeHtml(panelUrl);

  const leaderRow = safeLeader
    ? `<tr>
        <td style="padding:6px 0;color:#64748b">Líder</td>
        <td style="padding:6px 0;text-align:right"><strong>${safeLeader}</strong></td>
      </tr>`
    : "";

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
    <div style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:16px">DisplayEvent</div>
    <h1 style="font-size:18px;color:#1e293b;margin:0 0 16px">Nuevo mensaje para ${safeEvent}</h1>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;color:#334155;font-size:15px;line-height:1.7">
      ${safeMessage}
    </div>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px;color:#334155">
      <tr>
        <td style="padding:6px 0;color:#64748b">Familia / grupo</td>
        <td style="padding:6px 0;text-align:right"><strong>${safeSender}</strong></td>
      </tr>
      ${leaderRow}
      <tr>
        <td style="padding:6px 0;color:#64748b">Monto indicado</td>
        <td style="padding:6px 0;text-align:right"><strong>${amountText}</strong></td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b">Canal</td>
        <td style="padding:6px 0;text-align:right"><strong>${channelText}</strong></td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b">Recibido</td>
        <td style="padding:6px 0;text-align:right"><strong>${dateText}</strong> (hora de España)</td>
      </tr>
    </table>
    <a href="${safePanelUrl}"
       style="display:inline-block;background:linear-gradient(90deg,#2563eb,#7c3aed);color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;margin:24px 0 20px">
      Ver mensajes en el panel
    </a>
    <p style="color:#64748b;font-size:13px;line-height:1.6">
      Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
      <a href="${safePanelUrl}" style="color:#2563eb;word-break:break-all">${safePanelUrl}</a>
    </p>
  </div>`;
}

/* ------------------------------------------------------------------
   Punto de envío: Brevo si está configurado, si no SMTP.
------------------------------------------------------------------ */

export async function sendVerificationEmail({ to, username, verificationUrl }) {
  const subject = "Confirma tu correo en DisplayEvent";
  const html = verificationHtml({ username, verificationUrl });
  if (brevoConfigured()) {
    return sendViaBrevo({ to, subject, html });
  }
  if (!smtpConfigured()) {
    throw new Error("No hay método de envío configurado (Brevo o SMTP)");
  }
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: smtpFromAddress(),
    to,
    subject,
    html,
  });
}

// Aviso privado a los novios cuando un invitado deja un mensaje en la mesa de
// regalos. Lanza si no hay canal o el envío falla: la ruta captura el error y
// responde igualmente `{ ok: true }` (el invitado nunca ve un fallo de correo).
export async function sendGiftMessageEmail({
  to,
  eventName,
  senderName,
  senderLeader,
  message,
  amount,
  currency,
  channel,
  eventId,
}) {
  if (typeof to !== "string" || !to.trim()) {
    throw new Error("Destinatario de correo ausente");
  }

  const subject = `Nuevo mensaje para ${
    String(eventName || "").replace(/[\r\n]+/g, " ").trim() || "el evento"
  }`;
  const html = giftMessageHtml({
    eventName,
    senderName,
    senderLeader,
    message,
    amount,
    currency,
    channel,
    eventId,
  });

  if (brevoConfigured()) {
    return sendViaBrevo({ to, subject, html });
  }
  if (!smtpConfigured()) {
    throw new Error("No hay método de envío configurado (Brevo o SMTP)");
  }
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: smtpFromAddress(),
    to,
    subject,
    html,
  });
}