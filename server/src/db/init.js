import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  const schema = await readFile(join(__dirname, "schema.sql"), "utf8");
  await conn.query(schema);

  const migrations = [
    "ALTER TABLE guests ADD COLUMN is_leader TINYINT(1) NOT NULL DEFAULT 0 AFTER is_child",
    "ALTER TABLE guests ADD COLUMN table_id INT NULL AFTER registered",
    "ALTER TABLE guests ADD COLUMN companion_id INT NULL AFTER table_id",
    "ALTER TABLE guests ADD CONSTRAINT fk_guest_table FOREIGN KEY (table_id) REFERENCES `tables`(id) ON DELETE SET NULL",
    "ALTER TABLE guests ADD CONSTRAINT fk_guest_companion FOREIGN KEY (companion_id) REFERENCES guests(id) ON DELETE CASCADE",
  ];
  for (const statement of migrations) {
    try {
      await conn.query(statement);
    } catch (err) {
      if (!["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME"].includes(err.code)) throw err;
    }
  }

  console.log(`Base de datos "${process.env.DB_NAME}" creada con su esquema.`);
  await conn.end();
}

main().catch((err) => {
  console.error("Error inicializando la base de datos:", err.message);
  process.exit(1);
});