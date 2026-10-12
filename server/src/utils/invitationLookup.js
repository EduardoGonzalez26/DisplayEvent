import { query } from "../db/index.js";

/* ------------------------------------------------------------------
   Búsqueda pública de invitaciones por token.

   Única fuente del SQL que resuelve un enlace de invitación: la usan
   `routes/invitations.js` (vista pública) y la inyección de metadatos OG
   de la SPA en `index.js`, para no duplicar la consulta. Incluye `slug`
   y `custom_domain` porque la URL canónica de los metadatos se construye
   igual que los enlaces de WhatsApp (`buildInvitationUrl`); `owner_user_id`
   y los overrides Connect (`stripe_account_mxn/eur`) alimentan la
   resolución del destino de pago. Excluye tokens revocados.
------------------------------------------------------------------- */

export async function findInvitationByToken(token) {
  const rows = await query(
    `SELECT g.id AS group_id, g.event_id, g.name AS name,
            g.leader_name, g.rsvp_note,
            e.name AS event_name, e.date, e.time, e.place, e.invitation,
            e.slug, e.custom_domain, e.user_id AS owner_user_id,
            e.stripe_account_mxn, e.stripe_account_eur
     FROM "groups" g
     JOIN events e ON e.id = g.event_id
     WHERE g.invitation_token = $1
       AND NOT EXISTS (
         SELECT 1 FROM revoked_invitation_tokens r WHERE r.token = g.invitation_token
       )
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}
