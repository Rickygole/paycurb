import pg from "pg";

export const ownerUrl = () => process.env.OWNER_DATABASE_URL ?? "postgres:///paycurb";

export async function resetDatabase() {
  const client = new pg.Client({ connectionString: ownerUrl() });
  await client.connect();
  await client.query(
    "TRUNCATE audit_log, idempotency, reservations, executions, approvals, decisions, actions, policies, products, merchants, attack_runs RESTART IDENTITY CASCADE",
  );
  await client.end();
}

export async function asOwner<T>(work: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: ownerUrl() });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}
