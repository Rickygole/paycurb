import type { ApprovalCard, Feed, PolicyVersion } from "./types";

export const DEFAULT_POLICY_TEXT = /^\s*(default demo policy)?\s*$/i;
const DECIDED = ["approved", "rejected", "executed"];

export interface SetupData {
  versions: Pick<PolicyVersion, "version" | "active" | "source_text">[];
  decisions: Pick<Feed, "action">[];
  approvals: Pick<ApprovalCard, "status">[];
}

export function setupProgress({ versions, decisions, approvals }: SetupData) {
  return {
    policy: versions.some((entry) => (entry.active && entry.version > 1) || !DEFAULT_POLICY_TEXT.test(entry.source_text ?? "")),
    agent: decisions.some((entry) => entry.action.agent_id !== "demo-agent"),
    request: decisions.length > 0,
    approval: approvals.some((entry) => DECIDED.includes(entry.status)),
  };
}
