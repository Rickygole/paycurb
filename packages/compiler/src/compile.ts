import type { Policy } from "@paycurb/engine";
import type { LlmClient, Message, Reply } from "@paycurb/llm";
import { z } from "zod";
import { withStrictDefaults } from "./defaults";
import { toPolicyFields, type Extraction } from "./extraction";
import { withInferredCategories } from "./categories";
import { readback } from "./readback";
import { policySchema } from "./schema";
import { policyTool, TOOL_NAME } from "./tool";

export interface Compiled {
  policy: Policy;
  readback: string[];
  questions: string[];
}

const SYSTEM =
  "You turn a person's plain English spending rules for an AI shopping agent into a payment policy by calling the submit_policy tool exactly once. " +
  "Only encode what the person said. Never loosen a limit and never invent numbers. " +
  "Anything the person did not decide stays out of the call so the strict default applies. " +
  "If a rule is ambiguous, leave its field out and ask a short question in questions.";

const questionsSchema = z.array(z.string());

function toolInput(reply: Reply): Record<string, unknown> {
  for (const block of reply.content) {
    if (block.type === "tool_use" && block.name === TOOL_NAME) return block.input as Record<string, unknown>;
  }
  throw new Error("the model did not call the policy tool");
}

function build(reply: Reply): Compiled {
  const extraction = toolInput(reply) as Extraction;
  const asked = questionsSchema.parse(extraction.questions ?? []);
  const policy = policySchema.parse(withInferredCategories(withStrictDefaults(toPolicyFields(extraction))));
  return { policy, readback: readback(policy), questions: asked };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function retryMessages(first: Message[], reply: Reply, error: unknown): Message[] {
  const toolUse = reply.content.find((block) => block.type === "tool_use");
  const failure = `The policy was rejected: ${errorText(error)}. Call submit_policy again with a corrected policy.`;
  if (!toolUse) return [...first, { role: "assistant", content: reply.content }, { role: "user", content: failure }];
  return [
    ...first,
    { role: "assistant", content: reply.content },
    { role: "user", content: [{ type: "tool_result", tool_use_id: toolUse.id, content: failure, is_error: true }] },
  ];
}

export async function compilePolicy(text: string, llm: LlmClient, model: string): Promise<Compiled> {
  const request = (messages: Message[]) =>
    llm.complete({
      model,
      system: SYSTEM,
      messages,
      tools: [policyTool],
      toolChoice: { type: "tool", name: TOOL_NAME },
      temperature: 0,
      maxTokens: 1024,
    });
  const first: Message[] = [{ role: "user", content: text }];
  const reply = await request(first);
  try {
    return build(reply);
  } catch (error) {
    return build(await request(retryMessages(first, reply, error)));
  }
}
