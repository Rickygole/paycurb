import { describe, expect, it } from "vitest";
import { setupProgress } from "../src/lib/setup";

const decision = (agent_id: string) => ({ action: { agent_id } }) as never;

describe("setupProgress", () => {
  it("starts with nothing done on a fresh workspace", () => {
    expect(setupProgress({ versions: [{ version: 1, active: true, source_text: "Default demo policy" }], decisions: [], approvals: [{ status: "pending" }] })).toEqual({
      policy: false,
      agent: false,
      request: false,
      approval: false,
    });
  });

  it("marks each step from the workspace data", () => {
    const progress = setupProgress({
      versions: [{ version: 2, active: true, source_text: "Never spend more than $200 a day" }, { version: 1, active: false, source_text: "Default demo policy" }],
      decisions: [decision("demo-agent"), decision("office-agent")],
      approvals: [{ status: "rejected" }],
    });
    expect(progress).toEqual({ policy: true, agent: true, request: true, approval: true });
  });

  it("marks the policy step done when the active version is past the first, whatever its text", () => {
    const versions = [6, 5, 4, 3, 2, 1].map((version) => ({ version, active: version === 6, source_text: "" }));
    expect(setupProgress({ versions, decisions: [], approvals: [] }).policy).toBe(true);
  });

  it("does not count the built in demo agent as a connected agent", () => {
    expect(setupProgress({ versions: [], decisions: [decision("demo-agent")], approvals: [] }).agent).toBe(false);
  });
});
