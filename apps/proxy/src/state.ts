import type { PoolClient } from "pg";
import type { Past, Policy, State } from "@paycurb/engine";
import { config } from "./config";

export async function dailySpentCents(client: PoolClient, now: Date): Promise<number> {
  const result = await client.query(
    `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM reservations
     WHERE status IN ('reserved', 'completed')
       AND created_at >= (date_trunc('day', $1::timestamptz AT TIME ZONE $2) AT TIME ZONE $2)`,
    [now.toISOString(), config.policyTimezone],
  );
  return Number(result.rows[0].total);
}

export async function recentHistory(client: PoolClient, policy: Policy, now: Date): Promise<Past[]> {
  const minutes = Math.max(policy.merchant_window_limit.window_minutes, policy.velocity.window_minutes, policy.duplicate_window_minutes);
  const result = await client.query(
    `SELECT merchant_id, amount_cents, fingerprint, created_at FROM reservations
     WHERE status IN ('reserved', 'completed') AND created_at > $1::timestamptz - make_interval(mins => $2)`,
    [now.toISOString(), minutes],
  );
  return result.rows.map((row) => ({
    ts: row.created_at.getTime(),
    merchant_id: row.merchant_id,
    amount_cents: Number(row.amount_cents),
    fingerprint: row.fingerprint,
  }));
}

export async function loadState(client: PoolClient, policy: Policy, now: Date, approval: State["approval"]): Promise<State> {
  return {
    nowMs: now.getTime(),
    dailySpentCents: await dailySpentCents(client, now),
    history: await recentHistory(client, policy, now),
    approval,
  };
}
