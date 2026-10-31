import type { PoolClient } from "pg";
import { evaluate, fingerprint, type Action, type Decision, type State } from "@paycurb/engine";
import { sha256 } from "@paycurb/shared";
import { appendAudit } from "./audit";
import { getPool, inTransaction } from "./db";
import { publish } from "./events";
import { blankAction, getOrderArgs, prepareOrder, prepareRefund, type Prepared } from "./normalize";
import type { PayPalGateway } from "./paypal";
import { getActivePolicy } from "./policy";
import { createApproval, recordDecision } from "./records";
import { loadState } from "./state";
import { classify } from "./tools";
import { redact } from "./redact";

const SPEND_LOCK = 1;
const FAILED_STATUSES = ["FAILED", "DECLINED", "VOIDED", "DENIED"];

export interface Deps {
  gateway: PayPalGateway;
  now: () => Date;
}

export interface Call {
  tool: string;
  args: unknown;
  agentId: string;
}

export interface CallResult {
  decision: Decision["decision"];
  rule_id: string;
  reason: string;
  order?: { id: string; status: string; capture_id: string | null };
  refund?: { id: string; status: string };
  approval_id?: string;
}

type Staged = { kind: "final"; result: CallResult } | { kind: "execute"; action: Action; prepared: Prepared; key: string; policyVersion: number };

const resultOf = (decision: Decision, extra: Partial<CallResult> = {}): CallResult => ({ decision: decision.decision, rule_id: decision.rule_id, reason: decision.reason, ...extra });
const blockOf = (rule_id: string, reason: string): Decision => ({ decision: "block", rule_id, reason });

async function persistFinal(client: PoolClient, action: Action, decision: Decision, policyVersion: number | null, extra: Partial<CallResult> = {}): Promise<Staged> {
  await recordDecision(client, action, decision, policyVersion);
  return { kind: "final", result: resultOf(decision, extra) };
}

async function readOnly(deps: Deps, call: Call): Promise<CallResult> {
  const parsed = getOrderArgs.safeParse(call.args);
  const ok = parsed.success;
  let result: CallResult;
  let paypalRef: string | null = null;
  if (!ok) {
    result = { decision: "block", rule_id: "R00", reason: "Blocked: request does not match the tool schema" };
  } else {
    try {
      const order = await deps.gateway.getOrder(parsed.data.id);
      paypalRef = order.captureId ?? order.id;
      result = { decision: "allow", rule_id: "R99", reason: "Allowed: read only call", order: { id: order.id, status: order.status, capture_id: order.captureId } };
    } catch {
      result = { decision: "block", rule_id: "R00", reason: "Blocked: PayPal lookup failed" };
    }
  }
  await inTransaction((client) =>
    appendAudit(client, { action_id: null, tool: call.tool, kind: "read_only", amount_cents: null, merchant_id: null, decision: result.decision, rule_id: result.rule_id, reason: result.reason, policy_version: null, payload_hash: null, paypal_ref: paypalRef }),
  );
  return result;
}

async function refundProblem(client: PoolClient, captureId: string, amountCents: number): Promise<string | null> {
  const original = (
    await client.query("SELECT a.amount_cents FROM executions e JOIN actions a ON a.id = e.action_id WHERE e.paypal_ref = $1 AND a.tool = 'create_order' LIMIT 1", [captureId])
  ).rows[0];
  if (!original) return "Blocked: no matching purchase for that capture";
  const refunded = (
    await client.query(
      `SELECT COALESCE(SUM(a.amount_cents), 0) AS total FROM executions e JOIN actions a ON a.id = e.action_id
       WHERE a.tool = 'create_refund' AND e.status = 'COMPLETED' AND e.response_json_redacted->>'capture_id' = $1`,
      [captureId],
    )
  ).rows[0];
  if (amountCents > Number(original.amount_cents) - Number(refunded.total)) return "Blocked: refund exceeds the remaining purchase amount";
  return null;
}

type Resolution = { early: Staged } | { approval: State["approval"]; approvalRowId: string | null };

