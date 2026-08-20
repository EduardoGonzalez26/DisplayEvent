import { Router } from "express";
import { query, pool } from "../db/index.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [{ total }] = await query(
      `SELECT COUNT(*)::int AS total FROM events WHERE user_id = $1`,
      [req.user.id]
    );

    const rows = await query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM "groups" g WHERE g.event_id = e.id)::int AS groups_count,
              (SELECT COUNT(*) FROM guests gu
                 JOIN "groups" g ON g.id = gu.group_id
                 WHERE g.event_id = e.id)::int AS guests_count,
              (SELECT COUNT(*) FROM guests gu
                 JOIN "groups" g ON g.id = gu.group_id
                 WHERE g.event_id = e.id AND gu.is_child)::int AS children_count,
              (SELECT COUNT(*) FROM guests gu
                 JOIN "groups" g ON g.id = gu.group_id
                 WHERE g.event_id = e.id AND gu.registered)::int AS registered_count
       FROM events e
       WHERE e.user_id = $1
       ORDER BY e.date DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: rows,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/stats", async (req, res, next) => {
  try {
    const eventRow = await query(`SELECT id FROM events WHERE id = $1 AND user_id = $2 LIMIT 1`, [
      req.params.id,
      req.user.id,
    ]);
    if (eventRow.length === 0) return res.status(404).json({ error: "Evento no encontrado" });

    const [groupsRow] = await query(
      `SELECT COUNT(*)::int AS total_groups FROM "groups" WHERE event_id = $1`,
      [req.params.id]
    );

    const [guestStats] = await query(
      `SELECT COUNT(*)::int AS total_guests,
              COUNT(*) FILTER (WHERE gu.is_child)::int AS children_count,
              COUNT(*) FILTER (WHERE NOT gu.is_child)::int AS adults_count
       FROM guests gu
       JOIN "groups" g ON g.id = gu.group_id
       WHERE g.event_id = $1`,
      [req.params.id]
    );

    const [rsvpStats] = await query(
      `SELECT COUNT(*) FILTER (WHERE gu.registered)::int AS registered_count,
              COUNT(*) FILTER (WHERE NOT gu.registered)::int AS unregistered_count
       FROM guests gu
       JOIN "groups" g ON g.id = gu.group_id
       WHERE g.event_id = $1`,
      [req.params.id]
    );

    res.json({
      total_groups: groupsRow.total_groups,
      total_guests: guestStats.total_guests,
      children_count: guestStats.children_count,
      adults_count: guestStats.adults_count,
      registered_count: rsvpStats.registered_count,
      unregistered_count: rsvpStats.unregistered_count,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/invitation", async (req, res, next) => {
  try {
    const rows = await query(`SELECT invitation FROM events WHERE id = $1 AND user_id = $2 LIMIT 1`, [
      req.params.id,
      req.user.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(rows[0].invitation || {});
  } catch (err) {
    next(err);
  }
});

// Formatos de invitación conocidos (validación ligera del JSONB al guardar).
const KNOWN_TEMPLATES = ["xv", "boda", "cumpleanos", "baby_shower"];

router.put("/:id/invitation", async (req, res, next) => {
  const invitation = req.body;
  if (!invitation || typeof invitation !== "object" || Array.isArray(invitation)) {
    return res.status(400).json({ error: "La configuración de invitación es inválida" });
  }
  if (invitation.template !== undefined && !KNOWN_TEMPLATES.includes(invitation.template)) {
    return res.status(400).json({ error: "Formato de invitación desconocido" });
  }
  try {
    const result = await pool.query(
      `UPDATE events
       SET invitation = COALESCE(invitation, '{}'::jsonb) || $1::jsonb
       WHERE id = $2 AND user_id = $3
       RETURNING invitation`,
      [JSON.stringify(invitation), req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json({ ok: true, invitation: result.rows[0].invitation });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const rows = await query(`SELECT * FROM events WHERE id = $1 AND user_id = $2 LIMIT 1`, [
      req.params.id,
      req.user.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function cleanRequiredString(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function isValidDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

function isValidTime(value) {
  if (typeof value !== "string" || !TIME_RE.test(value)) return false;
  const [h, mi] = value.split(":").map(Number);
  return h >= 0 && h <= 23 && mi >= 0 && mi <= 59;
}

// Valida y normaliza el payload de un evento (POST/PUT).
function validateEventPayload({ name, date, time, place }) {
  const cleanName = cleanRequiredString(name, 255);
  const cleanPlace = cleanRequiredString(place, 255);
  if (!cleanName) return { error: "El nombre del evento es obligatorio" };
  if (!isValidDate(date)) return { error: "La fecha no es válida (formato AAAA-MM-DD)" };
  if (!isValidTime(time)) return { error: "La hora no es válida (formato HH:MM)" };
  if (!cleanPlace) return { error: "El lugar es obligatorio" };
  return { value: { name: cleanName, date, time, place: cleanPlace } };
}

router.post("/", async (req, res, next) => {
  const validated = validateEventPayload(req.body || {});
  if (validated.error) return res.status(400).json({ error: validated.error });
  const { name, date, time, place } = validated.value;
  try {
    const result = await pool.query(
      `INSERT INTO events (user_id, name, date, time, place)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, name, date, time, place]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  const validated = validateEventPayload(req.body || {});
  if (validated.error) return res.status(400).json({ error: validated.error });
  const { name, date, time, place } = validated.value;
  try {
    const result = await pool.query(
      `UPDATE events SET name = $1, date = $2, time = $3, place = $4
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [name, date, time, place, req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await pool.query(`DELETE FROM events WHERE id = $1 AND user_id = $2`, [
      req.params.id,
      req.user.id,
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;