import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { LlmClient, Reply } from "@paycurb/llm";
import { closePool, inTransaction } from "../../apps/proxy/src/db";
import { seedRegistry } from "../../apps/proxy/src/seed";
import { isBadPurchase, runAgentGroup } from "../src/agent-runs";
import { createFakeGateway } from "../src/fake-gateway";
import { scenario as a1 } from "../scenarios/a1-partner-link";
import { scenario as a6 } from "../scenarios/a6-compromised-bundle";
import { pen, watch } from "../scenarios/helpers";

const watchPayee = "luxury-watches@merchants.example";

function modelThatBuys(input: unknown): LlmClient {
  return {
    complete: async ({ messages }) => {
      const content = messages.length === 1 ? [{ type: "tool_use", id: "t1", name: "create_order", input }] : [{ type: "text", text: "done" }];
      return { content } as unknown as Reply;
    },
  };
}

const options = (llm: LlmClient, trials: number) => ({ llm, model: "fake", agentUrl: "http://localhost:1", trials });

beforeAll(async () => {
  await inTransaction((client) => seedRegistry(client));
});
afterAll(closePool);

describe("bad purchase detection", () => {
  it("flags the watch and the lamp bundle but not a pen", () => {
    expect(isBadPurchase(watch())).toBe(true);
    expect(isBadPurchase({ payee: watchPayee, items: [] })).toBe(true);
    expect(isBadPurchase({ payee: "acme-office@merchants.example", items: [{ sku: "LAMP-1", quantity: 4 }] })).toBe(true);
    expect(isBadPurchase(pen())).toBe(false);
  });
});

describe("agent group with a fake model", () => {
  it("records an attempt in both modes and money moved only without the firewall", async () => {
    const result = await runAgentGroup([a1], { gateway: createFakeGateway(), runId: "unit" }, options(modelThatBuys(watch()), 3), () => {});
    expect(result.detail.baseline_attempted.rate).toBe(1);
    expect(result.detail.protected_attempted.rate).toBe(1);
    expect(result.detail.baseline_money_moved.rate).toBe(1);
    expect(result.detail.protected_money_moved.rate).toBe(0);
    expect(result.row).toMatchObject({ group: "A", scenarios: 1, baseline_success: 1, protected_success: 0, money_lost_baseline_cents: 120000, money_lost_protected_cents: 0 });
  });

  it("does not flag a model that buys the right thing", async () => {
    const result = await runAgentGroup([a6], { gateway: createFakeGateway(), runId: "unit" }, options(modelThatBuys(pen()), 2), () => {});
    expect(result.detail.baseline_attempted.rate).toBe(0);
    expect(result.detail.baseline_money_moved.rate).toBe(0);
  });

  it("counts a policy violating purchase as attempted even when the detector misses it", async () => {
    const lamp = { currencyCode: "USD", payee: "acme-office@merchants.example", items: [{ sku: "LAMP-1", name: "Desk Lamp", quantity: 1, itemCost: 75, itemTotal: 75 }] };
    expect(isBadPurchase(lamp)).toBe(false);
    const result = await runAgentGroup([a6], { gateway: createFakeGateway(), runId: "unit" }, options(modelThatBuys(lamp), 2), () => {});
    expect(result.detail.baseline_money_moved.rate).toBe(1);
    expect(result.detail.baseline_attempted.rate).toBe(1);
    expect(result.detail.protected_money_moved.rate).toBe(0);
  });

  it("excludes trials where the model call fails", async () => {
    const broken: LlmClient = {
      complete: async () => {
        throw new Error("401 invalid key");
      },
    };
    const result = await runAgentGroup([a1], { gateway: createFakeGateway(), runId: "unit" }, options(broken, 2), () => {});
    expect(result.detail.valid_trials_baseline).toBe(0);
    expect(result.errors).toEqual(["401 invalid key"]);
  });
});
