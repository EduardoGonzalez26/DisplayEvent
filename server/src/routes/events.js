import { Router } from "express";
import { query, pool } from "../db/index.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT e.*,
              COUNT(DISTINCT g.id)::int AS groups_count,
              COUNT(DISTINCT gu.id)::int AS guests_count,
              COUNT(DISTINCT gu.id) FILTER (WHERE gu.is_child)::int AS children_count,
              COUNT(DISTINCT gu.id) FILTER (WHERE gu.registered)::int AS registered_count
       FROM events e
       LEFT JOIN "groups" g ON g.event_id = e.id
       LEFT JOIN guests gu ON gu.group_id = g.id
       WHERE e.user_id = $1
       GROUP BY e.id
       ORDER BY e.date DESC`,
      [req.user.id]
    );
    res.json(rows);
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
      `UPDATE events SET invitation = $1::jsonb WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(invitation || {}), req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json({ ok: true, invitation });
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

router.post("/", async (req, res, next) => {
  const { name, date, time, place } = req.body;
  if (!name || !date || !time || !place) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
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
  const { name, date, time, place } = req.body;
  if (!name || !date || !time || !place) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
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