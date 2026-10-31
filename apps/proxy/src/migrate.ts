import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const directory = join(dirname(fileURLToPath(import.meta.url)), "../../../db/migrations");

export async function migrate(ownerUrl: string, appPassword: string) {
  const client = new pg.Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'paycurb_app'");
    const quoted = `'${appPassword.replace(/'/g, "''")}'`;
    await client.query(role.rowCount ? `ALTER ROLE paycurb_app LOGIN PASSWORD ${quoted}` : `CREATE ROLE paycurb_app LOGIN PASSWORD ${quoted}`);
    const applied = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((row) => row.name));
    for (const file of readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()) {
      if (applied.has(file)) continue;
      await client.query("BEGIN");
      await client.query(readFileSync(join(directory, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ownerUrl = process.env.OWNER_DATABASE_URL;
  const appPassword = process.env.APP_DB_PASSWORD;
  if (!ownerUrl || !appPassword) throw new Error("OWNER_DATABASE_URL and APP_DB_PASSWORD are required");
  await migrate(ownerUrl, appPassword);
}
