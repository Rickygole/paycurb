import type { PoolClient } from "pg";
import type { Action } from "@paycurb/engine";
import { dailySpentCents } from "./state";
import { getActivePolicy } from "./policy";

export interface Feed {
  id: number;
  action_id: string;
  ts: string;
  tool: string;
  kind: string;
  merchant_id: string | null;
  merchant_name: string | null;
  amount_cents: number | null;
  decision: string;
  rule_id: string;
  reason: string;
  policy_version: number | null;
  paypal_ref: string | null;
  payload_hash: string;
  action: Action;
}

export interface ApprovalCard {
  id: string;
  action_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  amount_cents: number;
  merchant_id: string | null;
  merchant_name: string | null;
  rule_id: string;
  reason: string;
  line_items: { sku: string; qty: number; unit_cents: number }[];
  execution: { status: string; paypal_ref: string | null } | null;
}

const toAction = (row: Record<string, any>): Action => ({
  action_id: row.action_id,
  tool: row.tool,
  kind: row.kind,
  amount_cents: row.amount_cents === null ? Number.NaN : Number(row.amount_cents),
  currency: row.currency,
  merchant_id: row.merchant_id,
  category: row.category,
  recurring: row.recurring,
  line_items: row.line_items_json,
  payload_hash: row.payload_hash,
  agent_id: row.agent_id,
});

const feedSelect = `
  SELECT d.id, d.action_id, d.created_at AS ts, d.decision, d.rule_id, d.reason, d.policy_version,
         a.tool, a.kind, a.amount_cents, a.currency, a.merchant_id, a.category, a.recurring, a.line_items_json, a.payload_hash, a.agent_id,
         m.display_name AS merchant_name,
         (SELECT e.paypal_ref FROM executions e WHERE e.action_id = a.id ORDER BY e.id DESC LIMIT 1) AS paypal_ref
  FROM decisions d JOIN actions a ON a.id = d.action_id LEFT JOIN merchants m ON m.id = a.merchant_id`;

const toFeed = (row: Record<string, any>): Feed => ({
  id: Number(row.id),
  action_id: row.action_id,
  ts: row.ts.toISOString(),
  tool: row.tool,
  kind: row.kind,
  merchant_id: row.merchant_id,
  merchant_name: row.merchant_name,
  amount_cents: row.amount_cents === null ? null : Number(row.amount_cents),
  decision: row.decision,
  rule_id: row.rule_id,
  reason: row.reason,
  policy_version: row.policy_version,
  paypal_ref: row.paypal_ref,
  payload_hash: row.payload_hash,
  action: toAction(row),
});

export async function recentFeed(client: PoolClient, limit: number): Promise<Feed[]> {
  const result = await client.query(`${feedSelect} ORDER BY d.id DESC LIMIT $1`, [limit]);
  return result.rows.map(toFeed);
}

export async function feedForAction(client: PoolClient, actionId: string): Promise<Feed | null> {
  const result = await client.query(`${feedSelect} WHERE d.action_id = $1 ORDER BY d.id DESC LIMIT 1`, [actionId]);
  return result.rows[0] ? toFeed(result.rows[0]) : null;
}

const approvalSelect = `
  SELECT p.id, p.action_id, p.status, p.created_at, p.expires_at, p.amount_cents, p.merchant_id, p.rule_id,
         m.display_name AS merchant_name, a.line_items_json,
         (SELECT d.reason FROM decisions d WHERE d.action_id = p.action_id ORDER BY d.id LIMIT 1) AS reason,
         (SELECT row_to_json(x) FROM (SELECT e.status, e.paypal_ref FROM executions e WHERE e.action_id IN
            (SELECT id FROM actions WHERE payload_hash = p.payload_hash) ORDER BY e.id DESC LIMIT 1) x) AS execution
  FROM approvals p JOIN actions a ON a.id = p.action_id LEFT JOIN merchants m ON m.id = p.merchant_id`;

const toCard = (row: Record<string, any>): ApprovalCard => ({
  id: row.id,
  action_id: row.action_id,
  status: row.status,
  created_at: row.created_at.toISOString(),
  expires_at: row.expires_at.toISOString(),
  amount_cents: Number(row.amount_cents),
  merchant_id: row.merchant_id,
  merchant_name: row.merchant_name,
  rule_id: row.rule_id,
  reason: row.reason,
  line_items: row.line_items_json,
  execution: row.execution,
});

export async function listApprovals(client: PoolClient, status: string | null): Promise<ApprovalCard[]> {
  const result = status
    ? await client.query(`${approvalSelect} WHERE p.status = $1 ORDER BY p.created_at DESC`, [status])
    : await client.query(`${approvalSelect} ORDER BY p.created_at DESC LIMIT 100`);
  return result.rows.map(toCard);
}

export async function getApproval(client: PoolClient, id: string): Promise<ApprovalCard | null> {
  const result = await client.query(`${approvalSelect} WHERE p.id::text = $1`, [id]);
  return result.rows[0] ? toCard(result.rows[0]) : null;
}

export async function stats(client: PoolClient, now: Date) {
  const active = await getActivePolicy(client);
  const spent = await dailySpentCents(client, now);
  const pending = await client.query("SELECT count(*)::int AS n FROM approvals WHERE status = 'pending' AND expires_at > $1", [now.toISOString()]);
  const blocked = await client.query("SELECT count(*)::int AS n FROM decisions WHERE decision = 'block'");
  return {
    spent_today_cents: spent,
    remaining_cents: Math.max(0, (active?.policy.daily_limit_cents ?? 0) - spent),
    pending_approvals: pending.rows[0].n,
    blocked_count: blocked.rows[0].n,
  };
}
