import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { verifyChain } from "../src/audit";
import { decideApproval } from "../src/approvals";
import { closePool, getPool, inTransaction } from "../src/db";
import { handleCall, maxPendingApprovals, type Deps } from "../src/pipeline";
import { activatePolicy, defaultPolicy } from "../src/policy";
import { seedRegistry } from "../src/seed";
import { dailySpentCents } from "../src/state";
import { fakeGateway, type FakeGateway } from "./fakes";
import { resetDatabase } from "./helpers";

let gateway: FakeGateway;
let clock: Date;
let deps: Deps;

const acme = "acme-office@merchants.example";
const order = (dollars: number, payee = acme, sku = "ORG-1", extra: Record<string, unknown> = {}) => ({
  currencyCode: "USD",
  payee,
  items: [{ sku, name: "Item", quantity: 1, itemCost: dollars, itemTotal: dollars }],
  ...extra,
});
const buy = (args: unknown, tool = "create_order") => handleCall(deps, { tool, args, agentId: "test-agent" });
const minutes = (n: number) => (clock = new Date(clock.getTime() + n * 60_000));

async function useStrictPolicy(overrides: Record<string, unknown> = {}) {
  await inTransaction((client) => activatePolicy(client, { ...defaultPolicy, ...overrides } as typeof defaultPolicy, "test"));
}

beforeEach(async () => {
  await resetDatabase();
  gateway = fakeGateway();
  clock = new Date("2026-11-02T15:00:00Z");
  deps = { gateway, now: () => clock };
  await inTransaction(async (client) => {
    await seedRegistry(client);
  });
  await useStrictPolicy();
});
afterAll(closePool);

describe("allow, escalate and block", () => {
  it("allows a small purchase and creates one order", async () => {
    const result = await buy(order(12, acme, "PEN-12"));
    expect(result).toMatchObject({ decision: "allow", rule_id: "R99", order: { status: "COMPLETED", capture_id: "CAP1" } });
    expect(gateway.orders).toHaveLength(1);
  });

  it("escalates above the auto approve line and creates no order", async () => {
    const result = await buy(order(75, acme, "LAMP-1"));
    expect(result).toMatchObject({ decision: "escalate", rule_id: "R14" });
    expect(result.approval_id).toBeTruthy();
    expect(gateway.orders).toHaveLength(0);
  });

  it("stops creating approvals once the pending cap is reached", async () => {
    await useStrictPolicy({ per_transaction_limit_cents: 1_000_000, daily_limit_cents: 1_000_000, merchant_window_limit: { cents: 1_000_000, window_minutes: 60 }, max_quantity_per_line: 100 });
    const lamps = (quantity: number) => ({ currencyCode: "USD", payee: acme, items: [{ sku: "LAMP-1", name: "Item", quantity, itemCost: 75, itemTotal: 75 * quantity }] });
    for (let index = 1; index <= maxPendingApprovals; index++) {
      expect(await buy(lamps(index))).toMatchObject({ decision: "escalate" });
    }
    const over = await buy(lamps(maxPendingApprovals + 1));
    expect(over).toMatchObject({ decision: "block", rule_id: "R16" });
    expect(over.approval_id).toBeUndefined();
    const count = await getPool().query("SELECT COUNT(*)::int AS total FROM approvals WHERE status = 'pending'");
    expect(count.rows[0].total).toBe(maxPendingApprovals);
  });

  it("blocks the injected watch purchase and never calls PayPal", async () => {
    const result = await buy(order(400, "luxury-watches@merchants.example", "WATCH-1"));
    expect(result).toMatchObject({ decision: "block", rule_id: "R04" });
    expect(gateway.orders).toHaveLength(0);
  });

  it("blocks an unknown payee", async () => {
    expect(await buy(order(10, "stranger@example.com"))).toMatchObject({ decision: "block", rule_id: "R04" });
  });

  it("blocks a catalog price that does not match", async () => {
    expect(await buy(order(5, acme, "LAMP-1"))).toMatchObject({ decision: "block", rule_id: "R02" });
  });

  it("blocks a total that disagrees with its lines", async () => {
    const args = order(30);
    args.items[0].itemTotal = 300;
    expect(await buy(args)).toMatchObject({ decision: "block", rule_id: "R02" });
  });

  it("blocks bad numbers and currencies", async () => {
    expect(await buy(order(-5))).toMatchObject({ decision: "block", rule_id: "R02" });
    expect(await buy(order(0))).toMatchObject({ decision: "block", rule_id: "R02" });
    expect(await buy({ ...order(10), currencyCode: "EUR" })).toMatchObject({ decision: "block", rule_id: "R01" });
    expect(gateway.orders).toHaveLength(0);
  });

  it("blocks unknown tools, extra fields, wrong casing and huge payloads", async () => {
    expect(await buy({}, "transfer_funds")).toMatchObject({ decision: "block", rule_id: "R00" });
    expect(await buy({}, "CREATE_ORDER")).toMatchObject({ decision: "block", rule_id: "R00" });
    expect(await buy({ ...order(10), extra: true })).toMatchObject({ decision: "block", rule_id: "R00" });
    expect(await buy({ ...order(10), items: [{ sku: "x".repeat(200_000), name: "n", quantity: 1, itemCost: 1, itemTotal: 1 }] })).toMatchObject({ decision: "block", rule_id: "R00" });
    expect(gateway.orders).toHaveLength(0);
  });

  it("blocks everything when no policy is active", async () => {
    await getPool().query("UPDATE policies SET active = false");
    expect(await buy(order(12, acme, "PEN-12"))).toMatchObject({ decision: "block", rule_id: "R00" });
  });
});

