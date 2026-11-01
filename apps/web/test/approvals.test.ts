import { describe, expect, it } from "vitest";
import { CONFIRM_MS, splitApprovals } from "../src/lib/approvals";
import type { ApprovalCard } from "../src/lib/types";

const now = Date.parse("2026-11-01T12:00:00Z");
const card = (id: string, status: ApprovalCard["status"], created = "2026-11-01T11:00:00Z"): ApprovalCard => ({
  id,
  action_id: id,
  status,
  created_at: created,
  expires_at: "2026-11-02T11:00:00Z",
  amount_cents: 7500,
  merchant_id: "acme-office",
  merchant_name: "Acme Office Supply",
  rule_id: "R14",
  reason: "Needs approval",
  line_items: [],
  execution: status === "executed" ? { status: "COMPLETED", paypal_ref: "CAP-1" } : null,
});

describe("splitApprovals", () => {
  it("keeps a just decided card in view for a short confirmation and out of the waiting count", () => {
    const split = splitApprovals([card("a", "executed"), card("b", "pending")], { a: now - 1000 }, now);
    expect(split.active.map((item) => item.id)).toEqual(["a", "b"]);
    expect(split.waiting).toBe(1);
    expect(split.history).toEqual([]);
  });

  it("moves the decided card into history once the confirmation ends", () => {
    const split = splitApprovals([card("a", "executed")], { a: now - CONFIRM_MS }, now);
    expect(split.active).toEqual([]);
    expect(split.history.map((item) => item.id)).toEqual(["a"]);
    expect(split.waiting).toBe(0);
  });

  it("lists cards decided elsewhere in history, newest first", () => {
    const split = splitApprovals([card("old", "rejected", "2026-11-01T09:00:00Z"), card("new", "executed", "2026-11-01T10:00:00Z")], {}, now);
    expect(split.history.map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("counts a pending card past its expiry as lapsed, not waiting", () => {
    const lapsed = { ...card("c", "pending"), expires_at: "2026-11-01T11:59:00Z" };
    expect(splitApprovals([lapsed], {}, now)).toMatchObject({ waiting: 0, lapsed: 1 });
  });
});
