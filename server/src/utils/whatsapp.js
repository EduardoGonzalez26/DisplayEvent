import { toWaDigits } from "./phone.js";

/* ------------------------------------------------------------------
   WhatsApp: plantillas de mensaje, enlaces wa.me y Cloud API (opcional).
   Sin variables WHATSAPP_* configuradas el panel opera en modo "link":
   se genera un enlace wa.me por grupo y el organizador confirma el envío.
------------------------------------------------------------------ */

export const MESSAGE_PRESETS = [
  {
    id: "cercano",
    name: "Cercano",
    text: "Hola {{lider}}, te comparto la invitación de {{evento}}. Es el {{fecha}} en {{lugar}}. Abre tu enlace personal aquí: {{enlace}}",
  },
  {
    id: "formal",
    name: "Formal",
    text: "Estimado(a) {{lider}}: tengo el gusto de invitarle a {{evento}}, que se celebrará el {{fecha}} en {{lugar}}. Su invitación personal está disponible en: {{enlace}}",
  },
  {
    id: "breve",
    name: "Breve",
    text: "{{lider}}, aquí está tu invitación para {{evento}} ({{fecha}}, {{lugar}}): {{enlace}}",
  },
];

export const DEFAULT_PRESET_ID = "cercano";

// Tiempo máximo de espera de la Graph API antes de abortar el envío.
const CLOUD_TIMEOUT_MS = 10 * 1000;

function defaultPresetText() {
  const preset = MESSAGE_PRESETS.find((item) => item.id === DEFAULT_PRESET_ID);
  return preset ? preset.text : "";
}

// Sustituye {{lider}}, {{evento}}, {{fecha}}, {{lugar}} y {{enlace}}.
// vars: { lider, evento, fecha, lugar, enlace }
// Garantía del servidor: si la plantilla no incluye {{enlace}}, se agrega al
// final en una línea nueva para que la invitación personal siempre viaje.
export function renderMessage(template, vars = {}) {
  const source =
    typeof template === "string" && template.trim() ? template : defaultPresetText();
  const values = {
    lider: vars.lider ?? "",
    evento: vars.evento ?? "",
    fecha: vars.fecha ?? "",
    lugar: vars.lugar ?? "",
    enlace: vars.enlace ?? "",
  };
  let message = source.replace(
    /\{\{(lider|evento|fecha|lugar|enlace)\}\}/g,
    (_match, key) => values[key]
  );
  if (!source.includes("{{enlace}}")) {
    message = `${message.trimEnd()}\n${values.enlace}`;
  }
  return message;
}

// Descompone una fecha de evento sin desfases de zona. pg entrega las DATE
// como "YYYY-MM-DD" (type parser 1082); aceptamos también Date por robustez.
function dateParts(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

// Fecha larga en es-MX, p. ej. "sábado 12 de septiembre de 2026".
// Con hora añade " · HH:MM". Todo se calcula en UTC para no desplazar el día.
export function formatEventDate(event) {
  const parts = dateParts(event?.date);
  let dateText = "";
  if (parts) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const formatted = new Intl.DateTimeFormat("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).formatToParts(date);
    const pick = (type) => formatted.find((part) => part.type === type)?.value || "";
    dateText = `${pick("weekday")} ${pick("day")} de ${pick("month")} de ${pick("year")}`;
  }
  const time = typeof event?.time === "string" ? event.time.slice(0, 5) : "";
  if (!time) return dateText;
  return dateText ? `${dateText} · ${time}` : time;
}

// URL pública de la invitación del grupo:
//   - con dominio propio:  https://<custom_domain>/invitacion/<token>
//   - sin dominio:         /invitacion/<slug>/<token> (o /invitacion/<token> sin slug)
// null sin token.
export function buildInvitationUrl(event, group) {
  const token = group?.invitation_token;
  if (!token) return null;
  const customDomain =
    typeof event?.custom_domain === "string" ? event.custom_domain.trim() : "";
  if (customDomain) return `https://${customDomain}/invitacion/${token}`;
  const base = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
  const slug = event?.slug;
  return slug ? `${base}/invitacion/${slug}/${token}` : `${base}/invitacion/${token}`;
}

// Enlace wa.me listo para abrir WhatsApp con el mensaje precargado.
export function buildWaUrl(e164, text) {
  return `https://wa.me/${toWaDigits(e164)}?text=${encodeURIComponent(text ?? "")}`;
}

// "cloud" solo cuando la Cloud API está completamente configurada.
export function whatsappMode() {
  const ready = Boolean(
    process.env.WHATSAPP_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_TEMPLATE_NAME
  );
  return ready ? "cloud" : "link";
}

// Envío por WhatsApp Cloud API (requiere plantilla Utility aprobada con 4
// parámetros de body: líder, evento, fecha·lugar y enlace). Lanza Error con
// el mensaje de Meta cuando la API responde con error; aborta a los 10 s.
export async function sendViaCloudApi({ to, leaderName, event, link }) {
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";
  const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: toWaDigits(to),
    type: "template",
    template: {
      name: process.env.WHATSAPP_TEMPLATE_NAME,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "es_MX" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: leaderName },
            { type: "text", text: event.name },
            { type: "text", text: `${formatEventDate(event)} · ${event.place}` },
            { type: "text", text: link },
          ],
        },
      ],
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = body?.error?.message || `HTTP ${response.status}`;
      throw new Error(`WhatsApp Cloud API: ${detail}`);
    }
    return body;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("WhatsApp Cloud API: tiempo de espera agotado");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
