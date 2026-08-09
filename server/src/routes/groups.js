import { Router } from "express";
import { query, pool, transaction } from "../db/index.js";
import { generateToken } from "../utils/token.js";

const router = Router({ mergeParams: true });

async function eventExists(eventId) {
  const rows = await query(`SELECT id FROM events WHERE id = $1`, [eventId]);
  return rows.length > 0;
}

function insertLeader(client, groupId, leaderName) {
  return client.query(
    `INSERT INTO guests (group_id, name, is_leader) VALUES ($1, $2, TRUE)`,
    [groupId, leaderName]
  );
}

async function getLeader(client, groupId) {
  const { rows } = await client.query(
    `SELECT id, name FROM guests WHERE group_id = $1 AND is_leader = TRUE LIMIT 1`,
    [groupId]
  );
  return rows[0] || null;
}

router.get("/", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT g.*,
              COUNT(gu.id)::int AS guests_count,
              COUNT(gu.id) FILTER (WHERE gu.is_child)::int AS children_count,
              COUNT(gu.id) FILTER (WHERE gu.registered)::int AS registered_count
       FROM "groups" g
       LEFT JOIN guests gu ON gu.group_id = g.id
       WHERE g.event_id = $1
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

    const group = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO "groups" (event_id, name, leader_name, invitation_token)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.params.eventId, name, leader_name || null, generateToken()]
      );
      const groupId = rows[0].id;
      if (leader_name) await insertLeader(client, groupId, leader_name);
      const { rows: grp } = await client.query(`SELECT * FROM "groups" WHERE id = $1`, [groupId]);
      return grp[0];
    });
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
});

router.post("/:groupId/token", async (req, res, next) => {
  try {
    const token = generateToken();
    const result = await pool.query(
      `UPDATE "groups" SET invitation_token = $1 WHERE id = $2 AND event_id = $3 RETURNING id`,
      [token, req.params.groupId, req.params.eventId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }
    res.json({ ok: true, invitation_token: token });
  } catch (err) {
    next(err);
  }
});

router.put("/:groupId", async (req, res, next) => {
  const { name, leader_name, high_chairs, high_chairs_count } = req.body;
  if (!name) return res.status(400).json({ error: "El nombre del grupo es obligatorio" });
  try {
    const group = await transaction(async (client) => {
      const count = Number(high_chairs_count);
      const result = await client.query(
        `UPDATE "groups"
         SET name = $1, leader_name = $2, high_chairs = $3, high_chairs_count = $4
         WHERE id = $5 AND event_id = $6
         RETURNING *`,
        [
          name,
          leader_name || null,
          high_chairs === true || high_chairs === 1 ? true : false,
          high_chairs && Number.isInteger(count) && count > 0 ? count : 0,
          req.params.groupId,
          req.params.eventId,
        ]
      );
      if (result.rowCount === 0) {
        const err = new Error("Grupo no encontrado");
        err.status = 404;
        throw err;
      }

      const leader = await getLeader(client, req.params.groupId);
      if (leader_name) {
        if (leader) {
          await client.query(
            `UPDATE guests SET name = $1 WHERE id = $2 AND is_leader = TRUE`,
            [leader_name, leader.id]
          );
        } else {
          await insertLeader(client, req.params.groupId, leader_name);
        }
      } else if (leader) {
        await client.query(`DELETE FROM guests WHERE id = $1`, [leader.id]);
      }

      const { rows } = await client.query(`SELECT * FROM "groups" WHERE id = $1`, [
        req.params.groupId,
      ]);
      return rows[0];
    });
    res.json(group);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
});

router.delete("/:groupId", async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM "groups" WHERE id = $1 AND event_id = $2`,
      [req.params.groupId, req.params.eventId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Grupo no encontrado" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;