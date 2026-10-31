import type { Policy } from "@paycurb/engine";

export const strictPolicy: Policy = {
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

export function withStrictDefaults(partial: Record<string, unknown>): Policy {
  const merged = { ...structuredClone(strictPolicy), ...partial } as Policy;
  merged.merchant_window_limit = { ...strictPolicy.merchant_window_limit, ...(partial.merchant_window_limit as object) };
  merged.velocity = { ...strictPolicy.velocity, ...(partial.velocity as object) };
  return merged;
}
