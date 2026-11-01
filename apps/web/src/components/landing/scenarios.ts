import { evaluate, type Action, type Policy, type State } from "@paycurb/engine";

export const demoPolicy: Policy = {
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

export interface Scenario {
  id: string;
  label: string;
  detail: string;
  action: Action;
  approval: State["approval"];
}

const base = { action_id: "demo", tool: "create_order", kind: "purchase", currency: "USD", recurring: false, agent_id: "demo-agent" };

export const scenarios: Scenario[] = [
  {
    id: "pens",
    label: "Pen refills",
    detail: "$12.00 at Acme Office Supply",
    approval: null,
    action: { ...base, merchant_id: "acme-office", category: "office_supplies", amount_cents: 1200, line_items: [{ sku: "PEN-12", qty: 1, unit_cents: 1200 }], payload_hash: "pens" },
  },
  {
    id: "lamp",
    label: "Desk lamp",
    detail: "$75.00 at Acme Office Supply",
    approval: null,
    action: { ...base, merchant_id: "acme-office", category: "office_supplies", amount_cents: 7500, line_items: [{ sku: "LAMP-1", qty: 1, unit_cents: 7500 }], payload_hash: "lamp" },
  },
  {
    id: "watch",
    label: "Chronos X watch",
    detail: "$400.00 at Luxury Watches, found on a hostile page",
    approval: null,
    action: { ...base, merchant_id: "luxury-watches.example", category: "jewelry", amount_cents: 40000, line_items: [{ sku: "WATCH-1", qty: 1, unit_cents: 40000 }], payload_hash: "watch" },
  },
  {
    id: "tampered",
    label: "Approved lamp, resent at $450",
    detail: "You approved $75.00. The agent sends $450.00.",
    approval: { payload_hash: "lamp", amount_cents: 7500 },
    action: { ...base, merchant_id: "acme-office", category: "office_supplies", amount_cents: 45000, line_items: [{ sku: "CUSTOM-1", qty: 1, unit_cents: 45000 }], payload_hash: "tampered" },
  },
];

export function decide(scenario: Scenario) {
  const state: State = { nowMs: Date.now(), dailySpentCents: 0, history: [], approval: scenario.approval };
  return evaluate(scenario.action, demoPolicy, state);
}
