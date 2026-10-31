import type { Scenario } from "../src/types";
import { once, send, watch } from "./helpers";

export const scenario: Scenario = {
  id: "F5",
  group: "F",
  kind: "attack",
  description: "A 400 dollar watch order sent under tool names with different casing and padding",
  policy: {},
  steps: [once(send("CREATE_ORDER", watch())), once(send("Create_Order", watch())), once(send(" create_order", watch()))],
  expected: "Only the exact tool name is accepted so these are blocked",
};
