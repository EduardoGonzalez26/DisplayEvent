import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { query } from "../db/index.js";
import { normalizeForRead } from "../schemas/invitation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

// Fase v2 — Normaliza cada `events.invitation` al contrato v2 (versión 2).
// Idempotente: compara con `IS DISTINCT FROM` (igualdad JSONB, sin importar
// el orden de claves) y solo escribe cuando hay cambios reales.
async function main() {
  const rows = await query(`SELECT id, invitation FROM events`);
  let updated = 0;

  for (const row of rows) {
    const normalized = normalizeForRead(row.invitation);
    const res = await query(
      `UPDATE events
       SET invitation = $1::jsonb
       WHERE id = $2 AND invitation IS DISTINCT FROM $1::jsonb
       RETURNING id`,
      [JSON.stringify(normalized), row.id]
    );
    if (res.length > 0) updated++;
  }

  console.log(`Invitaciones normalizadas a v2: ${updated} de ${rows.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error en la migración:", err.message);
  process.exit(1);
});