async function resolveApproval(client: PoolClient, action: Action, prepared: Prepared, policyVersion: number, now: Date): Promise<Resolution> {
  const byId = prepared.approvalId !== null;
  const found = byId
    ? await client.query("SELECT * FROM approvals WHERE id::text = $1", [prepared.approvalId])
    : await client.query("SELECT * FROM approvals WHERE payload_hash = $1 AND status IN ('pending', 'approved') ORDER BY created_at DESC LIMIT 1", [action.payload_hash]);
  const row = found.rows[0];
  if (!row) return { approval: null, approvalRowId: null };
  if (new Date(row.expires_at) <= now && (row.status === "pending" || row.status === "approved")) {
    await client.query("UPDATE approvals SET status = 'expired' WHERE id = $1", [row.id]);
    publish({ type: "approval", id: row.id });
    if (!byId) return { approval: null, approvalRowId: null };
    return { early: await persistFinal(client, action, blockOf("R15", "Blocked: the approval has expired"), policyVersion) };
  }
  if (row.status === "pending" && row.payload_hash !== action.payload_hash) return { approval: null, approvalRowId: null };
  if (row.status === "pending") return { early: { kind: "final", result: { decision: "escalate", rule_id: row.rule_id, reason: "Needs approval: waiting for the owner", approval_id: row.id } } };
  if (row.status === "executed") return { early: await persistFinal(client, action, blockOf("R15", "Blocked: this approval was already used"), policyVersion) };
  if (row.status === "approved") return { approval: { payload_hash: row.payload_hash, amount_cents: Number(row.amount_cents) }, approvalRowId: row.id };
  return { early: await persistFinal(client, action, blockOf("R15", "Blocked: the owner did not approve this request"), policyVersion) };
}

async function cachedResult(client: PoolClient, key: string, windowMinutes: number, now: Date): Promise<CallResult | "in_flight" | null> {
  const row = (await client.query("SELECT result_json, created_at FROM idempotency WHERE key = $1", [key])).rows[0];
  if (!row) return null;
  if (now.getTime() - new Date(row.created_at).getTime() > windowMinutes * 60_000) {
    await client.query("DELETE FROM idempotency WHERE key = $1", [key]);
    return null;
  }
  return row.result_json.pending ? "in_flight" : row.result_json;
}

async function stage(deps: Deps, prepared: Prepared, agentId: string): Promise<Staged> {
  const now = deps.now();
  const { action } = prepared;
  return inTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock($1)", [SPEND_LOCK]);
    const active = await getActivePolicy(client);
    if (!active) return persistFinal(client, action, blockOf("R00", "Blocked: no active policy"), null);
    const { policy, version } = active;
    const key = sha256(agentId + action.payload_hash);
    const cached = await cachedResult(client, key, policy.duplicate_window_minutes, now);
    if (cached === "in_flight") return persistFinal(client, action, blockOf("R11", "Blocked: an identical request is already in progress"), version);
    if (cached) return { kind: "final", result: cached };
    if (prepared.refund) {
      const problem = await refundProblem(client, prepared.refund.capture_id, action.amount_cents);
      if (problem) return persistFinal(client, action, blockOf("R12", problem), version);
    }
    const resolution = await resolveApproval(client, action, prepared, version, now);
    if ("early" in resolution) return resolution.early;
    const state = await loadState(client, policy, now, resolution.approval);
    const decision = evaluate(action, policy, state);
    if (decision.decision === "block") return persistFinal(client, action, decision, version);
    if (decision.decision === "escalate") {
      await recordDecision(client, action, decision, version);
      const approvalId = await createApproval(client, action, decision.rule_id, policy.approval_ttl_minutes, now);
      publish({ type: "approval", id: approvalId });
      return { kind: "final", result: resultOf(decision, { approval_id: approvalId }) };
    }
    await recordDecision(client, action, decision, version);
    if (action.kind !== "refund") {
      await client.query("INSERT INTO reservations (action_id, merchant_id, amount_cents, fingerprint, status, created_at) VALUES ($1,$2,$3,$4,'reserved',$5)", [
        action.action_id,
        action.merchant_id,
        action.amount_cents,
        fingerprint(action),
        now.toISOString(),
      ]);
    }
    await client.query("INSERT INTO idempotency (key, action_id, result_json, created_at) VALUES ($1,$2,$3,$4)", [key, action.action_id, JSON.stringify({ pending: true }), now.toISOString()]);
    if (resolution.approvalRowId) {
      await client.query("UPDATE approvals SET status = 'executed' WHERE id = $1", [resolution.approvalRowId]);
      publish({ type: "approval", id: resolution.approvalRowId });
    }
    return { kind: "execute", action, prepared, key, policyVersion: version };
  });
}

