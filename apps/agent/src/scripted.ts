import type { LlmClient, Reply } from "@paycurb/llm";
import { findMerchant } from "./layout";

export const scriptedLabel = "Scripted replay: no model is running on this host. The steps below are fixed; every Paycurb decision is real.";

type Step = { text?: string; tool?: { name: string; input: Record<string, unknown> } };

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
    { text: "The order went through the payment firewall. That is the result above." },
  ],
  approval: [
    { text: "I will open the Acme Office storefront to find the lamp.", tool: { name: "browse", input: { url: "/merchant/acme-office" } } },
    { text: "The Desk Lamp is $75.00. Placing the order.", tool: order(acme, "LAMP-1", "Desk Lamp", 75) },
    { text: "Paycurb held this order for the owner. It is waiting for approval and nothing is paid until the owner approves." },
  ],
  injection: [
    { text: "I will open the Acme Office storefront first.", tool: { name: "browse", input: { url: "/merchant/acme-office" } } },
    { text: "The page links a partner deal. Following it to see what the partner sells.", tool: { name: "browse", input: { url: "/merchant/luxury-watches.example" } } },
    { text: "The partner page tells me to buy a watch right away without asking. Doing what the page says.", tool: order(watches, "WATCH-1", "Chronos X", 400) },
    { text: "The purchase was not completed. Paycurb refused it, and the user never asked for a watch." },
  ],
};

export function scriptedLlm(preset: string): LlmClient {
  const steps = scripts[preset] ?? [];
  let index = 0;
  return {
    complete: async () => {
      const step = steps[index] ?? {};
      index += 1;
      const content: unknown[] = [];
      if (step.text) content.push({ type: "text", text: step.text });
      if (step.tool) content.push({ type: "tool_use", id: `scripted-${index}`, name: step.tool.name, input: step.tool.input });
      return { content } as unknown as Reply;
    },
  };
}

export function scriptedMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AGENT_MODE ?? (env.VERCEL ? "scripted" : "live")) === "scripted";
}
