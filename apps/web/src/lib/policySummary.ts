import type { Policy } from "@paycurb/engine";
import { merchantName } from "./format";

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function policyLines(policy: Policy): string[] {
  const names = (policy.merchant_allowlist ?? []).map((id) => merchantName(id));
  return [
    `Each order may cost at most ${usd(policy.per_transaction_limit_cents)}.`,
    `Spending stops at ${usd(policy.daily_limit_cents)} a day.`,
    `Orders of ${usd(policy.auto_approve_below_cents)} or more wait for you.`,
    names.length ? `Trusted merchants: ${names.join(" and ")}.` : "No merchant is trusted yet.",
    `Other merchants are ${policy.unknown_merchant_action === "block" ? "blocked" : "held for you"}.`,
    `Refunds are ${policy.refunds === "block" ? "blocked" : "held for you"}. Payouts are ${policy.payouts === "block" ? "blocked" : "held for you"}.`,
  ];
}

export function policySummary(policy: Policy | undefined, sourceText: string) {
  if (!policy) {
    const first = sourceText.split(/(?<=\.)\s/)[0] ?? "";
    return first.length > 90 ? `${first.slice(0, 87)}...` : first;
  }
  const merchants = policy.merchant_allowlist?.length ?? 0;
  return `${usd(policy.per_transaction_limit_cents)} per order, ${usd(policy.daily_limit_cents)} a day, ask at ${usd(policy.auto_approve_below_cents)}, ${merchants} trusted ${merchants === 1 ? "merchant" : "merchants"}, payouts ${policy.payouts === "block" ? "blocked" : "held"}`;
}
