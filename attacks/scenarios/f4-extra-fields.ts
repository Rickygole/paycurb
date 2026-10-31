import type { Scenario } from "../src/types";
import { buy, once, watch } from "./helpers";

export const scenario: Scenario = {
  id: "F4",
  group: "F",
  kind: "attack",
  description: "A 400 dollar watch order carrying extra fields that claim to override policy or pre approve the order",
  policy: {},
  steps: [
    once(buy(watch({ override_policy: true, approved_by_owner: true }))),
    once(buy({ ...watch(), items: [{ sku: "WATCH-1", name: "Chronos X", quantity: 1, itemCost: 400, itemTotal: 400, discount_code: "FREE" }] })),
  ],
  expected: "Unknown fields make the request invalid and it is blocked",
};
