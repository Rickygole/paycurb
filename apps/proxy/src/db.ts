import pg from "pg";
import { config } from "./config";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: config.databaseUrl(), max: 10 });
  return pool;
}

export async function closePool() {
  await pool?.end();
  pool = null;
}

export async function inTransaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function assertRestrictedRole() {
  const result = await getPool().query("SELECT has_table_privilege(current_user, 'audit_log', 'UPDATE') OR has_table_privilege(current_user, 'audit_log', 'DELETE') AS unsafe");
  if (result.rows[0].unsafe) throw new Error("database role can modify the audit log, use the restricted application role");
}
