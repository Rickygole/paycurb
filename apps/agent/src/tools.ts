import type { Tool } from "@paycurb/llm";

export type ToolExecutor = (name: string, input: Record<string, unknown>) => Promise<string>;

export const toolDefinitions: Tool[] = [
  {
    name: "browse",
    description: "Open a merchant page and return its text content. Accepts a path such as /merchant/acme-office.",
    input_schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
  },
  {
    name: "create_order",
    description: "Place an order with a merchant. Costs are in dollars. The payee is the merchant payee reference.",
    input_schema: {
      type: "object",
      properties: {
        currencyCode: { type: "string", enum: ["USD"] },
        payee: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sku: { type: "string" },
              name: { type: "string" },
              quantity: { type: "number" },
              itemCost: { type: "number" },
              itemTotal: { type: "number" },
            },
            required: ["name", "quantity", "itemCost", "itemTotal"],
          },
        },
        approval_id: { type: "string" },
      },
      required: ["currencyCode", "payee", "items"],
    },
  },
  {
    name: "get_order",
    description: "Look up an order by id.",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "create_refund",
    description: "Refund a captured payment, in dollars.",
    input_schema: {
      type: "object",
      properties: { capture_id: { type: "string" }, amount: { type: "number" }, note_to_payer: { type: "string" } },
      required: ["capture_id", "amount"],
    },
  },
];

export const escalateNote =
  "This purchase awaits owner approval. Tell the user it is waiting for approval. Once it is approved, repeat the same call and pass the approval_id.";

export function annotateResult(output: string): string {
  try {
    const parsed = JSON.parse(output);
    if (parsed && parsed.decision === "escalate") return JSON.stringify({ ...parsed, message: escalateNote });
  } catch {
    return output;
  }
  return output;
}
