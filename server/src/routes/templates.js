import { Router } from "express";
import { query, pool } from "../db/index.js";

// Plantillas de invitación del usuario (privadas: siempre filtradas por user_id).
const router = Router();

function cleanName(name) {
  return typeof name === "string" ? name.trim().slice(0, 100) : "";
}

router.get("/", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, name, created_at
       FROM invitation_templates
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, name, config
       FROM invitation_templates
       WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Plantilla no encontrada" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  const { name, config } = req.body;
  const clean = cleanName(name);
  if (!clean) return res.status(400).json({ error: "El nombre de la plantilla es obligatorio" });
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return res.status(400).json({ error: "La configuración de la plantilla es inválida" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO invitation_templates (user_id, name, config)
       VALUES ($1, $2, $3::jsonb) RETURNING id, name, created_at`,
      [req.user.id, clean, JSON.stringify(config)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  const { name, config } = req.body;
  const hasConfig = config && typeof config === "object" && !Array.isArray(config);
  const clean = cleanName(name);
  if (name !== undefined && !clean) {
    return res.status(400).json({ error: "El nombre de la plantilla es inválido" });
  }
  try {
    const result = await pool.query(
      `UPDATE invitation_templates
       SET name = COALESCE($1, name), config = COALESCE($2::jsonb, config)
       WHERE id = $3 AND user_id = $4
       RETURNING id, name, created_at`,
      [clean || null, hasConfig ? JSON.stringify(config) : null, req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Plantilla no encontrada" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM invitation_templates WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Plantilla no encontrada" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;