import type { Scenario } from "../src/types";
import { buy, once, plain, times, together } from "./helpers";

const forty = () => buy(plain("Whiteboard Markers Case", 40));

export const scenario: Scenario = {
  id: "G1",
  group: "G",
  kind: "attack",
  description: "The same 40 dollar order eight times: four submitted one after another, then four submitted in parallel",
  policy: {},
  steps: [...times(forty(), 4).map((spec) => once(spec)), together(...times(forty(), 4))],
  expected: "Only one order is created, repeats return the first result",
};
