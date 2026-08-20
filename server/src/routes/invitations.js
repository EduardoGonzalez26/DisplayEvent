import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

const invitationViewLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120 });
const rsvpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });

async function findInvitationByToken(token) {
  const rows = await query(
    `SELECT g.id AS group_id, g.event_id, g.name AS name,
            g.leader_name, g.rsvp_note,
            e.name AS event_name, e.date, e.time, e.place, e.invitation
     FROM "groups" g
     JOIN events e ON e.id = g.event_id
     WHERE g.invitation_token = $1 LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function getGuests(groupId) {
  return query(
    `SELECT id, name, is_child, is_leader, registered, declined, companion_id
     FROM guests
     WHERE group_id = $1
     ORDER BY is_leader DESC, id ASC`,
    [groupId]
  );
}

router.get("/:token", invitationViewLimiter, async (req, res, next) => {
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

router.put("/:token/rsvp", rsvpLimiter, async (req, res, next) => {
  const { attending_ids, declining_ids, note } = req.body;
  try {
    const inv = await findInvitationByToken(req.params.token);
    if (!inv) return res.status(404).json({ error: "Invitación no encontrada" });

    const allowIds = Array.isArray(attending_ids) ? attending_ids.map(Number) : [];
    const declineIds = Array.isArray(declining_ids) ? declining_ids.map(Number) : [];
    const allIds = [...allowIds, ...declineIds];

    if (allIds.length > 0) {
      const owned = await query(
        `SELECT id FROM guests WHERE group_id = $1 AND id = ANY($2::int[])`,
        [inv.group_id, allIds]
      );
      const ownedSet = new Set(owned.map((g) => g.id));
      const invalid = allIds.filter((id) => !ownedSet.has(id));
      if (invalid.length > 0) {
        return res.status(400).json({ error: "Algunos pases no pertenecen a esta invitación" });
      }
    }

    const cleanNote = await transaction(async (conn) => {
      // Pases que asisten: registrados. Pases que no asisten: declinados.
      // El resto vuelve a "sin respuesta".
      await conn.query(
        `UPDATE guests SET registered = FALSE, declined = FALSE WHERE group_id = $1`,
        [inv.group_id]
      );
      if (allowIds.length > 0) {
        await conn.query(
          `UPDATE guests SET registered = TRUE, declined = FALSE WHERE id = ANY($1::int[])`,
          [allowIds]
        );
      }
      if (declineIds.length > 0) {
        await conn.query(
          `UPDATE guests SET registered = FALSE, declined = TRUE WHERE id = ANY($1::int[])`,
          [declineIds]
        );
      }

      const noteStr = typeof note === "string" ? note.trim().slice(0, 500) : null;
      await conn.query(`UPDATE "groups" SET rsvp_note = $1 WHERE id = $2`, [
        noteStr,
        inv.group_id,
      ]);
      return noteStr;
    });

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