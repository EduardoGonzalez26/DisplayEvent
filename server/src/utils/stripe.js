/* ------------------------------------------------------------------
   Cliente Stripe (opcional).

   El backend arranca AUNQUE Stripe no esté configurado: si no existe
   `STRIPE_SECRET_KEY`, `getStripe()` devuelve `null` y los endpoints
   de pago degradan con gracia (503). Nunca se loguea la clave secreta.
------------------------------------------------------------------ */

import Stripe from "stripe";

let stripe = null;
let stripeResolved = false;

// Instancia lazy del cliente Stripe. Devuelve null si no hay clave secreta.
export function getStripe() {
  if (stripeResolved) return stripe;
  stripeResolved = true;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("[stripe] STRIPE_SECRET_KEY no está definida: pagos deshabilitados.");
    return null;
  }

  stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    appInfo: { name: "displayevent", version: "1.0.0" },
  });
  return stripe;
}

// True si Stripe está listo para procesar pagos (clave secreta presente).
export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Clave pública: se puede exponer al frontend (nunca la secreta).
// Defensa en profundidad: si por error se configura una clave SECRETA
// (sk_/rk_), NO se expone y se loguea un aviso.
export function stripePublishableKey() {
  const key = process.env.STRIPE_PUBLISHABLE_KEY || null;
  if (key && !key.startsWith("pk_")) {
    console.error(
      "[stripe] STRIPE_PUBLISHABLE_KEY no empieza por 'pk_' (¿es una clave secreta?). No se expondrá al frontend."
    );
    return null;
  }
  return key;
}

// Secreto del webhook: para verificar firmas (nunca se expone al frontend).
export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

// Verifica la firma de un evento de webhook sobre el body crudo (Buffer/string).
// Devuelve { event } o { error }. No requiere STRIPE_SECRET_KEY.
export function verifyStripeWebhook(payload, header) {
  const secret = stripeWebhookSecret();
  if (!secret) return { error: "webhook_no_secret" };
  try {
    const event = Stripe.webhooks.constructEvent(payload, header, secret);
    return { event };
  } catch (err) {
    return { error: "invalid_signature", message: err.message };
  }
}
