import type { Policy } from "@paycurb/engine";

export const workspaceDefault: Policy = {
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
  approval_ttl_minutes: 1440,
};

export const strictDefault: Policy = {
  version: 1,
  currency: "USD",
  per_transaction_limit_cents: 5000,
  auto_approve_below_cents: 2500,
  daily_limit_cents: 10000,
  merchant_window_limit: { cents: 6000, window_minutes: 60 },
  merchant_allowlist: [],
  merchant_blocklist: [],
  unknown_merchant_action: "block",
  allowed_categories: [],
  block_recurring: true,
  max_quantity_per_line: 5,
  velocity: { max_transactions: 5, window_minutes: 60 },
  refunds: "escalate",
  payouts: "block",
  duplicate_window_minutes: 10,
  approval_ttl_minutes: 15,
};

type Field = Exclude<keyof Policy, "version">;

export const fields: { key: Field; rule: string; meaning: string }[] = [
  { key: "currency", rule: "R01", meaning: "The only currency accepted. Anything else is blocked." },
  { key: "per_transaction_limit_cents", rule: "R06", meaning: "The largest single payment. A larger one is blocked." },
  { key: "auto_approve_below_cents", rule: "R14", meaning: "Your approval line. A purchase at or above it is held for you." },
  { key: "daily_limit_cents", rule: "R07", meaning: "Total spend in one day, counted in the proxy's POLICY_TIMEZONE. Going over is blocked." },
  { key: "merchant_window_limit", rule: "R08", meaning: "Spend at one merchant inside a rolling window. Going over is blocked." },
  { key: "merchant_allowlist", rule: "R13", meaning: "Merchants you trust. A purchase elsewhere is held or blocked, see unknown_merchant_action." },
  { key: "merchant_blocklist", rule: "R04", meaning: "Merchants that are always blocked." },
  { key: "unknown_merchant_action", rule: "R04", meaning: "What happens at a merchant that is not on the allowlist: block or escalate." },
  { key: "allowed_categories", rule: "R05", meaning: "Merchant categories that may be bought from. An empty list blocks every category." },
  { key: "block_recurring", rule: "R03", meaning: "Blocks subscriptions and recurring payments." },
  { key: "max_quantity_per_line", rule: "R10", meaning: "The most units of one item in one order." },
  { key: "velocity", rule: "R09", meaning: "How many payments may go through inside a rolling window." },
  { key: "refunds", rule: "R12", meaning: "Refunds are held for you (escalate) or blocked." },
  { key: "payouts", rule: "R12", meaning: "Payouts are held for you (escalate) or blocked." },
  { key: "duplicate_window_minutes", rule: "R11", meaning: "An identical purchase inside this window is held for you." },
  { key: "approval_ttl_minutes", rule: "R15", meaning: "How long a held order waits for you before it expires." },
];

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const list = (items: string[]) => (items.length ? items.join(", ") : "none");

export function fieldValue(policy: Policy, key: Field): string {
  switch (key) {
    case "per_transaction_limit_cents":
    case "auto_approve_below_cents":
    case "daily_limit_cents":
      return money(policy[key]);
    case "merchant_window_limit":
      return `${money(policy.merchant_window_limit.cents)} per ${policy.merchant_window_limit.window_minutes} min`;
    case "velocity":
      return `${policy.velocity.max_transactions} per ${policy.velocity.window_minutes} min`;
    case "merchant_allowlist":
    case "merchant_blocklist":
    case "allowed_categories":
      return list(policy[key]);
    case "block_recurring":
      return policy.block_recurring ? "true" : "false";
    case "duplicate_window_minutes":
    case "approval_ttl_minutes":
      return `${policy[key]} min`;
    default:
      return String(policy[key]);
  }
}
