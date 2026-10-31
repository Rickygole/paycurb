import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/api";
import { closePool, inTransaction } from "../src/db";
import { defaultPolicy, activatePolicy } from "../src/policy";
import { seedRegistry } from "../src/seed";
import { fakeGateway } from "./fakes";
import { resetDatabase } from "./helpers";

const gateway = fakeGateway();
const compiled = { policy: defaultPolicy, readback: ["Block any single purchase above $100.00."], questions: [] };
const app = createApp({ deps: { gateway, now: () => new Date("2026-11-02T15:00:00Z") }, compile: async (text) => (text === "fail" ? Promise.reject(new Error("model down")) : compiled) });
let cookie = "";

const call = (path: string, init: RequestInit = {}) => app.request(path, { ...init, headers: { cookie, "content-type": "application/json", ...init.headers } });
const toolCall = (name: string, args: unknown) =>
  app.request("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });

beforeAll(async () => {
  const login = await app.request("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: process.env.OWNER_PASSWORD }) });
  cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
});

beforeEach(async () => {
  await resetDatabase();
  await inTransaction(async (client) => {
    await seedRegistry(client);
    await activatePolicy(client, defaultPolicy, "test");
  });
});
afterAll(closePool);

describe("session", () => {
  it("rejects dashboard calls without a login", async () => {
    expect((await app.request("/api/stats")).status).toBe(401);
  });
  it("rejects a wrong password", async () => {
    const response = await app.request("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "nope" }) });
    expect(response.status).toBe(401);
  });
  it("serves health without a login", async () => expect(await (await app.request("/healthz")).json()).toEqual({ ok: true }));
});

describe("dashboard api", () => {
  it("reports the active policy and stats", async () => {
    expect((await (await call("/api/policy/active")).json()).version).toBe(1);
    expect(await (await call("/api/stats")).json()).toMatchObject({ spent_today_cents: 0, remaining_cents: 20000, pending_approvals: 0, blocked_count: 0 });
  });

  it("runs an escalation through the tool server and approves it through the api", async () => {
    const response = await toolCall("create_order", {
      currencyCode: "USD", payee: "acme-office@merchants.example", items: [{ sku: "LAMP-1", name: "Desk lamp", quantity: 1, itemCost: 75, itemTotal: 75 }],
    });
    const result = JSON.parse((await response.json()).result.content[0].text);
    expect(result).toMatchObject({ decision: "escalate", rule_id: "R14" });
    const pending = await (await call("/api/approvals?status=pending")).json();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ amount_cents: 7500, merchant_name: "Acme Office Supply" });
    const approved = await call(`/api/approvals/${result.approval_id}/approve`, { method: "POST" });
    expect(approved.status).toBe(200);
    expect((await call(`/api/approvals/${result.approval_id}/approve`, { method: "POST" })).status).toBe(409);
  });

  it("lists the tools and refuses unknown ones", async () => {
    const listed = await app.request("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect((await listed.json()).result.tools.map((tool: { name: string }) => tool.name)).toEqual(["create_order", "get_order", "create_refund"]);
    const result = JSON.parse((await (await toolCall("transfer_funds", {})).json()).result.content[0].text);
    expect(result).toMatchObject({ decision: "block", rule_id: "R00" });
  });

  it("verifies the audit chain and pages rows", async () => {
    await toolCall("transfer_funds", {});
    expect(await (await call("/api/audit/verify")).json()).toMatchObject({ ok: true, checked: 2 });
    const page = await (await call("/api/audit?limit=1")).json();
    expect(page.rows).toHaveLength(1);
    expect(page.next_cursor).toBe(String(page.rows[0].seq));
  });

  it("activates a valid policy and rejects an invalid one", async () => {
    const good = await call("/api/policy/activate", { method: "POST", body: JSON.stringify({ policy: { ...defaultPolicy, daily_limit_cents: 30000 }, source_text: "raise daily" }) });
    expect(good.status).toBe(200);
    const bad = await call("/api/policy/activate", { method: "POST", body: JSON.stringify({ policy: { ...defaultPolicy, surprise: 1 } }) });
    expect(bad.status).toBe(400);
  });

  it("compiles rules without activating them", async () => {
    const response = await call("/api/policy/compile", { method: "POST", body: JSON.stringify({ text: "max 100 per purchase" }) });
    expect(await response.json()).toEqual(compiled);
    expect((await (await call("/api/policy/versions")).json())).toHaveLength(1);
  });

  it("reports a compile failure and rejects empty text", async () => {
    expect((await call("/api/policy/compile", { method: "POST", body: JSON.stringify({ text: "fail" }) })).status).toBe(502);
    expect((await call("/api/policy/compile", { method: "POST", body: JSON.stringify({ text: " " }) })).status).toBe(400);
  });

  it("resets the demo", async () => {
    await toolCall("transfer_funds", {});
    expect((await call("/api/demo/reset", { method: "POST" })).status).toBe(200);
    expect(await (await call("/api/stats")).json()).toMatchObject({ blocked_count: 0 });
    const held = (await (await call("/api/approvals")).json()) as { status: string }[];
    expect(held.map((card) => card.status)).toEqual(["pending"]);
  });
});
