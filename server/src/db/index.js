import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

pg.types.setTypeParser(1082, (v) => v); // DATE -> "YYYY-MM-DD"
pg.types.setTypeParser(1083, (v) => v); // TIME -> "HH:MM:SS"
pg.types.setTypeParser(1114, (v) => v); // TIMESTAMP -> string
pg.types.setTypeParser(1184, (v) => v); // TIMESTAMPTZ -> string

const connection = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.PGHOST || process.env.DB_HOST,
      port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
      user: process.env.PGUSER || process.env.DB_USER,
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
      database: process.env.PGDATABASE || process.env.DB_NAME,
    };

export const pool = new pg.Pool({ ...connection, max: 10 });

export async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

// Ejecuta una transacción con un cliente dedicado de `pg`.
// callback(client) => valores; hace BEGIN/COMMIT/ROLLBACK automáticamente.
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
