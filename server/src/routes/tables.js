import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router({ mergeParams: true });

async function eventExists(eventId) {
  const [rows] = await pool.query(`SELECT id FROM events WHERE id = ?`, [eventId]);
  return rows.length > 0;
}

async function getTable(conn, eventId, tableId) {
  const [rows] = await conn.query(
    `SELECT t.*,
            (SELECT COUNT(*) FROM guests WHERE table_id = t.id) AS seats_used
     FROM \`tables\` t
     WHERE t.id = ? AND t.event_id = ? LIMIT 1`,
    [tableId, eventId]
  );
  return rows[0] || null;
}

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, COUNT(gu.id) AS seats_used
       FROM \`tables\` t
       LEFT JOIN guests gu ON gu.table_id = t.id
       WHERE t.event_id = ?
       GROUP BY t.id
       ORDER BY t.position ASC, t.id ASC`,
      [req.params.eventId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  const { name, capacity, shape } = req.body;
  if (!name) return res.status(400).json({ error: "El nombre de la mesa es obligatorio" });
  const cap = Number(capacity);
  if (!Number.isInteger(cap) || cap < 1 || cap > 100) {
    return res.status(400).json({ error: "La capacidad debe ser un número entre 1 y 100" });
  }
  const validShapes = ["circle", "square", "rect"];
  if (shape && !validShapes.includes(shape)) {
    return res.status(400).json({ error: "La forma de la mesa no es válida" });
  }
  try {
    if (!(await eventExists(req.params.eventId))) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    const [[{ nextPos }]] = await pool.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS nextPos FROM \`tables\` WHERE event_id = ?`,
      [req.params.eventId]
    );
    const [result] = await pool.query(
      `INSERT INTO \`tables\` (event_id, name, capacity, shape, position) VALUES (?, ?, ?, ?, ?)`,
      [req.params.eventId, name, cap, shape || "circle", nextPos]
    );
    const [created] = await pool.query(`SELECT * FROM \`tables\` WHERE id = ?`, [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:tableId", async (req, res, next) => {
  const { name, capacity, shape } = req.body;
  try {
    const conn = await pool.getConnection();
    try {
      const table = await getTable(conn, req.params.eventId, req.params.tableId);
      if (!table) return res.status(404).json({ error: "Mesa no encontrada" });

      const newName = name ?? table.name;
      const newCapacity = capacity !== undefined ? Number(capacity) : table.capacity;
      if (!Number.isInteger(newCapacity) || newCapacity < 1 || newCapacity > 100) {
        return res.status(400).json({ error: "La capacidad debe ser un número entre 1 y 100" });
      }
      if (newCapacity < table.seats_used) {
        return res.status(400).json({
          error: `La mesa ya tiene ${table.seats_used} invitados; no puedes bajar la capacidad por debajo de eso`,
        });
      }
      const newShape = shape ?? table.shape;
      if (!["circle", "square", "rect"].includes(newShape)) {
        return res.status(400).json({ error: "La forma de la mesa no es válida" });
      }

      await conn.query(
        `UPDATE \`tables\` SET name = ?, capacity = ?, shape = ? WHERE id = ? AND event_id = ?`,
        [newName, newCapacity, newShape, req.params.tableId, req.params.eventId]
      );
      const [[updated]] = await conn.query(`SELECT * FROM \`tables\` WHERE id = ?`, [
        req.params.tableId,
      ]);
      res.json(updated);
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:tableId", async (req, res, next) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM \`tables\` WHERE id = ? AND event_id = ?`,
      [req.params.tableId, req.params.eventId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Mesa no encontrada" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;