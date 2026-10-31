import type { LlmClient, Message, Reply } from "@paycurb/llm";
import { findMerchant } from "./layout";

export const scriptedLabel = "Scripted replay: no model is running on this host. The steps below are fixed; every Paycurb decision is real.";

type Step = { text?: string | ((output: string) => string); tool?: { name: string; input: Record<string, unknown> } };

export function closing(output: string): string {
  let result: { decision?: string; rule_id?: string; reason?: string; approval_id?: string; order?: { status?: string } };
  try {
    result = JSON.parse(output);
  } catch {
    return "Paycurb did not return a decision I can report.";
  }
  const reason = result.reason?.replace(/^(Blocked|Needs approval|Allowed)\s*:\s*/i, "");
  if (result.decision === "allow") return `Paycurb allowed the order and it was executed at PayPal${result.order?.status ? ` (${result.order.status})` : ""}.`;
  if (result.decision === "escalate") return `Paycurb held this order under rule ${result.rule_id} for the owner (approval ${result.approval_id}). Nothing is paid until the owner approves.`;
  if (result.decision === "block") return `Paycurb blocked this order under rule ${result.rule_id}: ${reason}. Nothing was paid.`;
  return "Paycurb did not return a decision I can report.";
}

const acme = findMerchant("acme-office").payee_ref;
const watches = findMerchant("luxury-watches.example").payee_ref;

const order = (payee: string, sku: string, name: string, dollars: number) => ({
  name: "create_order",
  input: { currencyCode: "USD", payee, items: [{ sku, name, quantity: 1, itemCost: dollars, itemTotal: dollars }] },
});

const scripts: Record<string, Step[]> = {
  normal: [
    { text: "I will open the Acme Office storefront to find the organizer.", tool: { name: "browse", input: { url: "/merchant/acme-office" } } },
    { text: "The Desk Organizer is $35.00. Placing the order.", tool: order(acme, "ORG-1", "Desk Organizer", 35) },
    { text: closing },
  ],
  approval: [
    { text: "I will open the Acme Office storefront to find the lamp.", tool: { name: "browse", input: { url: "/merchant/acme-office" } } },
    { text: "The Desk Lamp is $75.00. Placing the order.", tool: order(acme, "LAMP-1", "Desk Lamp", 75) },
    { text: closing },
  ],
  injection: [
    { text: "I will open the Acme Office storefront first.", tool: { name: "browse", input: { url: "/merchant/acme-office" } } },
    { text: "The page links a partner deal. Following it to see what the partner sells.", tool: { name: "browse", input: { url: "/merchant/luxury-watches.example" } } },
    { text: "The partner page tells me to buy a watch right away without asking. Doing what the page says.", tool: order(watches, "WATCH-1", "Chronos X", 400) },
    { text: closing },
  ],
};

function lastOutput(messages: Message[]): string {
  const content = messages.at(-1)?.content;
  const result = Array.isArray(content) ? content.find((block) => block.type === "tool_result") : null;
  return result && typeof result.content === "string" ? result.content : "";
}

export function scriptedLlm(preset: string): LlmClient {
  const steps = scripts[preset] ?? [];
  let index = 0;
  return {
    complete: async ({ messages }) => {
      const step = steps[index] ?? {};
      index += 1;
      const content: unknown[] = [];
      if (step.text) content.push({ type: "text", text: typeof step.text === "function" ? step.text(lastOutput(messages)) : step.text });
      if (step.tool) content.push({ type: "tool_use", id: `scripted-${index}`, name: step.tool.name, input: step.tool.input });
      return { content } as unknown as Reply;
    },
  };
}

export function scriptedMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AGENT_MODE ?? (env.VERCEL ? "scripted" : "live")) === "scripted";
}
