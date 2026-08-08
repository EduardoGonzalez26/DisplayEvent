import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router({ mergeParams: true });

async function eventExists(eventId) {
  const [rows] = await pool.query(`SELECT id FROM events WHERE id = ?`, [eventId]);
  return rows.length > 0;
}

function insertLeader(conn, groupId, leaderName) {
  return conn.query(
    `INSERT INTO guests (group_id, name, is_leader) VALUES (?, ?, 1)`,
    [groupId, leaderName]
  );
}

async function getLeader(conn, groupId) {
  const [rows] = await conn.query(
    `SELECT id, name FROM guests WHERE group_id = ? AND is_leader = 1 LIMIT 1`,
    [groupId]
  );
  return rows[0] || null;
}

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*,
              COUNT(gu.id) AS guests_count,
              SUM(CASE WHEN gu.is_child = 1 THEN 1 ELSE 0 END) AS children_count,
              SUM(CASE WHEN gu.registered = 1 THEN 1 ELSE 0 END) AS registered_count
       FROM \`groups\` g
       LEFT JOIN guests gu ON gu.group_id = g.id
       WHERE g.event_id = ?
       GROUP BY g.id
       ORDER BY g.name ASC`,
      [req.params.eventId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  const { name, leader_name } = req.body;
  if (!name) return res.status(400).json({ error: "El nombre del grupo es obligatorio" });
  try {
    if (!(await eventExists(req.params.eventId))) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        `INSERT INTO \`groups\` (event_id, name, leader_name) VALUES (?, ?, ?)`,
        [req.params.eventId, name, leader_name || null]
      );
      const groupId = result.insertId;
      if (leader_name) await insertLeader(conn, groupId, leader_name);
      await conn.commit();

      const [[group]] = await conn.query(`SELECT * FROM \`groups\` WHERE id = ?`, [groupId]);
      res.status(201).json(group);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

router.put("/:groupId", async (req, res, next) => {
  const { name, leader_name } = req.body;
  if (!name) return res.status(400).json({ error: "El nombre del grupo es obligatorio" });
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        `UPDATE \`groups\` SET name = ?, leader_name = ? WHERE id = ? AND event_id = ?`,
        [name, leader_name || null, req.params.groupId, req.params.eventId]
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "Grupo no encontrado" });
      }

      const leader = await getLeader(conn, req.params.groupId);
      if (leader_name) {
        if (leader) {
          await conn.query(`UPDATE guests SET name = ? WHERE id = ? AND is_leader = 1`, [
            leader_name,
            leader.id,
          ]);
        } else {
          await insertLeader(conn, req.params.groupId, leader_name);
        }
      } else if (leader) {
        await conn.query(`DELETE FROM guests WHERE id = ?`, [leader.id]);
      }
      await conn.commit();

      const [[group]] = await conn.query(`SELECT * FROM \`groups\` WHERE id = ?`, [
        req.params.groupId,
      ]);
      res.json(group);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:groupId", async (req, res, next) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM \`groups\` WHERE id = ? AND event_id = ?`,
      [req.params.groupId, req.params.eventId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Grupo no encontrado" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;