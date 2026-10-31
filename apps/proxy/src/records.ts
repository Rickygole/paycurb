import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Action, Decision } from "@paycurb/engine";
import { appendAudit } from "./audit";

const finite = (value: number) => (Number.isFinite(value) ? value : null);

export async function recordDecision(client: PoolClient, action: Action, decision: Decision, policyVersion: number | null) {
  await client.query(
    `INSERT INTO actions (id, agent_id, tool, kind, amount_cents, currency, merchant_id, category, recurring, line_items_json, payload_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [action.action_id, action.agent_id, action.tool, action.kind, finite(action.amount_cents), action.currency, action.merchant_id, action.category, action.recurring, JSON.stringify(action.line_items), action.payload_hash],
  );
  await client.query("INSERT INTO decisions (action_id, decision, rule_id, reason, policy_version) VALUES ($1,$2,$3,$4,$5)", [
    action.action_id,
    decision.decision,
    decision.rule_id,
    decision.reason,
    policyVersion,
  ]);
  await appendAudit(client, {
    action_id: action.action_id,
    tool: action.tool,
    kind: action.kind,
    amount_cents: finite(action.amount_cents),
    merchant_id: action.merchant_id,
    decision: decision.decision,
    rule_id: decision.rule_id,
    reason: decision.reason,
    policy_version: policyVersion,
    payload_hash: action.payload_hash,
    paypal_ref: null,
  });
}

export async function createApproval(client: PoolClient, action: Action, ruleId: string, ttlMinutes: number, now: Date, args: unknown): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO approvals (id, action_id, payload_hash, amount_cents, merchant_id, rule_id, status, created_at, expires_at, args_json)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9)`,
    [id, action.action_id, action.payload_hash, action.amount_cents, action.merchant_id, ruleId, now.toISOString(), new Date(now.getTime() + ttlMinutes * 60_000).toISOString(), JSON.stringify(args)],
  );
  return id;
}
