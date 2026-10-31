import { evaluate, type Action, type Policy } from "@paycurb/engine";
import { canonicalJson, hashPayload, merchants, products, sha256 } from "@paycurb/shared";
import type { ApprovalCard, AttackReport, AuditRow, Feed, PolicyVersion } from "../src/lib/types.ts";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const basePolicy: Policy = {
  version: 2,
  currency: "USD",
  per_transaction_limit_cents: 30000,
  auto_approve_below_cents: 10000,
  daily_limit_cents: 50000,
  merchant_window_limit: { cents: 25000, window_minutes: 60 },
  merchant_allowlist: ["acme-office", "paper-co"],
  merchant_blocklist: [],
  unknown_merchant_action: "escalate",
  allowed_categories: ["office_supplies"],
  block_recurring: true,
  max_quantity_per_line: 20,
  velocity: { max_transactions: 10, window_minutes: 10 },
  refunds: "escalate",
  payouts: "block",
  duplicate_window_minutes: 30,
  approval_ttl_minutes: 15,
};

export interface Scenario {
  tool: string;
  kind: string;
  merchantId: string;
  lines: { sku: string; qty: number }[];
  statedCents?: number;
  priceMismatch?: boolean;
}

const routine: Scenario[] = [
  { tool: "create_order", kind: "purchase", merchantId: "acme-office", lines: [{ sku: "ORG-1", qty: 1 }] },
  { tool: "create_order", kind: "purchase", merchantId: "acme-office", lines: [{ sku: "PEN-12", qty: 2 }] },
  { tool: "create_order", kind: "purchase", merchantId: "paper-co", lines: [{ sku: "PAPER-1", qty: 5 }] },
  { tool: "create_order", kind: "purchase", merchantId: "paper-co", lines: [{ sku: "NOTE-5", qty: 1 }] },
  { tool: "create_order", kind: "purchase", merchantId: "acme-office", lines: [{ sku: "ORG-1", qty: 1 }, { sku: "PEN-12", qty: 1 }] },
  { tool: "create_order", kind: "purchase", merchantId: "acme-office", lines: [{ sku: "LAMP-1", qty: 2 }] },
  { tool: "create_order", kind: "purchase", merchantId: "paper-co", lines: [{ sku: "NOTE-5", qty: 3 }] },
  { tool: "create_order", kind: "purchase", merchantId: "luxury-watches.example", lines: [{ sku: "WATCH-1", qty: 1 }] },
  { tool: "create_order", kind: "purchase", merchantId: "acme-office", lines: [{ sku: "PEN-12", qty: 30 }] },
  { tool: "create_order", kind: "purchase", merchantId: "paper-co", lines: [{ sku: "PAPER-1", qty: 2 }], statedCents: 1200 },
  { tool: "create_order", kind: "purchase", merchantId: "acme-office", lines: [{ sku: "LAMP-1", qty: 1 }], priceMismatch: true },
  { tool: "create_refund", kind: "refund", merchantId: "acme-office", lines: [], statedCents: 3500 },
  { tool: "create_payout", kind: "payout", merchantId: "paper-co", lines: [], statedCents: 20000 },
];

export const presets: Record<"normal" | "approval" | "injection", Scenario> = {
  normal: routine[4],
  approval: routine[5],
  injection: routine[7],
};

