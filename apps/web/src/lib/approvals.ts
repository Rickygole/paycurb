import { secondsLeft } from "./format";
import type { ApprovalCard } from "./types";

export const CONFIRM_MS = 4000;
const HISTORY = 8;

export function splitApprovals(list: ApprovalCard[], acted: Record<string, number>, nowMs: number) {
  const confirming = (card: ApprovalCard) => card.status !== "pending" && card.id in acted && nowMs - acted[card.id] < CONFIRM_MS;
  const pending = list.filter((card) => card.status === "pending");
  const active = list.filter((card) => card.status === "pending" || confirming(card)).sort((a, b) => a.expires_at.localeCompare(b.expires_at));
  const history = list
    .filter((card) => card.status !== "pending" && !confirming(card))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, HISTORY);
  const waiting = pending.filter((card) => secondsLeft(card.expires_at, nowMs) > 0).length;
  return { active, history, waiting, lapsed: pending.length - waiting };
}