describe("approvals", () => {
  const approveLamp = async () => {
    const first = await buy(order(75, acme, "LAMP-1"));
    await decideApproval(first.approval_id!, "approved", clock);
    return first.approval_id!;
  };

  it("executes once after approval and refuses a replay", async () => {
    await approveLamp();
    expect(await buy(order(75, acme, "LAMP-1"))).toMatchObject({ decision: "allow", order: { status: "COMPLETED" } });
    expect(gateway.orders).toHaveLength(1);
    minutes(11);
    const replay = await buy(order(75, acme, "LAMP-1"));
    expect(replay.decision).not.toBe("allow");
    expect(gateway.orders).toHaveLength(1);
  });

  it("blocks a changed amount after approval", async () => {
    const approvalId = await approveLamp();
    const tampered = await buy(order(450, acme, "CUSTOM-1", { approval_id: approvalId }));
    expect(tampered).toMatchObject({ decision: "block", rule_id: "R15" });
    expect(gateway.orders).toHaveLength(0);
  });

  it("evaluates a changed order as a new request while the first approval is still pending", async () => {
    const first = await buy(order(75, acme, "LAMP-1"));
    const changed = await buy(order(450, acme, "CUSTOM-1", { approval_id: first.approval_id }));
    expect(changed).toMatchObject({ decision: "block", rule_id: "R06" });
    expect(gateway.orders).toHaveLength(0);
  });

  it("blocks a swapped merchant after approval", async () => {
    const approvalId = await approveLamp();
    const swapped = await buy(order(75, "paper-co@merchants.example", "LAMP-1", { approval_id: approvalId }));
    expect(swapped).toMatchObject({ decision: "block", rule_id: "R15" });
  });

  it("blocks an approval that expired", async () => {
    const approvalId = await approveLamp();
    minutes(16);
    expect(await buy(order(75, acme, "LAMP-1", { approval_id: approvalId }))).toMatchObject({ decision: "block", rule_id: "R15" });
    expect(gateway.orders).toHaveLength(0);
  });

  it("blocks a rejected approval", async () => {
    const first = await buy(order(75, acme, "LAMP-1"));
    await decideApproval(first.approval_id!, "rejected", clock);
    expect(await buy(order(75, acme, "LAMP-1", { approval_id: first.approval_id }))).toMatchObject({ decision: "block", rule_id: "R15" });
  });

  it("keeps the same pending approval for an identical retry", async () => {
    const first = await buy(order(75, acme, "LAMP-1"));
    const second = await buy(order(75, acme, "LAMP-1"));
    expect(second.approval_id).toBe(first.approval_id);
  });

  it("re-evaluates at execution against the daily limit", async () => {
    const approvalId = await approveLamp();
    await useStrictPolicy({ daily_limit_cents: 7000 });
    expect(await buy(order(75, acme, "LAMP-1", { approval_id: approvalId }))).toMatchObject({ decision: "block" });
    expect(gateway.orders).toHaveLength(0);
  });
});

describe("limits that depend on history", () => {
  it("blocks the second large purchase at one merchant inside the window", async () => {
    await useStrictPolicy({ auto_approve_below_cents: 10000 });
    expect((await buy(order(90, acme, "CUSTOM-1"))).decision).toBe("allow");
    minutes(10);
    expect(await buy(order(90, acme, "CUSTOM-2"))).toMatchObject({ decision: "block", rule_id: "R08" });
    expect(gateway.orders).toHaveLength(1);
  });

  it("blocks the sixth small order inside the velocity window", async () => {
    await useStrictPolicy({ auto_approve_below_cents: 10000, merchant_window_limit: { cents: 100000, window_minutes: 60 }, duplicate_window_minutes: 0 });
    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push(await buy(order(8.99, "paper-co@merchants.example", "PAPER-1", { approval_id: undefined })));
      minutes(1);
    }
    expect(results.slice(0, 5).every((r) => r.decision === "allow")).toBe(true);
    expect(results[5]).toMatchObject({ decision: "block", rule_id: "R09" });
  });

  it("lets only one of two concurrent purchases through when together they exceed the daily limit", async () => {
    await useStrictPolicy({ auto_approve_below_cents: 10000, daily_limit_cents: 6000, merchant_window_limit: { cents: 100000, window_minutes: 60 } });
    const [a, b] = await Promise.all([buy(order(49.99, "paper-co@merchants.example", "NOTE-5")), buy(order(12, acme, "PEN-12"))]);
    expect([a.decision, b.decision].sort()).toEqual(["allow", "block"]);
    expect(gateway.orders).toHaveLength(1);
  });
});

