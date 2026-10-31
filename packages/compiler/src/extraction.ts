import type { Policy } from "@paycurb/engine";
import { merchants } from "@paycurb/shared";

export interface Extraction {
  per_purchase_limit_dollars?: number;
  ask_approval_from_dollars?: number;
  daily_limit_dollars?: number;
  merchant_limit_dollars?: number;
  merchant_limit_minutes?: number;
  max_purchases?: number;
  max_purchases_minutes?: number;
  only_merchants?: string[];
  never_merchants?: string[];
  allow_subscriptions?: boolean;
  refunds?: "ask" | "block";
  payouts?: "ask" | "block";
  max_quantity_per_item?: number;
  questions?: string[];
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|co|company|corp)\b\.?/g, (word) => (word.startsWith("co") && word.length === 2 ? "co" : ""))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const plain = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function resolveMerchant(name: string): string {
  const wanted = plain(name);
  const known = merchants.find((merchant) => plain(merchant.display_name) === wanted || plain(merchant.id) === wanted || plain(merchant.id).startsWith(`${wanted} `) || wanted.startsWith(plain(merchant.id)));
  return known ? known.id : slug(name);
}

const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const cents = (dollars: number) => Math.round(dollars * 100);
const unique = (values: string[]) => [...new Set(values)];

export function toPolicyFields(input: Extraction): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (positive(input.per_purchase_limit_dollars)) fields.per_transaction_limit_cents = cents(input.per_purchase_limit_dollars);
  if (positive(input.ask_approval_from_dollars)) fields.auto_approve_below_cents = cents(input.ask_approval_from_dollars);
  if (positive(input.daily_limit_dollars)) fields.daily_limit_cents = cents(input.daily_limit_dollars);
  if (positive(input.merchant_limit_dollars)) {
    fields.merchant_window_limit = { cents: cents(input.merchant_limit_dollars), window_minutes: positive(input.merchant_limit_minutes) ? Math.round(input.merchant_limit_minutes) : 60 };
  }
  if (positive(input.max_purchases)) {
    fields.velocity = { max_transactions: Math.round(input.max_purchases), window_minutes: positive(input.max_purchases_minutes) ? Math.round(input.max_purchases_minutes) : 60 };
  }
  if (Array.isArray(input.only_merchants) && input.only_merchants.length > 0) fields.merchant_allowlist = unique(input.only_merchants.map(resolveMerchant));
  if (Array.isArray(input.never_merchants) && input.never_merchants.length > 0) fields.merchant_blocklist = unique(input.never_merchants.map(resolveMerchant));
  if (typeof input.allow_subscriptions === "boolean") fields.block_recurring = !input.allow_subscriptions;
  if (input.refunds === "ask") fields.refunds = "escalate";
  if (input.refunds === "block") fields.refunds = "block";
  if (input.payouts === "ask") fields.payouts = "escalate";
  if (input.payouts === "block") fields.payouts = "block";
  if (positive(input.max_quantity_per_item)) fields.max_quantity_per_line = Math.round(input.max_quantity_per_item);
  return fields;
}
