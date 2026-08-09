import { Router } from "express";
import { query, pool } from "../db/index.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT e.*,
              COUNT(DISTINCT g.id) AS groups_count,
              COUNT(DISTINCT gu.id) AS guests_count,
              SUM(CASE WHEN gu.is_child = 1 THEN 1 ELSE 0 END) AS children_count,
              SUM(CASE WHEN gu.registered = 1 THEN 1 ELSE 0 END) AS registered_count
       FROM events e
       LEFT JOIN \`groups\` g ON g.event_id = e.id
       LEFT JOIN guests gu ON gu.group_id = g.id
       GROUP BY e.id
       ORDER BY e.date DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/stats", async (req, res, next) => {
  try {
    const [events] = await pool.query(
      `SELECT * FROM events WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (events.length === 0) return res.status(404).json({ error: "Evento no encontrado" });

    const [[stats]] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM \`groups\` WHERE event_id = ?) AS total_groups`,
      [req.params.id]
    );
    const total_groups = stats.total_groups;
    const [[{ total_guests, children_count, adults_count }]] = await pool.query(
      `SELECT COUNT(*) AS total_guests,
              COALESCE(SUM(is_child), 0) AS children_count,
              COALESCE(SUM(is_child = 0), 0) AS adults_count
       FROM guests gu
       JOIN \`groups\` g ON g.id = gu.group_id
       WHERE g.event_id = ?`,
      [req.params.id]
    );
    const [[{ registered_count, unregistered_count }]] = await pool.query(
      `SELECT COALESCE(SUM(registered), 0) AS registered_count,
              COALESCE(SUM(registered = 0), 0) AS unregistered_count
       FROM guests gu
       JOIN \`groups\` g ON g.id = gu.group_id
       WHERE g.event_id = ?`,
      [req.params.id]
    );

    res.json({
      total_groups,
      total_guests,
      children_count,
      adults_count,
      registered_count,
      unregistered_count,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/invitation", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT invitation FROM events WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(rows[0].invitation || {});
  } catch (err) {
    next(err);
  }
});

router.put("/:id/invitation", async (req, res, next) => {
  const invitation = req.body;
  try {
    const [result] = await pool.query(`UPDATE events SET invitation = ? WHERE id = ?`, [
      JSON.stringify(invitation || {}),
      req.params.id,
    ]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.json({ ok: true, invitation });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM events WHERE id = ? LIMIT 1`, [req.params.id]);
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
    const [result] = await pool.query(
      `INSERT INTO events (name, date, time, place) VALUES (?, ?, ?, ?)`,
      [name, date, time, place]
    );
    const [created] = await pool.query(`SELECT * FROM events WHERE id = ?`, [result.insertId]);
    res.status(201).json(created[0]);
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
    const [result] = await pool.query(
      `UPDATE events SET name = ?, date = ?, time = ?, place = ? WHERE id = ?`,
      [name, date, time, place, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Evento no encontrado" });
    const [updated] = await pool.query(`SELECT * FROM events WHERE id = ?`, [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await pool.query(`DELETE FROM events WHERE id = ?`, [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Evento no encontrado" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;