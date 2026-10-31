import type { Tool } from "@paycurb/llm";

const cents = { type: "integer", minimum: 0 };
const minutes = { type: "integer", minimum: 1 };
const strings = { type: "array", items: { type: "string" } };

export const TOOL_NAME = "submit_policy";

export const policyTool: Tool = {
  name: TOOL_NAME,
  description:
    "Submit the spending policy that the user's rules describe. Include only the fields the user's text actually decides. " +
    "Leave out every field the text does not mention, the system fills those with strict defaults. " +
    "All money is integer cents, so $12.50 is 1250. " +
    "per_transaction_limit_cents is the most one purchase may cost. " +
    "auto_approve_below_cents is the line under which a purchase needs no approval, so 'ask me before anything over $X' or 'at $X or more' sets it to X. " +
    "daily_limit_cents is the most that may be spent per day. " +
    "merchant_window_limit caps spending at one merchant within a number of minutes, so 'no more than $X per hour at one store' is {cents: X, window_minutes: 60}. " +
    "velocity caps the number of purchases within a window, so 'at most 3 purchases an hour' is {max_transactions: 3, window_minutes: 60}. " +
    "Merchant ids are lowercase with hyphens in place of spaces and without suffixes like Inc or LLC, so 'Acme Office' is acme-office and 'Paper Co' is paper-co. " +
    "merchant_allowlist holds merchants the user says are the only ones allowed or are trusted, and merchant_blocklist holds merchants the user forbids. " +
    "block_recurring is true when the user wants no subscriptions or recurring charges. " +
    "refunds and payouts are 'escalate' when the user wants to be asked first and 'block' when forbidden. " +
    "max_quantity_per_line is the most units of one item per order. " +
    "When a rule is vague, such as 'a few hundred a day', 'not too much' or 'something reasonable', do not guess a number. " +
    "Leave that field out and add a short clarifying question to questions.",
  input_schema: {
    type: "object",
    properties: {
      version: { type: "integer", minimum: 1 },
      currency: { type: "string", description: "Three letter code such as USD" },
      per_transaction_limit_cents: cents,
      auto_approve_below_cents: cents,
      daily_limit_cents: cents,
      merchant_window_limit: {
        type: "object",
        properties: { cents, window_minutes: minutes },
        required: ["cents", "window_minutes"],
        additionalProperties: false,
      },
      merchant_allowlist: strings,
      merchant_blocklist: strings,
      unknown_merchant_action: { type: "string", enum: ["block", "escalate"] },
      allowed_categories: strings,
      block_recurring: { type: "boolean" },
      max_quantity_per_line: { type: "integer", minimum: 1 },
      velocity: {
        type: "object",
        properties: { max_transactions: { type: "integer", minimum: 1 }, window_minutes: minutes },
        required: ["max_transactions", "window_minutes"],
        additionalProperties: false,
      },
      refunds: { type: "string", enum: ["escalate", "block"] },
      payouts: { type: "string", enum: ["escalate", "block"] },
      duplicate_window_minutes: { type: "integer", minimum: 0 },
      approval_ttl_minutes: minutes,
      questions: { ...strings, description: "Clarifying questions for rules that were too vague to turn into a number" },
    },
    additionalProperties: false,
  },
};
