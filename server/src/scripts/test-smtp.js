import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { emailChannel, sendVerificationEmail } from "../utils/mailer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

const to = process.argv[2] || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || "";

const channel = emailChannel();
if (channel === "none") {
  console.error(
    "Ningún método configurado. Define en server/.env:\n" +
      "  Brevo: BREVO_API_KEY + BREVO_SENDER_EMAIL\n" +
      "  SMTP : SMTP_HOST + SMTP_USER + SMTP_PASS"
  );
  process.exit(1);
}
if (!to) {
  console.error("Uso: npm run test:smtp -- tu@correo.com");
  process.exit(1);
}

console.log("Canal de envío:", channel);
if (channel === "smtp") {
  console.log("Host   :", process.env.SMTP_HOST);
  console.log("Puerto :", process.env.SMTP_PORT || 587);
  console.log("Usuario:", process.env.SMTP_USER);
}
console.log("Destino:", to);

try {
  await sendVerificationEmail({
    to,
    username: "Prueba",
    verificationUrl: "https://example.com/verificar-correo?token=prueba",
  });
  console.log("Correo de prueba enviado correctamente a", to);
  process.exit(0);
} catch (err) {
  console.error("Error al enviar:", err.message);
  process.exit(1);
}