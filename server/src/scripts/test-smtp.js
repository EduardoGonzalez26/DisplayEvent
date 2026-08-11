import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getTransporter, smtpConfigured, fromAddress } from "../utils/mailer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

const to = process.argv[2] || process.env.SMTP_USER || "";

if (!smtpConfigured()) {
  console.error("SMTP no configurado: faltan SMTP_HOST, SMTP_USER o SMTP_PASS en server/.env");
  process.exit(1);
}
if (!to) {
  console.error("Uso: npm run test:smtp -- tu@correo.com");
  process.exit(1);
}

console.log("Host   :", process.env.SMTP_HOST);
console.log("Puerto :", process.env.SMTP_PORT || 587);
console.log("Usuario:", process.env.SMTP_USER);
console.log("Para   :", to);

try {
  const transporter = getTransporter();
  await transporter.verify();
  console.log("Conexión SMTP válida (credenciales OK).");
  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject: "Prueba de DisplayEvent",
    text: "Este es un correo de prueba enviado desde DisplayEvent.",
  });
  console.log("Correo de prueba enviado correctamente a", to);
  process.exit(0);
} catch (err) {
  console.error("Error SMTP:", err.message);
  process.exit(1);
}
