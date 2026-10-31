import type { PoolClient } from "pg";
import type { Policy } from "@paycurb/engine";

export const defaultPolicy: Policy = {
  version: 1,
  currency: "USD",
  per_transaction_limit_cents: 10000,
  auto_approve_below_cents: 5000,
  daily_limit_cents: 20000,
  merchant_window_limit: { cents: 12000, window_minutes: 60 },
  merchant_allowlist: ["acme-office", "paper-co"],
  merchant_blocklist: [],
  unknown_merchant_action: "block",
  allowed_categories: ["office_supplies"],
  block_recurring: true,
  max_quantity_per_line: 10,
  velocity: { max_transactions: 5, window_minutes: 60 },
  refunds: "escalate",
  payouts: "block",
  duplicate_window_minutes: 10,
  approval_ttl_minutes: 15,
};

export interface ActivePolicy {
  version: number;
  policy: Policy;
  source_text: string;
  created_at: string;
}

const toActive = (row: Record<string, any>): ActivePolicy => ({
  version: row.version,
  policy: { ...row.policy_json, version: row.version },
  source_text: row.source_text,
  created_at: row.created_at.toISOString(),
});

export async function getActivePolicy(client: PoolClient): Promise<ActivePolicy | null> {
  const result = await client.query("SELECT * FROM policies WHERE active LIMIT 1");
  return result.rows[0] ? toActive(result.rows[0]) : null;
}

export async function activatePolicy(client: PoolClient, policy: Policy, sourceText: string): Promise<number> {
  await client.query("SELECT pg_advisory_xact_lock(3)");
  const next = Number((await client.query("SELECT COALESCE(MAX(version), 0) + 1 AS next FROM policies")).rows[0].next);
  await client.query("UPDATE policies SET active = false WHERE active");
  await client.query("INSERT INTO policies (version, source_text, policy_json, active) VALUES ($1, $2, $3, true)", [
    next,
    sourceText,
    JSON.stringify({ ...policy, version: next }),
  ]);
  return next;
}

export async function listVersions(client: PoolClient) {
  const result = await client.query("SELECT version, active, created_at, source_text FROM policies ORDER BY version DESC");
  return result.rows.map((row) => ({ version: row.version, active: row.active, created_at: row.created_at.toISOString(), source_text: row.source_text }));
}
