import { Router } from "express";
import { query, pool } from "../db/index.js";

const router = Router({ mergeParams: true });

async function eventExists(eventId) {
  const rows = await query(`SELECT id FROM events WHERE id = $1`, [eventId]);
  return rows.length > 0;
}

async function getTable(client, eventId, tableId) {
  const { rows } = await client.query(
    `SELECT t.*,
            (SELECT COUNT(*) FROM guests WHERE table_id = t.id)::int AS seats_used
     FROM "tables" t
     WHERE t.id = $1 AND t.event_id = $2 LIMIT 1`,
    [tableId, eventId]
  );
  return rows[0] || null;
}

const VALID_SHAPES = ["circle", "square", "rect"];

router.get("/", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT t.*, COUNT(gu.id)::int AS seats_used
       FROM "tables" t
       LEFT JOIN guests gu ON gu.table_id = t.id
       WHERE t.event_id = $1
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
  const { name, capacity, shape, is_kids } = req.body;
  if (!name) return res.status(400).json({ error: "El nombre de la mesa es obligatorio" });
  const cap = Number(capacity);
  if (!Number.isInteger(cap) || cap < 1 || cap > 100) {
    return res.status(400).json({ error: "La capacidad debe ser un número entre 1 y 100" });
  }
  const newShape = shape || "circle";
  if (!VALID_SHAPES.includes(newShape)) {
    return res.status(400).json({ error: "La forma de la mesa no es válida" });
  }
  try {
    if (!(await eventExists(req.params.eventId))) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    const [posRow] = await query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM "tables" WHERE event_id = $1`,
      [req.params.eventId]
    );
    const result = await pool.query(
      `INSERT INTO "tables" (event_id, name, capacity, shape, position, is_kids)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.eventId, name, cap, newShape, posRow.next_pos, is_kids ? true : false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:tableId", async (req, res, next) => {
  const { name, capacity, shape, is_kids } = req.body;
  try {
    const conn = await pool.connect();
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
      if (!VALID_SHAPES.includes(newShape)) {
        return res.status(400).json({ error: "La forma de la mesa no es válida" });
      }
      const newKids = is_kids !== undefined ? is_kids === true || is_kids === 1 : table.is_kids;

      const result = await conn.query(
        `UPDATE "tables" SET name = $1, capacity = $2, shape = $3, is_kids = $4
         WHERE id = $5 AND event_id = $6 RETURNING *`,
        [newName, newCapacity, newShape, newKids, req.params.tableId, req.params.eventId]
      );
      res.json(result.rows[0]);
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:tableId", async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM "tables" WHERE id = $1 AND event_id = $2`,
      [req.params.tableId, req.params.eventId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Mesa no encontrada" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;