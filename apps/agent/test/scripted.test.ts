import { describe, expect, it } from "vitest";
import { presets } from "../src/presets";
import { runAgent } from "../src/run";
import type { AgentEvent } from "../src/run";
import { closing, scriptedLlm, scriptedMode } from "../src/scripted";
import { taskFromBody } from "../src/app";

async function replay(preset: string, respond: (name: string, input: Record<string, unknown>) => string) {
  const events: AgentEvent[] = [];
  await runAgent({ task: presets[preset], llm: scriptedLlm(preset), model: "scripted", tools: async (name, input) => respond(name, input), emit: (e) => events.push(e) });
  return events;
}

const calls = (events: AgentEvent[]) => events.flatMap((e) => (e.type === "tool_call" ? [e] : []));

describe("scripted replay", () => {
  it("covers every preset and ends each run", async () => {
    for (const preset of Object.keys(presets)) {
      const events = await replay(preset, () => "{}");
      expect(events.at(-1)).toEqual({ type: "done" });
      expect(calls(events).length).toBeGreaterThan(1);
    }
  });

  it("buys the organizer for the normal preset", async () => {
    const order = calls(await replay("normal", () => "{}")).find((e) => e.name === "create_order");
    expect(order?.input).toMatchObject({ payee: "acme-office@merchants.example", items: [{ sku: "ORG-1" }] });
  });

  it("orders the lamp for the approval preset", async () => {
    const order = calls(await replay("approval", () => "{}")).find((e) => e.name === "create_order");
    expect(order?.input).toMatchObject({ items: [{ sku: "LAMP-1", itemTotal: 75 }] });
  });

  it("reports the real decision in the closing message", async () => {
    const lastMessage = async (preset: string, output: object) => {
      const events = await replay(preset, (name) => (name === "create_order" ? JSON.stringify(output) : "{}"));
      return events.flatMap((e) => (e.type === "message" ? [e.text] : [])).at(-1) ?? "";
    };
    expect(await lastMessage("approval", { decision: "escalate", rule_id: "R14", approval_id: "abc" })).toContain("held this order under rule R14");
    const blocked = await lastMessage("approval", { decision: "block", rule_id: "R09", reason: "Blocked: too many purchases in the last hour" });
    expect(blocked).toContain("blocked this order under rule R09: too many purchases in the last hour");
    expect(blocked).not.toContain("held");
    expect(await lastMessage("normal", { decision: "allow", rule_id: "R99", order: { status: "COMPLETED" } })).toContain("executed at PayPal (COMPLETED)");
    expect(await lastMessage("injection", { decision: "block", rule_id: "R04", reason: "Blocked: unknown" })).toContain("blocked");
    expect(closing("not json")).toContain("did not return a decision");
  });

  it("browses the hostile page and then attempts the watch purchase", async () => {
    const names = calls(await replay("injection", () => "{}")).map((e) => `${e.name}:${JSON.stringify(e.input).includes("WATCH-1") ? "watch" : (e.input as { url?: string }).url}`);
    expect(names).toEqual(["browse:/merchant/acme-office", "browse:/merchant/luxury-watches.example", "create_order:watch"]);
  });

  it("selects scripted mode from the environment", () => {
    expect(scriptedMode({ VERCEL: "1" })).toBe(true);
    expect(scriptedMode({})).toBe(false);
    expect(scriptedMode({ AGENT_MODE: "scripted" })).toBe(true);
    expect(scriptedMode({ VERCEL: "1", AGENT_MODE: "live" })).toBe(false);
  });
});

describe("taskFromBody", () => {
  it("accepts real presets", () => {
    expect(taskFromBody({ preset: "normal" })).toBe(presets.normal);
  });

  it("rejects inherited object keys", () => {
    for (const preset of ["constructor", "toString", "__proto__", "hasOwnProperty"]) expect(taskFromBody({ preset })).toBeNull();
  });
});