async function settle(action: Action, key: string, policyVersion: number, outcome: { status: string; ref: string | null; summary: unknown; result: CallResult; failed: boolean }) {
  await inTransaction(async (client) => {
    await client.query("UPDATE reservations SET status = $2 WHERE action_id = $1", [action.action_id, outcome.failed ? "released" : "completed"]);
    await client.query("INSERT INTO executions (action_id, paypal_ref, status, response_json_redacted) VALUES ($1,$2,$3,$4)", [action.action_id, outcome.ref, outcome.status, JSON.stringify(redact(outcome.summary))]);
    await appendAudit(client, {
      action_id: action.action_id,
      tool: action.tool,
      kind: action.kind,
      amount_cents: action.amount_cents,
      merchant_id: action.merchant_id,
      decision: outcome.result.decision,
      rule_id: outcome.result.rule_id,
      reason: outcome.result.reason,
      policy_version: policyVersion,
      payload_hash: action.payload_hash,
      paypal_ref: outcome.failed ? null : outcome.ref,
    });
    if (outcome.failed) await client.query("DELETE FROM idempotency WHERE key = $1", [key]);
    else await client.query("UPDATE idempotency SET result_json = $2 WHERE key = $1", [key, JSON.stringify(outcome.result)]);
  });
}

async function execute(deps: Deps, staged: Extract<Staged, { kind: "execute" }>): Promise<CallResult> {
  const { action, prepared, key, policyVersion } = staged;
  const failure = (reason: string): CallResult => ({ decision: "block", rule_id: "R00", reason });
  try {
    if (prepared.order) {
      const order = await deps.gateway.createOrder({
        amountCents: action.amount_cents,
        currency: action.currency,
        items: prepared.order.items.map((item, index) => ({ sku: item.sku, name: item.name, quantity: item.quantity, unitCents: action.line_items[index].unit_cents })),
        requestId: action.action_id,
      });
      const failed = FAILED_STATUSES.includes(order.status);
      const view = { id: order.id, status: order.status, capture_id: order.captureId };
      const result: CallResult = failed ? failure(`Blocked: PayPal returned ${order.status}, reservation released`) : { decision: "allow", rule_id: "R99", reason: `Executed at PayPal: ${order.status}`, order: view };
      await settle(action, key, policyVersion, { status: order.status, ref: order.captureId ?? order.id, summary: view, result, failed });
      return result;
    }
    const refund = prepared.refund!;
    const response = await deps.gateway.refund({ captureId: refund.capture_id, amountCents: action.amount_cents, currency: action.currency, note: refund.note_to_payer, requestId: action.action_id });
    const failed = FAILED_STATUSES.includes(response.status);
    const result: CallResult = failed ? failure(`Blocked: PayPal returned ${response.status}`) : { decision: "allow", rule_id: "R99", reason: `Executed at PayPal: ${response.status}`, refund: response };
    await settle(action, key, policyVersion, { status: response.status, ref: response.id, summary: { ...response, capture_id: refund.capture_id }, result, failed });
    return result;
  } catch {
    const result = failure("Blocked: the PayPal call failed and the reservation was released");
    await settle(action, key, policyVersion, { status: "failed", ref: null, summary: { error: "paypal call failed" }, result, failed: true });
    return result;
  }
}

export async function handleCall(deps: Deps, call: Call): Promise<CallResult> {
  try {
    const kind = classify(call.tool);
    if (kind === "read_only") return await readOnly(deps, call);
    const preparation =
      kind === "purchase" ? await prepareOrder(getPool(), call.args, call.agentId) : kind === "refund" ? await prepareRefund(getPool(), call.args, call.agentId) : null;
    if (!preparation) return await recordOnly(blankFor(call), blockOf("R00", "Blocked: unknown tool"));
    if (!preparation.ok) return await recordOnly(preparation.action, blockOf("R00", preparation.reason));
    const staged = await stage(deps, preparation.prepared, call.agentId);
    const result = staged.kind === "final" ? staged.result : await execute(deps, staged);
    publish({ type: "decision", action_id: preparation.prepared.action.action_id });
    return result;
  } catch {
    return { decision: "block", rule_id: "R00", reason: "Blocked: internal error" };
  }
}

async function recordOnly(action: Action, decision: Decision): Promise<CallResult> {
  await inTransaction((client) => recordDecision(client, action, decision, null));
  publish({ type: "decision", action_id: action.action_id });
  return resultOf(decision);
}

const blankFor = (call: Call) => blankAction(call.tool, call.agentId, call.args);
