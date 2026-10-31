import { describe, expect, it } from "vitest";
import type { LlmClient, Reply } from "@paycurb/llm";
import { maxTurns, runAgent } from "../src/run";
import type { AgentEvent } from "../src/run";

function toolReply(id: string): Reply {
  return { content: [{ type: "tool_use", id, name: "get_order", input: { id: "o1" } }] } as unknown as Reply;
}

function textReply(text: string): Reply {
  return { content: [{ type: "text", text }] } as unknown as Reply;
}

function scriptedLlm(replies: Reply[]): LlmClient & { calls: number } {
  const llm = {
    calls: 0,
    complete: async () => replies[Math.min(llm.calls++, replies.length - 1)],
  };
  return llm;
}

describe("runAgent", () => {
  it("stops at max turns when the model keeps calling tools", async () => {
    const llm = scriptedLlm([toolReply("t")]);
    const events: AgentEvent[] = [];
    await runAgent({ task: "x", llm, model: "m", tools: async () => "{}", emit: (e) => events.push(e) });
    expect(llm.calls).toBe(maxTurns);
    expect(events.filter((e) => e.type === "tool_call")).toHaveLength(maxTurns);
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("emits events in order", async () => {
    const llm = scriptedLlm([toolReply("t1"), textReply("all done")]);
    const events: AgentEvent[] = [];
    await runAgent({ task: "x", llm, model: "m", tools: async () => '{"ok":true}', emit: (e) => events.push(e) });
    expect(events.map((e) => e.type)).toEqual(["tool_call", "tool_result", "message", "done"]);
    expect(events[1]).toEqual({ type: "tool_result", name: "get_order", output: '{"ok":true}' });
  });

  it("adds the approval note to escalate results", async () => {
    const llm = scriptedLlm([toolReply("t1"), textReply("waiting")]);
    const events: AgentEvent[] = [];
    const escalate = JSON.stringify({ decision: "escalate", approval_id: "a1" });
    await runAgent({ task: "x", llm, model: "m", tools: async () => escalate, emit: (e) => events.push(e) });
    const result = events.find((e) => e.type === "tool_result");
    expect(result && "output" in result && JSON.parse(result.output).message).toContain("awaits owner approval");
  });

  it("reports tool failures to the model instead of crashing", async () => {
    const llm = scriptedLlm([toolReply("t1"), textReply("sorry")]);
    const events: AgentEvent[] = [];
    await runAgent({
      task: "x",
      llm,
      model: "m",
      tools: async () => {
        throw new Error("boom");
      },
      emit: (e) => events.push(e),
    });
    expect(events[1]).toEqual({ type: "tool_result", name: "get_order", output: '{"error":"boom"}' });
  });
});
