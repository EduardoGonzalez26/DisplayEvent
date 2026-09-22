import { Router } from "express";
import { query, pool } from "../db/index.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { normalizePhone } from "../utils/phone.js";
import {
  MESSAGE_PRESETS,
  DEFAULT_PRESET_ID,
  renderMessage,
  formatEventDate,
  buildInvitationUrl,
  buildWaUrl,
  whatsappMode,
  sendViaCloudApi,
} from "../utils/whatsapp.js";

const router = Router({ mergeParams: true });

// Pocos envíos masivos por usuario cada 10 minutos: protege su número de
// WhatsApp ante reintentos/automatizaciones accidentales.
const sendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyFn: (req) => `whatsapp:${req.user.id}`,
});

// Pausa entre envíos de la Cloud API para no saturar la Graph API.
const CLOUD_SEND_DELAY_MS = 350;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Solo se marca como candidato cuando llega explícitamente `true`.
function parseOnlyPending(body) {
  return body?.onlyPending === true;
}

// `groupIds` opcional: filtra la selección del panel (máx. 500 enteros).
function parseGroupIdsFilter(body) {
  const raw = body?.groupIds;
  if (raw === undefined || raw === null) return { value: null };
  if (!Array.isArray(raw) || raw.length > 500 || !raw.every((id) => Number.isInteger(id))) {
    return { error: "groupIds debe ser una lista de hasta 500 enteros" };
  }
  return { value: raw };
}

