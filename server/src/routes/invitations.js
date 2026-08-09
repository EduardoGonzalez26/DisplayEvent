import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

async function findInvitationByToken(token) {
  const [rows] = await pool.query(
    `SELECT g.id AS group_id, g.event_id, g.name AS name,
            g.leader_name, g.rsvp_note,
            e.name AS event_name, e.date, e.time, e.place, e.invitation
     FROM \`groups\` g
     JOIN events e ON e.id = g.event_id
     WHERE g.invitation_token = ? LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function getGuests(groupId) {
  const [rows] = await pool.query(
    `SELECT id, name, is_child, is_leader, registered, declined, companion_id
     FROM guests
     WHERE group_id = ?
     ORDER BY is_leader DESC, id ASC`,
    [groupId]
  );
  return rows;
}

router.get("/:token", async (req, res, next) => {
  try {
    const inv = await findInvitationByToken(req.params.token);
    if (!inv) return res.status(404).json({ error: "Invitación no encontrada" });

    const guests = await getGuests(inv.group_id);
    res.json({
      event: {
        name: inv.event_name,
        date: inv.date,
        time: inv.time,
        place: inv.place,
        invitation: inv.invitation,
      },
      group: { name: inv.name, leader_name: inv.leader_name, rsvp_note: inv.rsvp_note },
      guests,
    });
  } catch (err) {
    next(err);
  }
});

router.put("/:token/rsvp", async (req, res, next) => {
  const { attending_ids, declining_ids, note } = req.body;
  try {
    const inv = await findInvitationByToken(req.params.token);
    if (!inv) return res.status(404).json({ error: "Invitación no encontrada" });

    const allowIds = Array.isArray(attending_ids) ? attending_ids.map(Number) : [];
    const declineIds = Array.isArray(declining_ids) ? declining_ids.map(Number) : [];
    const allIds = [...allowIds, ...declineIds];
    if (allIds.length > 0) {
      const [owned] = await pool.query(
        `SELECT id FROM guests WHERE group_id = ? AND id IN (?)`,
        [inv.group_id, allIds]
      );
      const ownedSet = new Set(owned.map((g) => g.id));
      const invalid = allIds.filter((id) => !ownedSet.has(id));
      if (invalid.length > 0) {
        return res.status(400).json({ error: "Algunos pases no pertenecen a esta invitación" });
      }
    }

    const conn = await pool.getConnection();
    let cleanNote = null;
    try {
      await conn.beginTransaction();

      // Pases que asisten: registrados. Pases que no asisten: declinados.
      // El resto vuelve a "sin respuesta" (nunca se revierte un estado confirmado).
      const [rows] = await conn.query(`SELECT id FROM guests WHERE group_id = ?`, [
        inv.group_id,
      ]);
      const groupIds = rows.map((g) => g.id);
      if (groupIds.length > 0) {
        await conn.query(
          `UPDATE guests SET registered = 0, declined = 0 WHERE id IN (?)`,
          [groupIds]
        );
        if (allowIds.length > 0) {
          await conn.query(
            `UPDATE guests SET registered = 1, declined = 0 WHERE id IN (?)`,
            [allowIds]
          );
        }
        if (declineIds.length > 0) {
          await conn.query(
            `UPDATE guests SET registered = 0, declined = 1 WHERE id IN (?)`,
            [declineIds]
          );
        }
      }

      const noteStr = typeof note === "string" ? note.trim().slice(0, 500) : null;
      cleanNote = noteStr;
      await conn.query(`UPDATE \`groups\` SET rsvp_note = ? WHERE id = ?`, [
        cleanNote,
        inv.group_id,
      ]);

      await conn.commit();
      conn.release();
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }

    const guests = await getGuests(inv.group_id);
    res.json({
      ok: true,
      attending: guests.filter((g) => g.registered).length,
      declining: guests.filter((g) => g.declined).length,
      responded: guests.filter((g) => g.registered || g.declined).length,
      note: cleanNote ?? null,
      guests,
    });
  } catch (err) {
    next(err);
  }
});

export default router;