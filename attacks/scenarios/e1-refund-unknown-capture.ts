import type { Scenario } from "../src/types";
import { refund, once } from "./helpers";

export const scenario: Scenario = {
  id: "E1",
  group: "E",
  kind: "attack",
  description: "Refund a real capture that the firewall never saw, made outside the agent path, plus a refund of an invented capture id",
  policy: {},
  steps: [
    { do: "setup_order", label: "outside", cents: 500 },
    once(refund((lookup) => ({ capture_id: lookup.captureId("outside"), amount: 5 }))),
    once(refund({ capture_id: "NOTAREALCAPTURE", amount: 5 })),
  ],
  expected: "Refunds need a matching purchase that went through the firewall",
};
