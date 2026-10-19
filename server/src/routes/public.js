import { Router } from "express";
import { rateLimit } from "../middleware/rateLimit.js";
import { normalizeForRead } from "../schemas/invitation.js";
import { findEventByCustomDomain } from "../utils/eventLookup.js";

const router = Router();

// Misma ventana que la vista pública de invitaciones (120/15 min por IP).
const eventViewLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120 });

// Portada pública de un dominio personalizado. El evento se resuelve
// EXCLUSIVAMENTE por el host de la petición: no se acepta el dominio por
// query param ni por body (evita enumerar eventos ajenos).
router.get("/event", eventViewLimiter, async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const event = await findEventByCustomDomain(req.hostname);
    if (!event) return res.status(404).json({ error: "Evento no encontrado" });

    // La portada no muestra la mesa de regalos ni datos bancarios: se excluye
    // `registry` del contrato público sin mutar el objeto normalizado. La
    // invitación personalizada (`/api/invitations/:token`) sí lo conserva.
    const { registry: _registry, ...publicInvitation } = normalizeForRead(
      event.invitation
    );

    // Contrato público: solo datos visibles en la portada. Nada de
    // owner_user_id, cuentas Connect, grupos, invitados ni tokens.
    res.json({
      event: {
        name: event.name,
        date: event.date,
        time: event.time,
        place: event.place,
        invitation: publicInvitation,
      },
      public_config: {
        custom_domain: event.custom_domain || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
