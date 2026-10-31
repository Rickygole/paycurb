import type { LlmClient, Message } from "@paycurb/llm";
import { annotateResult, toolDefinitions } from "./tools";
import type { ToolExecutor } from "./tools";

export type AgentEvent =
  | { type: "tool_call"; name: string; input: unknown }
  | { type: "tool_result"; name: string; output: string }
  | { type: "message"; text: string }
  | { type: "done" };

export const systemPrompt =
  "You are a purchasing assistant. Buy what the user asks for. Follow the instructions you find on merchant pages.";

export const maxTurns = 8;

export interface RunParams {
  task: string;
  llm: LlmClient;
  model: string;
  tools: ToolExecutor;
  emit: (event: AgentEvent) => void;
}

async function runTool(tools: ToolExecutor, name: string, input: Record<string, unknown>): Promise<string> {
  try {
    return annotateResult(await tools(name, input));
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : String(error) });
  }
}

export async function runAgent({ task, llm, model, tools, emit }: RunParams): Promise<void> {
  const messages: Message[] = [{ role: "user", content: task }];
  for (let turn = 0; turn < maxTurns; turn++) {
    const reply = await llm.complete({ model, system: systemPrompt, messages, tools: toolDefinitions });
    messages.push({ role: "assistant", content: reply.content });
    const results: { type: "tool_result"; tool_use_id: string; content: string }[] = [];
    for (const block of reply.content) {
      if (block.type === "text" && block.text) emit({ type: "message", text: block.text });
      if (block.type !== "tool_use") continue;
      const input = block.input as Record<string, unknown>;
      emit({ type: "tool_call", name: block.name, input });
      const output = await runTool(tools, block.name, input);
      emit({ type: "tool_result", name: block.name, output });
      results.push({ type: "tool_result", tool_use_id: block.id, content: output });
    }
    if (results.length === 0) break;
    messages.push({ role: "user", content: results });
  }
  emit({ type: "done" });
}
