import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { appendAudit, verifyChain, type AuditInput } from "../src/audit";
import { assertRestrictedRole, closePool, getPool, inTransaction } from "../src/db";
import { asOwner, resetDatabase } from "./helpers";

const entry = (overrides: Partial<AuditInput> = {}): AuditInput => ({
  action_id: null, tool: "create_order", kind: "purchase", amount_cents: 3500, merchant_id: "acme-office", decision: "allow",
  rule_id: "R99", reason: "Allowed: $35.00 is within policy", policy_version: 1, payload_hash: "abc", paypal_ref: null, ...overrides,
});

const verify = async () => (await getPool().connect().then(async (client) => { try { return await verifyChain(client); } finally { client.release(); } }));

beforeEach(resetDatabase);
afterAll(closePool);

describe("audit chain", () => {
  it("verifies an empty log", async () => expect(await verify()).toEqual({ ok: true, checked: 0, first_broken_seq: null }));

  it("verifies a chain of appended rows", async () => {
    for (let i = 0; i < 5; i++) await inTransaction((client) => appendAudit(client, entry({ amount_cents: 1000 + i })));
    expect(await verify()).toEqual({ ok: true, checked: 5, first_broken_seq: null });
  });

  it("detects an edited row", async () => {
    for (let i = 0; i < 4; i++) await inTransaction((client) => appendAudit(client, entry({ amount_cents: 1000 + i })));
    await asOwner((client) => client.query("UPDATE audit_log SET amount_cents = 1 WHERE seq = 3"));
    expect(await verify()).toEqual({ ok: false, checked: 2, first_broken_seq: 3 });
  });

  it("detects a deleted row", async () => {
    for (let i = 0; i < 4; i++) await inTransaction((client) => appendAudit(client, entry()));
    await asOwner((client) => client.query("DELETE FROM audit_log WHERE seq = 2"));
    const result = await verify();
    expect(result.ok).toBe(false);
    expect(result.first_broken_seq).toBe(3);
  });

  it("refuses updates and deletes from the application role", async () => {
    await inTransaction((client) => appendAudit(client, entry()));
    await expect(getPool().query("UPDATE audit_log SET reason = 'x'")).rejects.toThrow(/permission denied/);
    await expect(getPool().query("DELETE FROM audit_log")).rejects.toThrow(/permission denied/);
  });

  it("serializes concurrent appends into one valid chain", async () => {
    await Promise.all(Array.from({ length: 20 }, () => inTransaction((client) => appendAudit(client, entry()))));
    expect(await verify()).toEqual({ ok: true, checked: 20, first_broken_seq: null });
  });

  it("redacts card numbers in reasons", async () => {
    const row = await inTransaction((client) => appendAudit(client, entry({ reason: "card 4111111111111111 seen" })));
    expect(row.reason).toBe("card [redacted] seen");
  });
});

describe("role guard", () => {
  it("accepts the restricted application role", async () => {
    await expect(assertRestrictedRole()).resolves.toBeUndefined();
  });
});
