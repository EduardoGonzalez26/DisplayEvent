import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { query } from "../db/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

// Fase 3.3 — Migración: toda invitación sin `template` queda marcada como "xv"
// (retrocompatibilidad con el formato clásico).
async function main() {
  const updated = await query(`
    UPDATE events
    SET invitation = CASE
      WHEN invitation IS NULL THEN '{"template":"xv","version":1}'::jsonb
      ELSE invitation || '{"template":"xv","version":1}'::jsonb
    END
    WHERE invitation IS NULL OR invitation->>'template' IS NULL
    RETURNING id
  `);
  console.log(`Invitaciones actualizadas a template "xv": ${updated.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error en la migración:", err.message);
  process.exit(1);
});