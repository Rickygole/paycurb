import { secondsLeft } from "./format";
import type { ApprovalCard } from "./types";

export const CONFIRM_MS = 4000;
const HISTORY = 8;

export function splitApprovals(list: ApprovalCard[], acted: Record<string, number>, nowMs: number, sending: Record<string, number> = {}) {
  const decidedAt = (card: ApprovalCard) => acted[card.id] ?? sending[card.id] ?? 0;
  const pending = list.filter((card) => card.status === "pending").sort((a, b) => a.expires_at.localeCompare(b.expires_at));
  const decided = list
    .filter((card) => card.status !== "pending")
    .sort((a, b) => decidedAt(b) - decidedAt(a) || b.created_at.localeCompare(a.created_at));
  const confirming = decided.filter((card) => card.id in acted && nowMs - acted[card.id] < CONFIRM_MS);
  const waiting = pending.filter((card) => secondsLeft(card.expires_at, nowMs) > 0).length;
  return { active: pending, confirming, history: decided.slice(0, HISTORY), waiting, lapsed: pending.length - waiting };
}
