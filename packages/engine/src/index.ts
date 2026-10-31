export type Kind = "purchase" | "capture" | "refund" | "payout" | "invoice_send" | "subscription_create";
const KINDS: readonly string[] = ["purchase", "capture", "refund", "payout", "invoice_send", "subscription_create"];
const SPEND: readonly string[] = ["purchase", "capture", "invoice_send", "subscription_create"];
const SANITY_CAP_CENTS = 100_000_000;

export interface Policy {
  version: number;
  currency: string;
  per_transaction_limit_cents: number;
  auto_approve_below_cents: number;
  daily_limit_cents: number;
  merchant_window_limit: { cents: number; window_minutes: number };
  merchant_allowlist: string[];
  merchant_blocklist: string[];
  unknown_merchant_action: "block" | "escalate";
  allowed_categories: string[];
  block_recurring: boolean;
  max_quantity_per_line: number;
  velocity: { max_transactions: number; window_minutes: number };
  refunds: "escalate" | "block";
  payouts: "escalate" | "block";
  duplicate_window_minutes: number;
  approval_ttl_minutes: number;
}

export interface LineItem { sku: string; qty: number; unit_cents: number }
export interface Action {
  action_id: string;
  tool: string;
  kind: string;
  amount_cents: number;
  currency: string;
  merchant_id: string | null;
  category: string | null;
  recurring: boolean;
  line_items: LineItem[];
  payload_hash: string;
  agent_id: string;
  price_mismatch?: boolean;
}

export interface Past { ts: number; merchant_id: string | null; amount_cents: number; fingerprint: string }
export interface State {
  nowMs: number;
  dailySpentCents: number;
  history: Past[];
  approval?: { payload_hash: string; amount_cents: number } | null;
}

export type Outcome = "allow" | "escalate" | "block";
export interface Decision { decision: Outcome; rule_id: string; reason: string; details?: Record<string, unknown> }

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const block = (rule_id: string, reason: string): Decision => ({ decision: "block", rule_id, reason });
const esc = (rule_id: string, reason: string): Decision => ({ decision: "escalate", rule_id, reason });
export const fingerprint = (a: Pick<Action, "merchant_id" | "amount_cents" | "line_items">) =>
  JSON.stringify([a.merchant_id, a.amount_cents, a.line_items.map((l) => [l.sku, l.qty, l.unit_cents])]);

export function evaluate(a: Action, p: Policy, s: State): Decision {
  try {
    return run(a, p, s);
  } catch {
    return block("R00", "Blocked: internal error");
  }
}

function run(a: Action, p: Policy, s: State): Decision {
  if (!a || !KINDS.includes(a.kind) || !Array.isArray(a.line_items)) return block("R00", "Blocked: unknown tool or unparseable request");
  if (a.currency !== p.currency) return block("R01", `Blocked: currency ${a.currency} is not ${p.currency}`);
  const computed = a.line_items.reduce((t, l) => t + l.qty * l.unit_cents, 0);
  if (!Number.isInteger(a.amount_cents) || a.amount_cents <= 0 || a.amount_cents > SANITY_CAP_CENTS)
    return block("R02", "Blocked: amount is not a valid positive amount");
  if (a.line_items.length > 0 && computed !== a.amount_cents)
    return block("R02", `Blocked: stated total ${usd(a.amount_cents)} does not match line items ${usd(computed)}`);
  if (a.price_mismatch) return block("R02", "Blocked: line item price differs from the catalog price");

  const approved = s.approval ?? null;
  if (approved && (approved.payload_hash !== a.payload_hash || approved.amount_cents !== a.amount_cents))
    return block("R15", "Blocked: the request no longer matches what the owner approved");

  const spend = SPEND.includes(a.kind);
  const m = a.merchant_id;
  const min = 60_000;
  if (spend) {
    if ((a.recurring || a.kind === "subscription_create") && p.block_recurring) return block("R03", "Blocked: recurring payments are not allowed");
    if (m && p.merchant_blocklist.includes(m)) return block("R04", `Blocked: ${m} is on the blocklist`);
    const known = !!m && p.merchant_allowlist.includes(m);
    if (!known && p.unknown_merchant_action === "block") return block("R04", `Blocked: ${m ?? "unknown merchant"} is not an approved merchant`);
    if (!a.category || !p.allowed_categories.includes(a.category)) return block("R05", `Blocked: category ${a.category ?? "unknown"} is not allowed`);
  }
  if (a.amount_cents > p.per_transaction_limit_cents)
    return block("R06", `Blocked: ${usd(a.amount_cents)} exceeds the ${usd(p.per_transaction_limit_cents)} per-transaction limit`);
  if (spend) {
    if (s.dailySpentCents + a.amount_cents > p.daily_limit_cents)
      return block("R07", `Blocked: ${usd(s.dailySpentCents + a.amount_cents)} would exceed the ${usd(p.daily_limit_cents)} daily limit`);
    const w = p.merchant_window_limit;
    const atMerchant = s.history.filter((h) => h.merchant_id === m && s.nowMs - h.ts < w.window_minutes * min).reduce((t, h) => t + h.amount_cents, 0);
    if (atMerchant + a.amount_cents > w.cents)
      return block("R08", `Blocked: ${usd(atMerchant + a.amount_cents)} at ${m} in ${w.window_minutes} minutes exceeds the ${usd(w.cents)} limit`);
    const v = p.velocity;
    const count = s.history.filter((h) => s.nowMs - h.ts < v.window_minutes * min).length;
    if (count >= v.max_transactions) return block("R09", `Blocked: ${count} transactions in ${v.window_minutes} minutes reached the limit of ${v.max_transactions}`);
    const big = a.line_items.find((l) => l.qty > p.max_quantity_per_line);
    if (big) return block("R10", `Blocked: quantity ${big.qty} of ${big.sku} exceeds the maximum of ${p.max_quantity_per_line}`);
  }

  if (approved) return { decision: "allow", rule_id: "R99", reason: `Allowed: owner approved ${usd(a.amount_cents)}` };
  if (spend) {
    const fp = fingerprint(a);
    if (s.history.some((h) => h.fingerprint === fp && s.nowMs - h.ts < p.duplicate_window_minutes * min))
      return esc("R11", "Needs approval: identical to a recent purchase");
  }
  if (a.kind === "refund" || a.kind === "payout") {
    const mode = a.kind === "refund" ? p.refunds : p.payouts;
    return mode === "block" ? block("R12", `Blocked: ${a.kind}s are not allowed`) : esc("R12", `Needs approval: ${a.kind} of ${usd(a.amount_cents)}`);
  }
  if (spend && !(!!m && p.merchant_allowlist.includes(m))) return esc("R13", `Needs approval: ${m ?? "unknown merchant"} is not on the approved list`);
  if (a.amount_cents >= p.auto_approve_below_cents)
    return esc("R14", `Needs approval: ${usd(a.amount_cents)} is at or above the ${usd(p.auto_approve_below_cents)} auto-approve line`);
  return { decision: "allow", rule_id: "R99", reason: `Allowed: ${usd(a.amount_cents)} is within policy` };
}