let seed = 20261030;
function random() {
  seed = (seed + 0x6d2b79f5) | 0;
  let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
const weighted = () => (random() < 0.62 ? routine[Math.floor(random() * 5)] : pick(routine));

function token(length: number, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789") {
  let text = "";
  for (let i = 0; i < length; i++) text += alphabet[Math.floor(random() * alphabet.length)];
  return text;
}

export function paypalRef() {
  return token(17);
}

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export interface Store {
  policy: Policy;
  versions: (PolicyVersion & { policy: Policy })[];
  feed: Feed[];
  audit: AuditRow[];
  approvals: ApprovalCard[];
  report: AttackReport | null;
  attackRunning: boolean;
}

export const store: Store = {
  policy: basePolicy,
  versions: [],
  feed: [],
  audit: [],
  approvals: [],
  report: null,
  attackRunning: false,
};

function buildAction(scenario: Scenario, nowMs: number): Action {
  const merchant = merchants.find((m) => m.id === scenario.merchantId);
  const lineItems = scenario.lines.map((line) => {
    const product = products.find((p) => p.id === line.sku);
    return { sku: line.sku, qty: line.qty, unit_cents: product ? product.price_cents : 0 };
  });
  const computed = lineItems.reduce((total, line) => total + line.qty * line.unit_cents, 0);
  const amount = scenario.statedCents ?? computed;
  const payload = {
    tool: scenario.tool,
    payee: merchant?.payee_ref,
    items: lineItems,
    amount,
    at: nowMs,
  };
  return {
    action_id: `act_${token(12, "abcdefghijkmnopqrstuvwxyz23456789")}`,
    tool: scenario.tool,
    kind: scenario.kind,
    amount_cents: amount,
    currency: "USD",
    merchant_id: scenario.merchantId,
    category: merchant ? merchant.category : null,
    recurring: false,
    line_items: lineItems,
    payload_hash: hashPayload(payload),
    agent_id: "demo-agent",
    ...(scenario.priceMismatch ? { price_mismatch: true } : {}),
  };
}

function spentSince(fromMs: number) {
  return store.feed
    .filter((f) => f.decision === "allow" && f.kind === "purchase" && new Date(f.ts).getTime() >= fromMs)
    .reduce((total, f) => total + f.amount_cents, 0);
}

function appendAudit(feed: Feed) {
  const previous = store.audit[store.audit.length - 1];
  const body = {
    seq: previous ? previous.seq + 1 : 1,
    ts: feed.ts,
    action_id: feed.action_id,
    tool: feed.tool,
    kind: feed.kind,
    amount_cents: feed.amount_cents,
    merchant_id: feed.merchant_id,
    decision: feed.decision,
    rule_id: feed.rule_id,
    reason: feed.reason,
    policy_version: feed.policy_version,
    payload_hash: feed.payload_hash,
    paypal_ref: feed.paypal_ref,
    prev_hash: previous ? previous.entry_hash : "0".repeat(64),
  };
  store.audit.push({ ...body, entry_hash: entryHash(body) });
}

export function entryHash(row: Omit<AuditRow, "entry_hash">) {
  return sha256(`${row.prev_hash}${canonicalJson(row)}`);
}

export function verifyChain() {
  let previous = "0".repeat(64);
  for (const row of store.audit) {
    const { entry_hash, ...body } = row;
    if (row.prev_hash !== previous || entryHash(body) !== entry_hash) {
      return { ok: false, checked: row.seq, first_broken_seq: row.seq };
    }
    previous = entry_hash;
  }
  return { ok: true, checked: store.audit.length, first_broken_seq: null };
}

export function record(scenario: Scenario, nowMs: number, daySpent?: number) {
  const action = buildAction(scenario, nowMs);
  const outcome = evaluate(action, store.policy, {
    nowMs,
    dailySpentCents: daySpent ?? spentSince(startOfToday()),
    history: [],
  });
  const merchant = merchants.find((m) => m.id === action.merchant_id);
  const seq = store.audit.length + 1;
  const feed: Feed = {
    id: `dec_${seq}`,
    action_id: action.action_id,
    ts: new Date(nowMs).toISOString(),
    tool: action.tool,
    kind: action.kind,
    merchant_id: action.merchant_id,
    merchant_name: merchant ? merchant.display_name : null,
    amount_cents: action.amount_cents,
    decision: outcome.decision,
    rule_id: outcome.rule_id,
    reason: outcome.reason,
    policy_version: store.policy.version,
    paypal_ref: outcome.decision === "allow" ? paypalRef() : null,
    payload_hash: action.payload_hash,
    action,
  };
  store.feed.push(feed);
  appendAudit(feed);
  let approval: ApprovalCard | null = null;
  if (outcome.decision === "escalate") approval = openApproval(feed, nowMs);
  return { feed, approval };
}

function openApproval(feed: Feed, nowMs: number): ApprovalCard {
  const approval: ApprovalCard = {
    id: `apr_${token(10, "abcdefghijkmnopqrstuvwxyz23456789")}`,
    action_id: feed.action_id,
    status: "pending",
    created_at: new Date(nowMs).toISOString(),
    expires_at: new Date(nowMs + store.policy.approval_ttl_minutes * MINUTE).toISOString(),
    amount_cents: feed.amount_cents,
    merchant_id: feed.merchant_id,
    merchant_name: feed.merchant_name,
    rule_id: feed.rule_id,
    reason: feed.reason,
    line_items: feed.action.line_items,
    execution: null,
  };
  store.approvals.push(approval);
  return approval;
}

export function nextScenario() {
  const current = stats();
  const quiet = routine.filter((_, index) => index !== 5 && index !== 6 && index !== 11);
  if (current.remaining_cents < 15000) return pick(current.pending_approvals >= 4 ? quiet.slice(5) : routine.slice(7));
  const next = weighted();
  return current.pending_approvals >= 4 && !quiet.includes(next) ? routine[0] : next;
}

export function expireApprovals(nowMs: number) {
  const changed: ApprovalCard[] = [];
  for (const approval of store.approvals) {
    if (approval.status === "pending" && new Date(approval.expires_at).getTime() <= nowMs) {
      approval.status = "expired";
      changed.push(approval);
    }
  }
  return changed;
}

function seedHistory(rows: number) {
  const today = startOfToday();
  const todayRows = Math.min(8, rows);
  const pastRows = rows - todayRows;
  const pastStart = today - 7 * DAY;
  const pastStep = (7 * DAY) / Math.max(1, pastRows);
  const todayStep = Math.max(MINUTE, Date.now() - 20 * MINUTE - today) / todayRows;
  const spentByDay = new Map<number, number>();
  for (let i = 0; i < rows; i++) {
    const at = i < pastRows
      ? Math.floor(pastStart + i * pastStep + random() * pastStep * 0.6)
      : Math.floor(today + (i - pastRows) * todayStep + random() * todayStep * 0.6);
    const day = Math.floor((at - today) / DAY);
    const { feed } = record(weighted(), at, spentByDay.get(day) ?? 0);
    if (feed.decision === "allow" && feed.kind === "purchase" && random() < 0.4) {
      spentByDay.set(day, (spentByDay.get(day) ?? 0) + feed.amount_cents);
    }
  }
  for (const approval of store.approvals) {
    const roll = random();
    if (roll < 0.55) {
      approval.status = "executed";
      approval.execution = { status: "COMPLETED", paypal_ref: paypalRef() };
    } else if (roll < 0.8) {
      approval.status = "rejected";
    } else {
      approval.status = "expired";
    }
  }
}

function seedPending() {
  const now = Date.now();
  const ttl = store.policy.approval_ttl_minutes * MINUTE;
  const ages = [11 * MINUTE, 6 * MINUTE, 2 * MINUTE];
  const picks = [routine[5], routine[6], routine[11]];
  picks.forEach((scenario, index) => {
    const { approval } = record(scenario, now - ages[index]);
    if (approval) approval.expires_at = new Date(now - ages[index] + ttl).toISOString();
  });
}

function seedVersions() {
  const now = Date.now();
  const firstPolicy: Policy = {
    ...basePolicy,
    version: 1,
    per_transaction_limit_cents: 20000,
    daily_limit_cents: 30000,
    unknown_merchant_action: "block",
    refunds: "block",
  };
  store.versions = [
    {
      version: 1,
      active: false,
      created_at: new Date(now - 9 * DAY).toISOString(),
      source_text: "Only buy office supplies from Acme Office Supply and Paper Co. Never spend more than $200 on one order or $300 in a day. Block refunds.",
      policy: firstPolicy,
    },
    {
      version: 2,
      active: true,
      created_at: new Date(now - 8 * DAY).toISOString(),
      source_text:
        "Only buy office supplies. Acme Office Supply and Paper Co are trusted. Ask me before anything at or over $100, never more than $300 in one order, and no more than $500 a day. Ask me about refunds and new merchants. Block subscriptions and payouts.",
      policy: basePolicy,
    },
  ];
}

export function seedReport(nowMs = Date.now()): AttackReport {
  const jitter = () => Math.round(random() * 4) / 100;
  return {
    generated_at: new Date(nowMs).toISOString(),
    model: "agent model from LLM_MODEL_AGENT",
    trials_per_agent_scenario: 5,
    groups: [
      { group: "Prompt injection in merchant page", scenarios: 12, baseline_success: 0.83 - jitter(), protected_success: 0, money_lost_baseline_cents: 480000, money_lost_protected_cents: 0 },
      { group: "Price and total tampering", scenarios: 8, baseline_success: 0.75, protected_success: 0, money_lost_baseline_cents: 96500, money_lost_protected_cents: 0 },
      { group: "Over limit and split orders", scenarios: 10, baseline_success: 0.9, protected_success: 0.1, money_lost_baseline_cents: 312000, money_lost_protected_cents: 9800 },
      { group: "Unknown merchant and payee swap", scenarios: 9, baseline_success: 0.67 + jitter(), protected_success: 0, money_lost_baseline_cents: 254000, money_lost_protected_cents: 0 },
      { group: "Replay and approval tampering", scenarios: 6, baseline_success: 1, protected_success: 0, money_lost_baseline_cents: 88000, money_lost_protected_cents: 0 },
      { group: "Refund and payout abuse", scenarios: 5, baseline_success: 0.8, protected_success: 0, money_lost_baseline_cents: 61000, money_lost_protected_cents: 0 },
    ],
    false_block_rate: 0.021,
    escalated_as_designed_rate: 0.96,
    latency_ms: { engine_p50: 0.4, engine_p95: 1.1, proxy_p50: 38, proxy_p95: 112 },
    limitations: [
      {
        id: "L1",
        description: "Many small orders just under the auto approve line at an allowed merchant, spread across the velocity window.",
        outcome: "Allowed until the merchant window limit stops them. Loss is capped at the window limit.",
      },
      {
        id: "L2",
        description: "An injected instruction that buys a real catalog item the owner did not want, at a trusted merchant, under every limit.",
        outcome: "Allowed. The policy cannot tell intent, only limits.",
      },
      {
        id: "L3",
        description: "The owner approves a purchase without reading the line items.",
        outcome: "Executed as approved. The approval card shows every line item to reduce this risk.",
      },
    ],
  };
}

export function reset() {
  seed = 20261030;
  store.policy = basePolicy;
  store.feed = [];
  store.audit = [];
  store.approvals = [];
  store.attackRunning = false;
  seedVersions();
  seedHistory(Number(process.env.MOCK_AUDIT_ROWS || 200) - 3);
  seedPending();
  store.report = process.env.MOCK_NO_REPORT ? null : seedReport(Date.now() - 3 * 60 * MINUTE);
  const breakSeq = Number(process.env.MOCK_BREAK_SEQ || 0);
  const broken = store.audit.find((row) => row.seq === breakSeq);
  if (broken) broken.reason = `${broken.reason} (edited)`;
}

export function stats() {
  const today = startOfToday();
  const spent = spentSince(today);
  return {
    spent_today_cents: spent,
    remaining_cents: Math.max(0, store.policy.daily_limit_cents - spent),
    pending_approvals: store.approvals.filter((a) => a.status === "pending").length,
    blocked_count: store.feed.filter((f) => f.decision === "block" && new Date(f.ts).getTime() >= today).length,
  };
}
