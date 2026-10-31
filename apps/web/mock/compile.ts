import type { Policy } from "@paycurb/engine";
import { merchants } from "@paycurb/shared";
import { basePolicy } from "./data.ts";

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function amountNear(text: string, words: string[]) {
  for (const word of words) {
    const after = new RegExp(`${word}[^.$]{0,40}\\$\\s?(\\d+(?:\\.\\d{1,2})?)`, "i").exec(text);
    if (after) return Math.round(Number(after[1]) * 100);
    const before = new RegExp(`\\$\\s?(\\d+(?:\\.\\d{1,2})?)[^.$]{0,30}${word}`, "i").exec(text);
    if (before) return Math.round(Number(before[1]) * 100);
  }
  return null;
}

export function compile(text: string, version: number) {
  const policy: Policy = { ...basePolicy, version, merchant_allowlist: [], refunds: "block", payouts: "block", unknown_merchant_action: "block" };
  const questions: string[] = [];

  const perOrder = amountNear(text, ["per order", "one order", "per transaction", "single", "each order", "per purchase"]);
  if (perOrder) policy.per_transaction_limit_cents = perOrder;
  else questions.push(`What is the most one order may cost? Using the strict default of ${usd(policy.per_transaction_limit_cents)}.`);

  const daily = amountNear(text, ["a day", "per day", "daily", "each day"]);
  if (daily) policy.daily_limit_cents = daily;
  else questions.push(`What is the daily spending limit? Using the strict default of ${usd(policy.daily_limit_cents)}.`);

  const ask = amountNear(text, ["ask me", "approval", "approve", "check with me"]);
  if (ask) policy.auto_approve_below_cents = ask;

  const lower = text.toLowerCase();
  policy.merchant_allowlist = merchants.filter((m) => lower.includes(m.display_name.toLowerCase()) || lower.includes(m.id)).map((m) => m.id);
  if (policy.merchant_allowlist.length === 0) questions.push("Which merchants are trusted? No merchant names were recognized, so every merchant needs your approval.");
  if (/new merchant|unknown merchant|other merchant/.test(lower)) policy.unknown_merchant_action = "escalate";
  if (/refund/.test(lower)) policy.refunds = /(ask|approv).{0,30}refund|refund.{0,30}(ask|approv)/.test(lower) ? "escalate" : "block";
  else questions.push("Should refunds be blocked or sent to you for approval? Blocking them for now.");
  if (/subscription|recurring/.test(lower)) policy.block_recurring = true;

  return { policy, readback: readback(policy), questions };
}

export function readback(policy: Policy): string[] {
  const names = policy.merchant_allowlist.map((id) => merchants.find((m) => m.id === id)?.display_name ?? id);
  return [
    `Each order may cost at most ${usd(policy.per_transaction_limit_cents)}.`,
    `Total spending is capped at ${usd(policy.daily_limit_cents)} per day.`,
    `Orders at or above ${usd(policy.auto_approve_below_cents)} wait for your approval.`,
    names.length ? `Trusted merchants: ${names.join(", ")}.` : "No merchant is trusted yet.",
    `Merchants not on the list are ${policy.unknown_merchant_action === "block" ? "blocked" : "sent to you for approval"}.`,
    `Only these categories are allowed: ${policy.allowed_categories.join(", ").replaceAll("_", " ")}.`,
    `No more than ${usd(policy.merchant_window_limit.cents)} at one merchant within ${policy.merchant_window_limit.window_minutes} minutes.`,
    `At most ${policy.velocity.max_transactions} orders within ${policy.velocity.window_minutes} minutes.`,
    `At most ${policy.max_quantity_per_line} of any one item per order.`,
    `Subscriptions and recurring payments are ${policy.block_recurring ? "blocked" : "allowed"}.`,
    `Refunds are ${policy.refunds === "block" ? "blocked" : "sent to you for approval"}. Payouts are ${policy.payouts === "block" ? "blocked" : "sent to you for approval"}.`,
    `An identical order within ${policy.duplicate_window_minutes} minutes needs your approval.`,
    `Approval requests expire after ${policy.approval_ttl_minutes} minutes.`,
  ];
}
