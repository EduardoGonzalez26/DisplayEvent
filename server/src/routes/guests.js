import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router({ mergeParams: true });

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT gu.*, g.name AS group_name
       FROM guests gu
       JOIN \`groups\` g ON g.id = gu.group_id
       WHERE g.event_id = ?
       ORDER BY g.name ASC, gu.name ASC`,
      [req.params.eventId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:eventId/guests/:groupId -> guests of a specific group
router.get("/:groupId", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM guests WHERE group_id = ? ORDER BY name ASC`,
      [req.params.groupId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/:groupId", async (req, res, next) => {
  const { name, is_child } = req.body;
  if (!name) return res.status(400).json({ error: "El nombre del invitado es obligatorio" });
  try {
    const [group] = await pool.query(
      `SELECT id FROM \`groups\` WHERE id = ? AND event_id = ?`,
      [req.params.groupId, req.params.eventId]
    );
    if (group.length === 0) return res.status(404).json({ error: "Grupo no encontrado" });

    const [result] = await pool.query(
      `INSERT INTO guests (group_id, name, is_child) VALUES (?, ?, ?)`,
      [req.params.groupId, name, is_child ? 1 : 0]
    );
    const [created] = await pool.query(`SELECT * FROM guests WHERE id = ?`, [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:groupId/:guestId", async (req, res, next) => {
  const { name, is_child, registered } = req.body;
  try {
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push("name = ?"); values.push(name); }
    if (is_child !== undefined) { fields.push("is_child = ?"); values.push(is_child ? 1 : 0); }
    if (registered !== undefined) {
      fields.push("registered = ?"); values.push(registered ? 1 : 0);
      if (registered) fields.push("declined = 0");
    }
    if (fields.length === 0) return res.status(400).json({ error: "No hay campos para actualizar" });

    values.push(req.params.guestId);
    const [result] = await pool.query(
      `UPDATE guests SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Invitado no encontrado" });
    const [updated] = await pool.query(`SELECT * FROM guests WHERE id = ?`, [req.params.guestId]);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:groupId/:guestId", async (req, res, next) => {
  try {
    const [result] = await pool.query(`DELETE FROM guests WHERE id = ?`, [req.params.guestId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Invitado no encontrado" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Asignar / liberar un invitado de una mesa, respetando capacidad y estado confirmado.
router.put("/:groupId/:guestId/assign", async (req, res, next) => {
  const { table_id } = req.body;
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [guestRows] = await conn.query(
        `SELECT gu.*, g.event_id FROM guests gu
         JOIN \`groups\` g ON g.id = gu.group_id
         WHERE gu.id = ? AND g.event_id = ? LIMIT 1`,
        [req.params.guestId, req.params.eventId]
      );
      if (guestRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "Invitado no encontrado" });
      }
      const guest = guestRows[0];

      if (guest.companion_id) {
        await conn.rollback();
        return res.status(400).json({
          error: `${guest.name} es acompañante; muévelo junto con su invitado principal`,
        });
      }

      // Solo invitados confirmados pueden sentarse en una mesa.
      if (!guest.registered) {
        await conn.rollback();
        return res.status(400).json({
          error: `${guest.name} no ha confirmado asistencia y no puede ser asignado a una mesa`,
        });
      }

      // Bloque: el invitado + sus acompañantes (pases).
      const [blockRows] = await conn.query(
        `SELECT id FROM guests WHERE id = ? OR companion_id = ?`,
        [guest.id, guest.id]
      );
      const blockIds = blockRows.map((r) => r.id);
      const blockSize = blockIds.length;

      if (table_id == null || table_id === "") {
        if (blockIds.length > 0) {
          await conn.query(`UPDATE guests SET table_id = NULL WHERE id IN (?)`, [blockIds]);
        }
        await conn.commit();
        return res.json({ ok: true, table_id: null });
      }

      const [tableRows] = await conn.query(
        `SELECT * FROM \`tables\` WHERE id = ? AND event_id = ? LIMIT 1`,
        [table_id, req.params.eventId]
      );
      if (tableRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "Mesa no encontrada" });
      }
      const table = tableRows[0];

      const [[{ occupied }]] = await conn.query(
        `SELECT COUNT(*) AS occupied FROM guests WHERE table_id = ? AND id NOT IN (?)`,
        [table.id, blockIds.length ? blockIds : [0]]
      );
      const seatsLeft = table.capacity - occupied;

      if (blockSize > seatsLeft) {
        await conn.rollback();
        return res.status(400).json({
          error: `La mesa "${table.name}" tiene ${occupied} ocupados y solo quedan ${seatsLeft} lugares; ${
            blockSize === 1 ? "tu invitado" : `el bloque de ${blockSize} invitados`
          } no cabe.`,
        });
      }

      await conn.query(`UPDATE guests SET table_id = ? WHERE id IN (?)`, [table.id, blockIds]);
      await conn.commit();
      res.json({ ok: true, table_id: table.id, moved: blockSize });
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

// Vincular un acompañante a un invitado principal (pareja/familia).
router.put("/:groupId/:guestId/companion", async (req, res, next) => {
  const { companion_id } = req.body;
  try {
    const conn = await pool.getConnection();
    try {
      const [guestRows] = await conn.query(
        `SELECT gu.*, g.event_id FROM guests gu
         JOIN \`groups\` g ON g.id = gu.group_id
         WHERE gu.id = ? AND g.event_id = ? LIMIT 1`,
        [req.params.guestId, req.params.eventId]
      );
      if (guestRows.length === 0) {
        return res.status(404).json({ error: "Invitado no encontrado" });
      }

      if (companion_id == null || companion_id === "") {
        await conn.query(
          `UPDATE guests SET companion_id = NULL, table_id = NULL WHERE id = ?`,
          [req.params.guestId]
        );
        const [[updated]] = await conn.query(`SELECT * FROM guests WHERE id = ?`, [req.params.guestId]);
        return res.json(updated);
      }

      if (Number(companion_id) === Number(req.params.guestId)) {
        return res.status(400).json({ error: "Un invitado no puede ser su propio acompañante" });
      }

      const [mainRows] = await conn.query(
        `SELECT gu.*, g.event_id FROM guests gu
         JOIN \`groups\` g ON g.id = gu.group_id
         WHERE gu.id = ? AND g.event_id = ? LIMIT 1`,
        [companion_id, req.params.eventId]
      );
      if (mainRows.length === 0) {
        return res.status(404).json({ error: "El invitado principal no existe o no pertenece al evento" });
      }
      const main = mainRows[0];

      if (main.companion_id) {
        return res.status(400).json({
          error: `${main.name} ya es acompañante de otro invitado; úsalo como principal`,
        });
      }

      await conn.query(
        `UPDATE guests SET companion_id = ?, table_id = ? WHERE id = ?`,
        [companion_id, main.table_id || null, req.params.guestId]
      );
      const [[updated]] = await conn.query(`SELECT * FROM guests WHERE id = ?`, [req.params.guestId]);
      res.json(updated);
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

export default router;