import { merchants } from "@paycurb/shared/src/catalog";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" });
const timeOnly = new Intl.DateTimeFormat("en-US", { timeStyle: "medium" });
const whole = new Intl.NumberFormat("en-US");

export const dollars = (cents: number) => usd.format(cents / 100);
export const count = (value: number) => whole.format(value);
export const percent = (rate: number) => `${(rate * 100).toFixed(1)}%`;
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatTime = (iso: string) => timeOnly.format(new Date(iso));
export const shortHash = (hash: string) => (hash.length > 14 ? `${hash.slice(0, 8)}...${hash.slice(-4)}` : hash);

export function merchantName(id: string | null, given?: string | null) {
  if (given) return given;
  if (!id) return "Unknown merchant";
  return merchants.find((merchant) => merchant.id === id)?.display_name ?? id;
}

export function secondsLeft(iso: string, nowMs: number) {
  return Math.max(0, Math.floor((new Date(iso).getTime() - nowMs) / 1000));
}

export function countdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
