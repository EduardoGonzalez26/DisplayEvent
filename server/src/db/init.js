import pg from "pg";
import dotenv from "dotenv";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

dotenv.config();

const TOKEN_BYTES = 8;

function generateToken() {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const connection = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.PGHOST || process.env.DB_HOST,
        port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
        user: process.env.PGUSER || process.env.DB_USER,
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
        database: process.env.PGDATABASE || process.env.DB_NAME,
      };

  const client = new pg.Client(connection);
  await client.connect();

  // Esquema canónico completo (tablas, índices y migraciones de esquema).
  // Idempotente: CREATE ... IF NOT EXISTS + ALTERs seguros.
  const schema = await readFile(join(__dirname, "schema.sql"), "utf8");
  await client.query(schema);

  // Backfills de datos (no tocan el esquema).
  // Backfill multitenencia: los eventos huérfanos (sin user_id) se asignan al
  // primer usuario. Antes de esto eran visibles para todos los usuarios.
  await client.query(`
    UPDATE events
    SET user_id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)
    WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users)
  `);

  // Backfill: tokens de invitación faltantes.
  const { rows } = await client.query(
    `SELECT id FROM "groups" WHERE invitation_token IS NULL`
  );
  for (const row of rows) {
    await client.query(`UPDATE "groups" SET invitation_token = $1 WHERE id = $2`, [
      generateToken(),
      row.id,
    ]);
  }

  // Backfill multiformato: toda invitación sin `template` queda marcada como
  // "xv" (retrocompatibilidad con el formato clásico). Idempotente.
  await client.query(`
    UPDATE events
    SET invitation = CASE
      WHEN invitation IS NULL THEN '{"template":"xv","version":1}'::jsonb
      ELSE invitation || '{"template":"xv","version":1}'::jsonb
    END
    WHERE invitation IS NULL OR invitation->>'template' IS NULL
  `);

  console.log("Base de datos PostgreSQL lista.");
  await client.end();
}

main().catch((err) => {
  console.error("Error inicializando la base de datos:", err.message);
  process.exit(1);
});
