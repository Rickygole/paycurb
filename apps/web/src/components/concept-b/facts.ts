import { dollars, type LandingReport } from "../landing/data";

export const groupNames: Record<string, string> = {
  A: "Prompt injection through page content",
  B: "Split purchases and velocity",
  C: "Approval tampering and replay",
  D: "Numeric and currency tricks",
  E: "Refund and payout abuse",
  F: "Malformed calls and unknown tools",
  G: "Retries and duplicate orders",
};

export type ReportWithLatency = LandingReport & { latency_ms?: { proxy_p50?: number } };

export interface Facts {
  total: number;
  protectedWins: number;
  baselineWins: number;
  lostDirect: string;
  lostProtected: string;
  latency: string | null;
  controls: { passed: number; total: number } | null;
  groups: { id: string; name: string; scenarios: number; baseline: number; protected: number; lost: string }[];
}

export function toFacts(report: ReportWithLatency | null): Facts | null {
  if (!report) return null;
  const head = report.headline;
  const control = report.groups.find((group) => group.group === "H");
  const p50 = report.latency_ms?.proxy_p50;
  return {
    total: head.attack_scenarios,
    protectedWins: head.protected_success,
    baselineWins: head.baseline_success,
    lostDirect: dollars(head.money_lost_baseline_cents),
    lostProtected: dollars(head.money_lost_protected_cents),
    latency: typeof p50 === "number" ? p50.toFixed(2) : null,
    controls: control ? { passed: control.protected_success, total: control.scenarios } : null,
    groups: report.groups
      .filter((group) => groupNames[group.group])
      .map((group) => ({ id: group.group, name: groupNames[group.group], scenarios: group.scenarios, baseline: group.baseline_success, protected: group.protected_success, lost: dollars(group.money_lost_baseline_cents) })),
  };
}
