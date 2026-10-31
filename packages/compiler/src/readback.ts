import type { Policy } from "@paycurb/engine";

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function windowText(minutes: number): string {
  if (minutes === 60) return "hour";
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

function names(ids: string[]): string {
  return ids.join(", ");
}

export function readback(policy: Policy): string[] {
  const lines: string[] = [];
  lines.push(`Block any single purchase above ${dollars(policy.per_transaction_limit_cents)}.`);
  lines.push(`Ask me before any purchase of ${dollars(policy.auto_approve_below_cents)} or more.`);
  lines.push(`Block spending above ${dollars(policy.daily_limit_cents)} in a day.`);
  const window = policy.merchant_window_limit;
  lines.push(`Block more than ${dollars(window.cents)} at one merchant within ${windowText(window.window_minutes)}.`);
  if (policy.merchant_allowlist.length > 0) lines.push(`Only buy from: ${names(policy.merchant_allowlist)}.`);
  if (policy.merchant_blocklist.length > 0) lines.push(`Never buy from: ${names(policy.merchant_blocklist)}.`);
  if (policy.unknown_merchant_action === "block") lines.push("Block any merchant that is not on the approved list.");
  else lines.push("Ask me before buying from any merchant that is not on the approved list.");
  if (policy.allowed_categories.length > 0) lines.push(`Only allow these categories: ${names(policy.allowed_categories)}.`);
  else lines.push("Block purchases in every category until categories are allowed.");
  if (policy.block_recurring) lines.push("Block subscriptions and recurring payments.");
  else lines.push("Allow subscriptions and recurring payments.");
  lines.push(`Block more than ${policy.max_quantity_per_line} of any one item per order.`);
  const velocity = policy.velocity;
  lines.push(`Block more than ${velocity.max_transactions} purchases within ${windowText(velocity.window_minutes)}.`);
  lines.push(policy.refunds === "block" ? "Block all refunds." : "Ask me before any refund.");
  lines.push(policy.payouts === "block" ? "Block all payouts." : "Ask me before any payout.");
  lines.push(`Ask me before repeating an identical purchase within ${policy.duplicate_window_minutes} minutes.`);
  lines.push(`Approval requests expire after ${policy.approval_ttl_minutes} minutes.`);
  return lines;
}
