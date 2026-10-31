import { describe, it, expect } from "vitest";
import { evaluate, fingerprint, type Action, type Policy, type State } from "../src";

const policy: Policy = {
  version: 1, currency: "USD", per_transaction_limit_cents: 10000, auto_approve_below_cents: 5000, daily_limit_cents: 20000,
  merchant_window_limit: { cents: 12000, window_minutes: 60 }, merchant_allowlist: ["acme-office", "paper-co"], merchant_blocklist: ["blocked-shop"],
  unknown_merchant_action: "block", allowed_categories: ["office_supplies"], block_recurring: true, max_quantity_per_line: 10,
  velocity: { max_transactions: 5, window_minutes: 60 }, refunds: "escalate", payouts: "block", duplicate_window_minutes: 10, approval_ttl_minutes: 15,
};
const NOW = 1_000_000_000_000;
const act = (o: Partial<Action> = {}): Action => {
  const amount_cents = o.amount_cents ?? 3500;
  return { action_id: "a", tool: "create_order", kind: "purchase", amount_cents, currency: "USD", merchant_id: "acme-office", category: "office_supplies",
    recurring: false, line_items: [{ sku: "X", qty: 1, unit_cents: amount_cents }], payload_hash: "h1", agent_id: "t", ...o };
};
const state = (o: Partial<State> = {}): State => ({ nowMs: NOW, dailySpentCents: 0, history: [], ...o });
const past = (minsAgo: number, amount_cents: number, merchant_id = "acme-office") =>
  ({ ts: NOW - minsAgo * 60_000, merchant_id, amount_cents, fingerprint: fingerprint(act({ amount_cents, merchant_id })) });
const ev = (a: Action, s = state(), p = policy) => evaluate(a, p, s);
const is = (d: { decision: string; rule_id: string }, decision: string, rule_id: string) => expect([d.decision, d.rule_id]).toEqual([decision, rule_id]);

describe("worked examples", () => {
  it("1 allow organizer", () => is(ev(act()), "allow", "R99"));
  it("2 escalate lamp", () => is(ev(act({ amount_cents: 7500 })), "escalate", "R14"));
  it("3 injection watch", () => is(ev(act({ amount_cents: 40000, merchant_id: "luxury-watches.example" })), "block", "R04"));
  it("4 second $90 at same merchant", () => is(ev(act({ amount_cents: 9000 }), state({ dailySpentCents: 9000, history: [past(10, 9000)] })), "block", "R08"));
  it("5 sixth $19 order", () =>
    is(ev(act({ amount_cents: 1900 }), state({ dailySpentCents: 9500, history: [5, 10, 15, 20, 25].map((m) => past(m, 1900)) })), "block", "R09"));
  it("6 refund escalates", () => is(ev(act({ kind: "refund", amount_cents: 2000 })), "escalate", "R12"));
  it("7 subscription", () => is(ev(act({ kind: "subscription_create", amount_cents: 900, recurring: true })), "block", "R03"));
  it("8 approved $75 resubmitted as $450", () =>
    is(ev(act({ amount_cents: 45000, payload_hash: "h2" }), state({ approval: { payload_hash: "h1", amount_cents: 7500 } })), "block", "R15"));
  it("9 unknown tool kind", () => is(ev(act({ kind: "transfer_funds" })), "block", "R00"));
  it("10 total vs line items", () => is(ev(act({ amount_cents: 3000, line_items: [{ sku: "X", qty: 1, unit_cents: 30000 }] })), "block", "R02"));
});

