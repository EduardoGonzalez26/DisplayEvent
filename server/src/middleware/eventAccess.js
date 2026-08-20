import { query } from "../db/index.js";

// Verifica que el evento apuntado por las rutas anidadas (grupos/invitados/mesas)
// pertenezca al usuario autenticado. Responde 404 para no revelar la existencia
// de eventos ajenos.
export async function eventAccess(req, res, next) {
  try {
    const rows = await query(
      `SELECT id FROM events WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [req.params.eventId, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    next();
  } catch (err) {
    next(err);
  }
}