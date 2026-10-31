import { merchants, products } from "@paycurb/shared/src/catalog";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" });
const timeOnly = new Intl.DateTimeFormat("en-US", { timeStyle: "medium" });
const clockTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const whole = new Intl.NumberFormat("en-US");

export const KNOWN_TOOLS = ["create_order", "get_order", "create_refund", "approval"];

export const dollars = (cents: number) => usd.format(cents / 100);
export const count = (value: number) => whole.format(value);
export const percent = (rate: number) => `${(rate * 100).toFixed(1)}%`;
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatTime = (iso: string) => timeOnly.format(new Date(iso));
export const clock = (iso: string) => clockTime.format(new Date(iso));
export const dayLabel = (iso: string) => shortDate.format(new Date(iso));
export const stamp = (iso: string, now = new Date()) => `${new Date(iso).toDateString() === now.toDateString() ? "Today" : dayLabel(iso)}, ${clock(iso)}`;
export const shortHash = (hash: string) => (hash.length > 14 ? `${hash.slice(0, 8)}...${hash.slice(-4)}` : hash);
export const hasAmount = (cents: number | null | undefined): cents is number => typeof cents === "number" && cents > 0;

export function merchantName(id: string | null, given?: string | null) {
  if (given) return given;
  if (!id) return "Unknown merchant";
  return merchants.find((merchant) => merchant.id === id)?.display_name ?? id;
}

export function auditMerchant(row: { kind: string; merchant_id: string | null }) {
  return row.merchant_id === null && ["policy", "admin"].includes(row.kind) ? "None" : merchantName(row.merchant_id);
}

export function productName(sku: string) {
  return products.find((product) => product.id === sku)?.name ?? sku;
}

export function secondsLeft(iso: string, nowMs: number) {
  return Math.max(0, Math.floor((new Date(iso).getTime() - nowMs) / 1000));
}

export function countdown(seconds: number) {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}m`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function fullReason(item: { tool: string; reason: string; decision: string }) {
  if (item.decision === "block" && !KNOWN_TOOLS.includes(item.tool)) return `Blocked: ${item.tool} is not a tool your policy allows`;
  return item.reason;
}

export function plainReason(item: { tool: string; reason: string; decision: string }) {
  const sentence = fullReason(item).replace(/^(Blocked|Needs approval|Allowed|Held)\s*:\s*/i, "");
  if (/^\w+_\w+/.test(sentence)) return sentence;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
