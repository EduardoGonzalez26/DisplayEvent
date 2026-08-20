import { Router } from "express";
import { query, pool } from "../db/index.js";

const router = Router({ mergeParams: true });

const toBool = (v) => v === true || v === 1 || v === "1" || v === "true";

router.get("/", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT gu.*, g.name AS group_name
       FROM guests gu
       JOIN "groups" g ON g.id = gu.group_id
       WHERE g.event_id = $1
       ORDER BY g.name ASC, gu.name ASC`,
      [req.params.eventId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:groupId", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT gu.* FROM guests gu
       JOIN "groups" g ON g.id = gu.group_id
       WHERE gu.group_id = $1 AND g.event_id = $2
       ORDER BY gu.name ASC`,
      [req.params.groupId, req.params.eventId]
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
    const group = await query(
      `SELECT id FROM "groups" WHERE id = $1 AND event_id = $2`,
      [req.params.groupId, req.params.eventId]
    );
    if (group.length === 0) return res.status(404).json({ error: "Grupo no encontrado" });

    const result = await pool.query(
      `INSERT INTO guests (group_id, name, is_child) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.groupId, name, is_child ? true : false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:groupId/:guestId", async (req, res, next) => {
  const { name, is_child, registered } = req.body;
  try {
    const fields = [];
    const values = [];
    if (name !== undefined) {
      fields.push(`name = $${values.length + 1}`);
      values.push(name);
    }
    if (is_child !== undefined) {
      fields.push(`is_child = $${values.length + 1}`);
      values.push(toBool(is_child));
    }
    if (registered !== undefined) {
      fields.push(`registered = $${values.length + 1}`);
      values.push(toBool(registered));
      if (toBool(registered)) fields.push("declined = FALSE");
    }
    if (fields.length === 0) return res.status(400).json({ error: "No hay campos para actualizar" });

    values.push(req.params.guestId, req.params.groupId, req.params.eventId);
    const result = await pool.query(
      `UPDATE guests gu
       SET ${fields.join(", ")}
       FROM "groups" g
       WHERE gu.id = $${values.length - 2} AND gu.group_id = $${values.length - 1}
         AND g.id = gu.group_id AND g.event_id = $${values.length}
       RETURNING gu.*`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Invitado no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:groupId/:guestId", async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM guests gu
       USING "groups" g
       WHERE gu.id = $1 AND gu.group_id = $2 AND g.id = gu.group_id AND g.event_id = $3`,
      [req.params.guestId, req.params.groupId, req.params.eventId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Invitado no encontrado" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Asignar / liberar un invitado de una mesa, respetando capacidad y estado confirmado.
router.put("/:groupId/:guestId/assign", async (req, res, next) => {
  const { table_id } = req.body;
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: guestRows } = await client.query(
        `SELECT gu.*, g.event_id FROM guests gu
         JOIN "groups" g ON g.id = gu.group_id
         WHERE gu.id = $1 AND g.event_id = $2 LIMIT 1`,
        [req.params.guestId, req.params.eventId]
      );
      if (guestRows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Invitado no encontrado" });
      }
      const guest = guestRows[0];

      if (guest.companion_id) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `${guest.name} es acompañante; muévelo junto con su invitado principal`,
        });
      }

      if (!guest.registered) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `${guest.name} no ha confirmado asistencia y no puede ser asignado a una mesa`,
        });
      }

      // Bloque: el invitado + sus acompañantes.
      const { rows: blockRows } = await client.query(
        `SELECT id FROM guests WHERE id = $1 OR companion_id = $1 ORDER BY id FOR UPDATE`,
        [guest.id]
      );
      const blockIds = blockRows.map((r) => r.id);

      if (table_id == null || table_id === "") {
        if (blockIds.length > 0) {
          await client.query(`UPDATE guests SET table_id = NULL WHERE id = ANY($1::int[])`, [
            blockIds,
          ]);
        }
        await client.query("COMMIT");
        return res.json({ ok: true, table_id: null });
      }

      const { rows: tableRows } = await client.query(
        `SELECT * FROM "tables" WHERE id = $1 AND event_id = $2 LIMIT 1 FOR UPDATE`,
        [table_id, req.params.eventId]
      );
      if (tableRows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Mesa no encontrada" });
      }
      const table = tableRows[0];

      const occSql = blockIds.length
        ? `SELECT COUNT(*)::int AS occupied FROM guests
           WHERE table_id = $1 AND NOT (id = ANY($2::int[]))`
        : `SELECT COUNT(*)::int AS occupied FROM guests WHERE table_id = $1`;
      const occParams = blockIds.length ? [table.id, blockIds] : [table.id];
      const { rows: [occupiedRow] } = await client.query(occSql, occParams);
      const occupied = occupiedRow.occupied;
      const seatsLeft = table.capacity - occupied;

      if (blockIds.length > seatsLeft) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `La mesa "${table.name}" tiene ${occupied} ocupados y solo quedan ${seatsLeft} lugares; ${
            blockIds.length === 1 ? "tu invitado" : `el bloque de ${blockIds.length} invitados`
          } no cabe.`,
        });
      }

      await client.query(
        `UPDATE guests SET table_id = $1 WHERE id = ANY($2::int[])`,
        [table.id, blockIds]
      );
      await client.query("COMMIT");
      res.json({ ok: true, table_id: table.id, moved: blockIds.length });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// Vincular un acompañante a un invitado principal (pareja/familia).
router.put("/:groupId/:guestId/companion", async (req, res, next) => {
  const { companion_id } = req.body;
  try {
    const client = await pool.connect();
    try {
      const { rows: guestRows } = await client.query(
        `SELECT gu.*, g.event_id FROM guests
         JOIN "groups" g ON g.id = gu.group_id
         WHERE gu.id = $1 AND g.event_id = $2 LIMIT 1`,
        [req.params.guestId, req.params.eventId]
      );
      if (guestRows.length === 0) {
        return res.status(404).json({ error: "Invitado no encontrado" });
      }
      const guest = guestRows[0];

      if (companion_id == null || companion_id === "") {
        await client.query(
          `UPDATE guests SET companion_id = NULL, table_id = NULL WHERE id = $1`,
          [req.params.guestId]
        );
        const { rows: updated } = await client.query(
          `SELECT * FROM guests WHERE id = $1`,
          [req.params.guestId]
        );
        return res.json(updated[0]);
      }

      if (Number(companion_id) === Number(req.params.guestId)) {
        return res.status(400).json({ error: "Un invitado no puede ser su propio acompañante" });
      }

      const { rows: mainRows } = await client.query(
        `SELECT gu.*, g.event_id FROM guests
         JOIN "groups" g ON g.id = gu.group_id
         WHERE gu.id = $1 AND g.event_id = $2 LIMIT 1`,
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

      await client.query(
        `UPDATE guests SET companion_id = $1, table_id = $2 WHERE id = $3`,
        [companion_id, main.table_id || null, req.params.guestId]
      );
      const { rows: updated } = await client.query(`SELECT * FROM guests WHERE id = $1`, [
        req.params.guestId,
      ]);
      res.json(updated[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

export default router;