describe("idempotency and failures", () => {
  it("creates one order for eight identical submissions", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => buy(order(12, acme, "PEN-12"))));
    expect(gateway.orders).toHaveLength(1);
    expect(results.filter((r) => r.decision === "allow")).not.toHaveLength(0);
  });

  it("uses a fresh PayPal request id for a later identical purchase", async () => {
    await buy(order(12, acme, "PEN-12"));
    minutes(11);
    await buy(order(12, acme, "PEN-12"));
    expect(gateway.orders).toHaveLength(2);
    expect(gateway.orders[0].requestId).not.toBe(gateway.orders[1].requestId);
  });

  it("returns the first result for a sequential repeat", async () => {
    const first = await buy(order(12, acme, "PEN-12"));
    const second = await buy(order(12, acme, "PEN-12"));
    expect(second).toEqual(first);
    expect(gateway.orders).toHaveLength(1);
  });

  it("releases the reservation when PayPal rejects the request", async () => {
    gateway.rejectNext = true;
    expect(await buy(order(12, acme, "PEN-12"))).toMatchObject({ decision: "block", rule_id: "R00" });
    const client = await getPool().connect();
    try {
      expect(await dailySpentCents(client, clock)).toBe(0);
    } finally {
      client.release();
    }
    expect(await buy(order(12, acme, "PEN-12"))).toMatchObject({ decision: "allow" });
  });

  it("keeps the amount reserved and never charges twice when the PayPal outcome is unknown", async () => {
    gateway.failNext = true;
    const first = await buy(order(12, acme, "PEN-12"));
    expect(first).toMatchObject({ decision: "block", rule_id: "R00" });
    expect(first.reason).toContain("unknown");
    const client = await getPool().connect();
    try {
      expect(await dailySpentCents(client, clock)).toBe(1200);
    } finally {
      client.release();
    }
    const retry = await buy(order(12, acme, "PEN-12"));
    expect(retry).toMatchObject({ decision: "block", rule_id: "R11" });
    expect(gateway.orders).toHaveLength(0);
  });
});

describe("refunds", () => {
  it("escalates a refund of a real capture and executes it after approval", async () => {
    const bought = await buy(order(12, acme, "PEN-12"));
    const capture = bought.order!.capture_id!;
    const refundArgs = { capture_id: capture, amount: 5 };
    const pending = await buy(refundArgs, "create_refund");
    expect(pending).toMatchObject({ decision: "escalate", rule_id: "R12" });
    await decideApproval(pending.approval_id!, "approved", clock);
    expect(await buy(refundArgs, "create_refund")).toMatchObject({ decision: "allow", refund: { status: "COMPLETED" } });
    expect(gateway.refunds).toHaveLength(1);
  });

  it("blocks a refund with no matching purchase or larger than the original", async () => {
    expect(await buy({ capture_id: "NOPE", amount: 5 }, "create_refund")).toMatchObject({ decision: "block", rule_id: "R12" });
    const bought = await buy(order(12, acme, "PEN-12"));
    expect(await buy({ capture_id: bought.order!.capture_id, amount: 50 }, "create_refund")).toMatchObject({ decision: "block", rule_id: "R12" });
    expect(gateway.refunds).toHaveLength(0);
  });
});

describe("audit trail", () => {
  it("records every decision in a verifiable chain", async () => {
    await buy(order(12, acme, "PEN-12"));
    await buy(order(400, "luxury-watches@merchants.example", "WATCH-1"));
    await buy({}, "transfer_funds");
    const client = await getPool().connect();
    try {
      const verification = await verifyChain(client);
      expect(verification.ok).toBe(true);
      expect(verification.checked).toBeGreaterThanOrEqual(4);
      const blocks = await client.query("SELECT count(*)::int AS n FROM audit_log WHERE decision = 'block'");
      expect(blocks.rows[0].n).toBe(2);
      const refs = await client.query("SELECT count(*)::int AS n FROM audit_log WHERE decision = 'block' AND paypal_ref IS NOT NULL");
      expect(refs.rows[0].n).toBe(0);
    } finally {
      client.release();
    }
  });
});