// GET /api/events/:eventId/whatsapp
// Estado del envío: modo activo, plantillas disponibles y mensaje guardado.
router.get("/", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT whatsapp_message FROM events WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [req.params.eventId, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json({
      mode: whatsappMode(),
      presets: MESSAGE_PRESETS,
      default_preset: DEFAULT_PRESET_ID,
      message: rows[0].whatsapp_message ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/events/:eventId/whatsapp/message
// Guarda el mensaje del organizador. Si no incluye {{enlace}}, se agrega al
// final para que ninguna invitación salga sin el enlace personal del grupo.
router.put("/message", async (req, res, next) => {
  const raw = req.body?.message;
  if (typeof raw !== "string" || !raw.trim()) {
    return res.status(400).json({ error: "El mensaje de invitación no puede estar vacío" });
  }
  let message = raw.trim();
  if (message.length > 800) {
    return res.status(400).json({ error: "El mensaje no puede superar los 800 caracteres" });
  }
  if (!message.includes("{{enlace}}")) message = `${message}\n{{enlace}}`;

  try {
    const rows = await query(
      `UPDATE events SET whatsapp_message = $1
       WHERE id = $2 AND user_id = $3
       RETURNING whatsapp_message`,
      [message, req.params.eventId, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json({ ok: true, message: rows[0].whatsapp_message });
  } catch (err) {
    next(err);
  }
});

// POST /api/events/:eventId/whatsapp/send
// Modo "link": devuelve los enlaces wa.me para que el organizador confirme
// cada envío (no marca nada). Modo "cloud": envía desde el servidor y marca
// `whatsapp_sent_at` por grupo; un fallo aislado no aborta el resto.
router.post("/send", sendLimiter, async (req, res, next) => {
  const onlyPending = parseOnlyPending(req.body);
  const filter = parseGroupIdsFilter(req.body);
  if (filter.error) return res.status(400).json({ error: filter.error });

  try {
    const events = await query(
      `SELECT id, name, date, time, place, slug, custom_domain, whatsapp_message
       FROM events WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [req.params.eventId, req.user.id]
    );
    if (events.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
    const event = events[0];

    const params = [req.params.eventId];
    let sql = `SELECT g.id, g.name, g.leader_name, g.leader_phone, g.invitation_token,
                      g.whatsapp_sent_at, COUNT(gu.id)::int AS guests_count
               FROM "groups" g
               LEFT JOIN guests gu ON gu.group_id = g.id
               WHERE g.event_id = $1`;
    if (filter.value !== null) {
      params.push(filter.value);
      sql += ` AND g.id = ANY($2::int[])`;
    }
    sql += ` GROUP BY g.id ORDER BY g.name ASC`;
    const groups = await query(sql, params);

    const template =
      typeof event.whatsapp_message === "string" && event.whatsapp_message.trim()
        ? event.whatsapp_message
        : null;
    const dateText = formatEventDate(event);
    const mode = whatsappMode();

    const recipients = [];
    const skipped = [];
    for (const group of groups) {
      // Sin teléfono válido no hay a quién escribirle.
      const phone = normalizePhone(group.leader_phone);
      if (!phone.ok) {
        skipped.push({ group_id: group.id, group_name: group.name, reason: "sin_telefono" });
        continue;
      }
      // Sin token no se puede construir la invitación personal.
      const link = buildInvitationUrl(event, group);
      if (!link) {
        skipped.push({ group_id: group.id, group_name: group.name, reason: "sin_enlace" });
        continue;
      }
      if (onlyPending && group.whatsapp_sent_at) {
        skipped.push({ group_id: group.id, group_name: group.name, reason: "ya_enviada" });
        continue;
      }

      const leaderName = (group.leader_name || "").trim() || group.name;
      const message = renderMessage(template, {
        lider: leaderName,
        evento: event.name,
        fecha: dateText,
        lugar: event.place,
        enlace: link,
      });
      recipients.push({
        groupId: group.id,
        groupName: group.name,
        leaderName,
        phone: phone.e164,
        waUrl: buildWaUrl(phone.e164, message),
        message,
        link, // uso interno de la Cloud API; no se expone en la respuesta.
      });
    }

    const totals = {
      total: groups.length,
      sendable: recipients.length,
      skipped: skipped.length,
    };

    if (mode !== "cloud") {
      return res.json({
        mode: "link",
        recipients: recipients.map(
          ({ groupId, groupName, leaderName, phone, waUrl, message }) => ({
            groupId,
            groupName,
            leaderName,
            phone,
            waUrl,
            message,
          })
        ),
        skipped,
        totals,
      });
    }

    let sent = 0;
    const failed = [];
    for (let i = 0; i < recipients.length; i += 1) {
      const recipient = recipients[i];
      try {
        await sendViaCloudApi({
          to: recipient.phone,
          leaderName: recipient.leaderName,
          event,
          link: recipient.link,
        });
        await query(`UPDATE "groups" SET whatsapp_sent_at = NOW() WHERE id = $1`, [
          recipient.groupId,
        ]);
        sent += 1;
      } catch (err) {
        console.error(`[whatsapp] Falló el envío al grupo ${recipient.groupId}:`, err.message);
        failed.push({
          group_id: recipient.groupId,
          group_name: recipient.groupName,
          error: err.message,
        });
      }
      if (i < recipients.length - 1) await sleep(CLOUD_SEND_DELAY_MS);
    }

    res.json({ mode: "cloud", sent, failed, skipped, totals });
  } catch (err) {
    next(err);
  }
});

// POST /api/events/:eventId/whatsapp/mark
// El organizador confirma manualmente que ya envió los enlaces wa.me.
router.post("/mark", async (req, res, next) => {
  const groupIds = req.body?.groupIds;
  if (
    !Array.isArray(groupIds) ||
    groupIds.length < 1 ||
    groupIds.length > 500 ||
    !groupIds.every((id) => Number.isInteger(id))
  ) {
    return res.status(400).json({ error: "groupIds debe ser una lista de entre 1 y 500 enteros" });
  }

  try {
    const result = await pool.query(
      `UPDATE "groups" SET whatsapp_sent_at = NOW()
       WHERE event_id = $1 AND id = ANY($2::int[])`,
      [req.params.eventId, groupIds]
    );
    res.json({ ok: true, marked: result.rowCount });
  } catch (err) {
    next(err);
  }
});

export default router;
