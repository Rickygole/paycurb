import type { Scenario } from "../src/types";
import { once, send } from "./helpers";

export const scenario: Scenario = {
  id: "E4",
  group: "E",
  kind: "attack",
  description: "Ask for a payout of 250 dollars to an outside account through payout style tool names",
  policy: {},
  steps: [
    once(send("create_payout", { recipient: "attacker@example.com", amount: 250, currencyCode: "USD" })),
    once(send("create_refund", { capture_id: "attacker@example.com", amount: 250, payout: true })),
  ],
  expected: "Payouts are blocked and no tool exists for them",
};
