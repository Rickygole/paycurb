import type { Tool } from "@paycurb/llm";

export const TOOL_NAME = "submit_policy";

const dollars = (description: string) => ({ type: "number", exclusiveMinimum: 0, description });
const names = (description: string) => ({ type: "array", items: { type: "string" }, description });

export const policyTool: Tool = {
  name: TOOL_NAME,
  description:
    "Record the spending rules the user wrote. Include a field only when the text states that rule. Leave every other field out. " +
    "Money is in plain dollars, so $12.50 is 12.5. Never convert to cents. " +
    "When a rule is vague, such as 'a few hundred a day' or 'keep it reasonable', do not guess a number. Leave that field out and add a short question to questions.",
  input_schema: {
    type: "object",
    properties: {
      per_purchase_limit_dollars: dollars("The most one purchase may cost. 'Never more than $100 on one purchase' is 100."),
      ask_approval_from_dollars: dollars("Purchases at or above this amount need the owner's approval first. 'Ask me before anything of $50 or more' is 50. 'Anything under $20 can go through without asking' is 20."),
      daily_limit_dollars: dollars("The most that may be spent in one day."),
      merchant_limit_dollars: dollars("The most that may be spent at one merchant within merchant_limit_minutes. 'No more than $40 an hour at any store' is 40."),
      merchant_limit_minutes: { type: "integer", minimum: 1, description: "Window in minutes for merchant_limit_dollars. An hour is 60." },
      max_purchases: { type: "integer", minimum: 1, description: "The most purchases allowed within max_purchases_minutes. 'At most 3 purchases an hour' is 3." },
      max_purchases_minutes: { type: "integer", minimum: 1, description: "Window in minutes for max_purchases. An hour is 60." },
      only_merchants: names("Names of the only merchants the user allows, for example Acme Office and Paper Co."),
      never_merchants: names("Names of merchants the user forbids."),
      allow_subscriptions: { type: "boolean", description: "false when the user wants no subscriptions or recurring charges, true when subscriptions are fine." },
      refunds: { type: "string", enum: ["ask", "block"], description: "ask when the user wants to be asked before refunds, block when refunds are forbidden." },
      payouts: { type: "string", enum: ["ask", "block"], description: "ask when the user wants to be asked before payouts, block when payouts are forbidden." },
      max_quantity_per_item: { type: "integer", minimum: 1, description: "The most units of one item per order." },
      questions: names("Short clarifying questions for rules that were too vague to turn into a number."),
    },
    additionalProperties: false,
  },
};
