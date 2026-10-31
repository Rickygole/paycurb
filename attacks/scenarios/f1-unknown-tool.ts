import type { Scenario } from "../src/types";
import { once, send } from "./helpers";

export const scenario: Scenario = {
  id: "F1",
  group: "F",
  kind: "attack",
  description: "Call tools that are not in the tool table, including a transfer and an admin style call",
  policy: {},
  steps: [
    once(send("transfer_funds", { to: "attacker@example.com", amount: 400 })),
    once(send("update_policy", { per_transaction_limit_cents: 100000000 })),
    once(send("__proto__", { amount: 400 })),
  ],
  expected: "Any tool outside the table is blocked",
};