describe("each rule", () => {
  it("R00 malformed", () => { is(ev(null as unknown as Action), "block", "R00"); is(ev(act({ line_items: undefined as never })), "block", "R00"); });
  it("R00 engine error fails closed", () => is(evaluate(act(), null as unknown as Policy, state()), "block", "R00"));
  it("R01 currency", () => is(ev(act({ currency: "EUR" })), "block", "R01"));
  it("R02 bad amounts", () => {
    for (const n of [0, -5, 1.5, NaN, 200_000_000]) is(ev(act({ amount_cents: n, line_items: [] })), "block", "R02");
    is(ev(act({ amount_cents: "3500 " as never })), "block", "R02");
    is(ev(act({ price_mismatch: true })), "block", "R02");
  });
  it("R03 recurring flag, and allowed when policy permits", () => {
    is(ev(act({ recurring: true })), "block", "R03");
    is(ev(act({ recurring: true }), state(), { ...policy, block_recurring: false }), "allow", "R99");
  });
  it("R04 blocklist, null merchant, escalate mode", () => {
    is(ev(act({ merchant_id: "blocked-shop" })), "block", "R04");
    is(ev(act({ merchant_id: null })), "block", "R04");
    is(ev(act({ merchant_id: "new-shop" }), state(), { ...policy, unknown_merchant_action: "escalate" }), "escalate", "R13");
  });
  it("R05 category", () => { is(ev(act({ category: "jewelry" })), "block", "R05"); is(ev(act({ category: null })), "block", "R05"); });
  it("R06 per-transaction", () => is(ev(act({ amount_cents: 10001 })), "block", "R06"));
  it("R06 exact limit escalates not blocks", () => is(ev(act({ amount_cents: 10000 })), "escalate", "R14"));
  it("R07 daily", () => is(ev(act({ amount_cents: 6000 }), state({ dailySpentCents: 15000 })), "block", "R07"));
  it("R08 ignores old and other-merchant history", () =>
    is(ev(act({ amount_cents: 9000 }), state({ history: [past(90, 9000), past(5, 9000, "paper-co")] })), "escalate", "R14"));
  it("R10 quantity", () => is(ev(act({ line_items: [{ sku: "PEN", qty: 11, unit_cents: 100 }], amount_cents: 1100 })), "block", "R10"));
  it("R11 duplicate escalates, expires after window", () => {
    is(ev(act(), state({ history: [past(5, 3500)] })), "escalate", "R11");
    is(ev(act(), state({ history: [past(11, 3500)] })), "allow", "R99");
  });
  it("R12 refund/payout modes", () => {
    is(ev(act({ kind: "refund", amount_cents: 2000 }), state(), { ...policy, refunds: "block" }), "block", "R12");
    is(ev(act({ kind: "payout", amount_cents: 2000 })), "block", "R12");
    is(ev(act({ kind: "payout", amount_cents: 2000 }), state(), { ...policy, payouts: "escalate" }), "escalate", "R12");
  });
  it("R15 matching approval allows, even over auto-approve line", () =>
    is(ev(act({ amount_cents: 7500 }), state({ approval: { payload_hash: "h1", amount_cents: 7500 } })), "allow", "R99"));
  it("R15 hash-only change blocks", () =>
    is(ev(act({ amount_cents: 7500, payload_hash: "other" }), state({ approval: { payload_hash: "h1", amount_cents: 7500 } })), "block", "R15"));
  it("approval does not override hard limits", () =>
    is(ev(act({ amount_cents: 7500 }), state({ dailySpentCents: 19000, approval: { payload_hash: "h1", amount_cents: 7500 } })), "block", "R07"));
  it("refund skips merchant and category rules", () => is(ev(act({ kind: "refund", amount_cents: 2000, merchant_id: "x", category: null })), "escalate", "R12"));
  it("reasons use dollars", () => expect(ev(act({ amount_cents: 40000 })).reason).toContain("$"));
});

describe("property", () => {
  it("never allows above the per-transaction limit", () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
    const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
    for (let i = 0; i < 5000; i++) {
      const amount_cents = Math.floor(rnd() * 60000) - 100;
      const a = act({
        amount_cents, kind: pick(["purchase", "capture", "refund", "payout", "invoice_send", "subscription_create", "bogus"]),
        merchant_id: pick(["acme-office", "paper-co", "x", null]), category: pick(["office_supplies", "jewelry", null]), recurring: rnd() < 0.2,
        line_items: rnd() < 0.5 ? [] : [{ sku: "S", qty: 1 + Math.floor(rnd() * 15), unit_cents: Math.floor(rnd() * 3000) }],
      });
      const s = state({ dailySpentCents: Math.floor(rnd() * 25000), approval: rnd() < 0.3 ? { payload_hash: "h1", amount_cents } : null });
      const d = ev(a, s);
      if (d.decision === "allow") expect(a.amount_cents).toBeLessThanOrEqual(policy.per_transaction_limit_cents);
    }
  });
});
