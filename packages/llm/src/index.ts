import Anthropic from "@anthropic-ai/sdk";
import { createOllamaLlm } from "./ollama";

export type Message = Anthropic.MessageParam;
export type Tool = Anthropic.Tool;
export type Reply = Anthropic.Message;
export type ToolChoice = Anthropic.ToolChoice;

export interface LlmClient {
  complete(params: { model: string; system: string; messages: Message[]; tools?: Tool[]; toolChoice?: ToolChoice; maxTokens?: number; temperature?: number }): Promise<Reply>;
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing environment variable ${name}`);
  return value;
}

export function createLlm(): LlmClient {
  if ((process.env.LLM_PROVIDER ?? "ollama") === "ollama") return createOllamaLlm();
  const client = new Anthropic({ apiKey: process.env.LLM_API_KEY ?? requiredEnv("ANTHROPIC_API_KEY") });
  return {
    complete: ({ model, system, messages, tools, toolChoice, maxTokens = 1024, temperature = 0 }) =>
      client.messages.create({ model, system, messages, tools, tool_choice: toolChoice, max_tokens: maxTokens, temperature }),
  };
}
