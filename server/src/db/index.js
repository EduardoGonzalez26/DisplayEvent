import pg from "pg";
import dotenv from "dotenv";
import dns from "node:dns";
import net from "node:net";

dotenv.config();

dns.setDefaultResultOrder("ipv4first");

pg.types.setTypeParser(1082, (v) => v); // DATE -> "YYYY-MM-DD"
pg.types.setTypeParser(1083, (v) => v); // TIME -> "HH:MM:SS"
pg.types.setTypeParser(1114, (v) => v); // TIMESTAMP -> string
pg.types.setTypeParser(1184, (v) => v); // TIMESTAMPTZ -> string

// Render no tiene salida IPv6 (ENETUNREACH), y pg no respeta `family`.
// Resolvemos el host a IPv4 y conectamos a la IP literal.
function ipv4ConnectionString(connStr) {
  try {
    const url = new URL(connStr);
    if (!/^postgres(ql)?:/.test(url.protocol)) return connStr;
    if (!url.hostname || net.isIP(url.hostname)) return connStr;
    const [v4] = dns.resolve4Sync(url.hostname);
    if (v4) url.hostname = v4;
    return url.toString();
  } catch {
    return connStr;
  }
}

const connection = process.env.DATABASE_URL
  ? {
      connectionString: ipv4ConnectionString(process.env.DATABASE_URL),
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
