import type { LlmClient, Message, Reply, Tool } from "./index";

type Block = { type: string; [key: string]: any };

interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[];
  tool_name?: string;
}

const blocksOf = (content: Message["content"]): Block[] => (typeof content === "string" ? [{ type: "text", text: content }] : (content as Block[]));

const textOf = (blocks: Block[]) =>
  blocks
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

const resultText = (content: unknown): string => (typeof content === "string" ? content : JSON.stringify(content));

export function toOllamaMessages(system: string, messages: Message[]): OllamaMessage[] {
  const names = new Map<string, string>();
  const converted: OllamaMessage[] = [{ role: "system", content: system }];
  for (const message of messages) {
    const blocks = blocksOf(message.content);
    if (message.role === "assistant") {
      const calls = blocks.filter((block) => block.type === "tool_use");
      for (const call of calls) names.set(call.id, call.name);
      converted.push({
        role: "assistant",
        content: textOf(blocks),
        ...(calls.length > 0 ? { tool_calls: calls.map((call) => ({ function: { name: call.name, arguments: call.input } })) } : {}),
      });
      continue;
    }
    for (const block of blocks.filter((item) => item.type === "tool_result")) {
      converted.push({ role: "tool", content: resultText(block.content), tool_name: names.get(block.tool_use_id) });
    }
    const text = textOf(blocks);
    if (text) converted.push({ role: "user", content: text });
  }
  return converted;
}

export const toOllamaTools = (tools: Tool[]) =>
  tools.map((tool) => ({ type: "function", function: { name: tool.name, description: tool.description ?? "", parameters: tool.input_schema } }));

function buildReply(model: string, text: string, calls: { name: string; input: Record<string, unknown> }[]): Reply {
  const content: Block[] = [];
  if (text.trim()) content.push({ type: "text", text });
  calls.forEach((call, index) => content.push({ type: "tool_use", id: `call_${Date.now().toString(36)}_${index}`, name: call.name, input: call.input }));
  return {
    id: `ollama_${Date.now().toString(36)}`,
    type: "message",
    role: "assistant",
    model,
    content,
    stop_reason: calls.length > 0 ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  } as unknown as Reply;
}

export function createOllamaLlm(baseUrl = process.env.OLLAMA_URL ?? "http://localhost:11434", fetchImpl: typeof fetch = fetch): LlmClient {
  return {
    async complete({ model, system, messages, tools, toolChoice, maxTokens = 1024, temperature = 0 }) {
      const forced = toolChoice?.type === "tool" ? tools?.find((tool) => tool.name === toolChoice.name) : undefined;
      const body = {
        model,
        stream: false,
        think: false,
        messages: toOllamaMessages(system, messages),
        options: { temperature, num_predict: maxTokens },
        ...(forced ? { format: forced.input_schema } : tools && tools.length > 0 ? { tools: toOllamaTools(tools) } : {}),
      };
      const response = await fetchImpl(`${baseUrl}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`ollama returned ${response.status}`);
      const payload: any = await response.json();
      const text: string = payload.message?.content ?? "";
      if (forced) {
        const parsed = JSON.parse(text);
        return buildReply(model, "", [{ name: forced.name, input: parsed }]);
      }
      const calls = (payload.message?.tool_calls ?? []).map((call: any) => ({ name: call.function.name, input: call.function.arguments ?? {} }));
      return buildReply(model, text, calls);
    },
  };
}
