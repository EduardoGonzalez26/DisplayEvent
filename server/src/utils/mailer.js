import nodemailer from "nodemailer";
import dns from "node:dns";
import net from "node:net";

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

export function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
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
    })();
  }
  return transporterPromise;
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function fromAddress() {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return process.env.SMTP_FROM_NAME
    ? `${process.env.SMTP_FROM_NAME} <${from}>`
    : from;
}

export { fromAddress };

export async function sendVerificationEmail({ to, username, verificationUrl }) {
  if (!smtpConfigured()) {
    throw new Error("SMTP no está configurado en las variables de entorno");
  }
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject: "Confirma tu correo en DisplayEvent",
    html: `
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
      </div>
    `,
  });
}