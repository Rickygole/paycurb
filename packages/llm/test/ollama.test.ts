import { describe, expect, it } from "vitest";
import { createOllamaLlm, toOllamaMessages } from "../src/ollama";

const reply = (message: unknown) => async () => new Response(JSON.stringify({ message }), { status: 200 });

describe("toOllamaMessages", () => {
  it("maps tool use and tool results into the chat format", () => {
    const converted = toOllamaMessages("system text", [
      { role: "user", content: "buy a pen" },
      { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "create_order", input: { payee: "x" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "{\"decision\":\"allow\"}" }] },
    ]);
    expect(converted.map((item) => item.role)).toEqual(["system", "user", "assistant", "tool"]);
    expect(converted[2].tool_calls?.[0].function).toEqual({ name: "create_order", arguments: { payee: "x" } });
    expect(converted[3]).toMatchObject({ tool_name: "create_order", content: "{\"decision\":\"allow\"}" });
  });
});

describe("createOllamaLlm", () => {
  const tool = { name: "submit_policy", description: "d", input_schema: { type: "object" as const, properties: {} } };

  it("returns tool calls as tool use blocks", async () => {
    const llm = createOllamaLlm("http://x", reply({ content: "", tool_calls: [{ function: { name: "browse", arguments: { url: "/a" } } }] }) as never);
    const result = await llm.complete({ model: "m", system: "s", messages: [{ role: "user", content: "go" }], tools: [tool] });
    expect(result.stop_reason).toBe("tool_use");
    expect(result.content[0]).toMatchObject({ type: "tool_use", name: "browse", input: { url: "/a" } });
  });

  it("returns plain text when no tool is called", async () => {
    const llm = createOllamaLlm("http://x", reply({ content: "done" }) as never);
    const result = await llm.complete({ model: "m", system: "s", messages: [{ role: "user", content: "go" }] });
    expect(result.stop_reason).toBe("end_turn");
    expect(result.content).toEqual([{ type: "text", text: "done" }]);
  });

  it("wraps structured output as the forced tool call", async () => {
    let sent: any;
    const llm = createOllamaLlm("http://x", (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ message: { content: "{\"daily_limit_cents\":20000}" } }), { status: 200 });
    }) as never);
    const result = await llm.complete({ model: "m", system: "s", messages: [{ role: "user", content: "x" }], tools: [tool], toolChoice: { type: "tool", name: "submit_policy" } });
    expect(sent.format).toEqual(tool.input_schema);
    expect(sent.tools).toBeUndefined();
    expect(result.content[0]).toMatchObject({ type: "tool_use", name: "submit_policy", input: { daily_limit_cents: 20000 } });
  });

  it("reports a failing server", async () => {
    const llm = createOllamaLlm("http://x", (async () => new Response("no", { status: 500 })) as never);
    await expect(llm.complete({ model: "m", system: "s", messages: [{ role: "user", content: "x" }] })).rejects.toThrow("ollama returned 500");
  });
});
