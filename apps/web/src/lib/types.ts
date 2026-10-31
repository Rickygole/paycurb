import type { Action, Policy } from "@paycurb/engine";

export type { Action, Policy };

export type Outcome = "allow" | "escalate" | "block";

export interface Feed {
  id: string;
  action_id: string;
  ts: string;
  tool: string;
  kind: string;
  merchant_id: string | null;
  merchant_name: string | null;
  amount_cents: number;
  decision: Outcome;
  rule_id: string;
  reason: string;
  policy_version: number;
  paypal_ref: string | null;
  payload_hash: string;
  action: Action;
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "executed";

export interface ApprovalCard {
  id: string;
  action_id: string;
  status: ApprovalStatus;
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

export interface AuditRow {
  seq: number;
  ts: string;
  action_id: string;
  tool: string;
  kind: string;
  amount_cents: number;
  merchant_id: string | null;
  decision: Outcome;
  rule_id: string;
  reason: string;
  policy_version: number;
  payload_hash: string;
  paypal_ref: string | null;
  prev_hash: string;
  entry_hash: string;
}

export interface AuditPage {
  rows: AuditRow[];
  next_cursor: string | null;
}

export interface ChainCheck {
  ok: boolean;
  checked: number;
  first_broken_seq: number | null;
}

export interface Stats {
  spent_today_cents: number;
  remaining_cents: number;
  pending_approvals: number;
  blocked_count: number;
}

export interface CompileResult {
  policy: Policy;
  readback: string[];
  questions: string[];
}

export interface ActivePolicy {
  version: number;
  policy: Policy;
  source_text: string;
  created_at: string;
}

export interface PolicyVersion {
  version: number;
  active: boolean;
  created_at: string;
  source_text: string;
  policy?: Policy;
}

export interface AttackGroup {
  group: string;
  scenarios: number;
  baseline_success: number;
  protected_success: number;
  money_lost_baseline_cents: number;
  money_lost_protected_cents: number;
}

export interface AttackReport {
  generated_at: string;
  model: string;
  trials_per_agent_scenario: number;
  groups: AttackGroup[];
  false_block_rate: number;
  escalated_as_designed_rate: number;
  latency_ms: { engine_p50: number; engine_p95: number; proxy_p50: number; proxy_p95: number };
  limitations: { id: string; description: string; outcome: string }[];
}

export type AgentEvent =
  | { type: "tool_call"; name: string; input: unknown }
  | { type: "tool_result"; name: string; output: unknown }
  | { type: "message"; text: string }
  | { type: "done" };
