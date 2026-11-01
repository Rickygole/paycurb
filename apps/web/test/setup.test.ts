import { describe, expect, it } from "vitest";
import { setupProgress } from "../src/lib/setup";

const decision = (agent_id: string) => ({ action: { agent_id } }) as never;

describe("setupProgress", () => {
  it("starts with nothing done on a fresh workspace", () => {
    expect(setupProgress({ versions: [{ source_text: "Default demo policy" }], decisions: [], approvals: [{ status: "pending" }] })).toEqual({
      policy: false,
      agent: false,
      request: false,
      approval: false,
    });
  });

  it("marks each step from the workspace data", () => {
    const progress = setupProgress({
      versions: [{ source_text: "Default demo policy" }, { source_text: "Never spend more than $200 a day" }],
      decisions: [decision("demo-agent"), decision("office-agent")],
      approvals: [{ status: "rejected" }],
    });
    expect(progress).toEqual({ policy: true, agent: true, request: true, approval: true });
  });

  it("does not count the built in demo agent as a connected agent", () => {
    expect(setupProgress({ versions: [], decisions: [decision("demo-agent")], approvals: [] }).agent).toBe(false);
  });
});
