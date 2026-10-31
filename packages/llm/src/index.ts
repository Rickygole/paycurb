import Anthropic from "@anthropic-ai/sdk";

export type Message = Anthropic.MessageParam;
export type Tool = Anthropic.Tool;
export type Reply = Anthropic.Message;

export interface LlmClient {
  complete(params: { model: string; system: string; messages: Message[]; tools?: Tool[]; maxTokens?: number; temperature?: number }): Promise<Reply>;
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing environment variable ${name}`);
  return value;
}

export function createLlm(): LlmClient {
  const client = new Anthropic({ apiKey: process.env.LLM_API_KEY ?? requiredEnv("ANTHROPIC_API_KEY") });
  return {
    complete: ({ model, system, messages, tools, maxTokens = 1024, temperature = 0 }) =>
      client.messages.create({ model, system, messages, tools, max_tokens: maxTokens, temperature }),
  };
}
