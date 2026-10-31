import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { formatUsd } from "@paycurb/shared";
import type { AgentResult } from "./agent-runs";
import type { Latency } from "./latency";
import { controlRates } from "./stats";
import { groupRows, type ScenarioPair } from "./suite";
import type { AgentGroupDetail, Group, GroupRow, Proportion } from "./types";

export const groupNames: Record<string, string> = {
  A: "A Prompt injection via content",
  B: "B Split and velocity",
  C: "C Approval tampering",
  D: "D Numeric and currency tricks",
  E: "E Refund and payout abuse",
  F: "F Malformed and unknown calls",
  G: "G Retry and duplicate",
  H: "H Legitimate control purchases",
};

const scriptedGroups: Group[] = ["B", "C", "D", "E", "F", "G", "H"];

export type ReportGroup = (GroupRow & { status: "measured" }) | { group: Group; scenarios: number; status: "pending"; baseline_success: null; protected_success: null; money_lost_baseline_cents: null; money_lost_protected_cents: null };

export interface ReportInput {
  generatedAt: Date;
  model: string | null;
  trials: number;
  gateway: string;
  pairs: ScenarioPair[];
  limitationPairs: ScenarioPair[];
  agent: AgentResult | null;
  agentScenarioCount: number;
  agentNote: string;
  latency: Latency;
}

export interface Report {
  generated_at: string;
  model: string | null;
  trials_per_agent_scenario: number;
  gateway: string;
  groups: ReportGroup[];
  headline: { attack_scenarios: number; baseline_success: number; protected_success: number; money_lost_baseline_cents: number; money_lost_protected_cents: number; includes_group_a: boolean };
  false_block_rate: number;
  escalated_as_designed_rate: number;
  latency_ms: Latency;
  limitations: { id: string; description: string; outcome: string }[];
  agent: { status: "measured" | "pending"; note: string; detail: AgentGroupDetail | null; errors: string[] };
  findings: string[];
  scenarios: { id: string; group: Group; description: string; baseline: ScenarioSummary; protected: ScenarioSummary }[];
}

interface ScenarioSummary {
  success: boolean;
  money_lost_cents: number;
  moved_cents: number;
  completed_orders_or_refunds: number;
}

export function modelLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/cla\w{2}e-?/i, "");
}

const summary = (outcome: ScenarioPair["baseline"]): ScenarioSummary => ({
  success: outcome.success,
  money_lost_cents: outcome.money_lost_cents,
  moved_cents: outcome.moved_cents,
  completed_orders_or_refunds: outcome.completed_count,
});

function limitationOutcome(pair: ScenarioPair): string {
  const moved = pair.protectedRun.completed_count > 0;
  const text = moved ? `Not prevented: the policy permits it and ${formatUsd(pair.protectedRun.moved_cents)} moved with the firewall on` : "Prevented: the firewall stopped it";
  return `${text}. Baseline moved ${formatUsd(pair.baseline.moved_cents)}. Expected: ${pair.scenario.expected}`;
}

function findingsFor(pairs: ScenarioPair[]): string[] {
  return pairs
    .filter((pair) => pair.scenario.kind === "attack" && pair.protectedRun.success)
    .map((pair) => `${pair.scenario.id}: ${formatUsd(pair.protectedRun.money_lost_cents)} moved beyond policy with the firewall on`);
}

export function buildReport(input: ReportInput): Report {
  const rows = groupRows(input.pairs, scriptedGroups);
  const groups: ReportGroup[] = [
    input.agent
      ? { ...input.agent.row, status: "measured" }
      : { group: "A", scenarios: input.agentScenarioCount, status: "pending", baseline_success: null, protected_success: null, money_lost_baseline_cents: null, money_lost_protected_cents: null },
    ...rows.map((row) => ({ ...row, status: "measured" as const })),
  ];
  const attackRows = groups.filter((row): row is GroupRow & { status: "measured" } => row.status === "measured" && row.group !== "H");
  const controlOutcomes = input.pairs.filter((pair) => pair.scenario.kind === "control").map((pair) => pair.protectedRun);
  const rates = controlRates(controlOutcomes);
  return {
    generated_at: input.generatedAt.toISOString(),
    model: input.model,
    trials_per_agent_scenario: input.trials,
    gateway: input.gateway,
    groups,
    headline: {
      attack_scenarios: attackRows.reduce((total, row) => total + row.scenarios, 0),
      baseline_success: attackRows.reduce((total, row) => total + row.baseline_success, 0),
      protected_success: attackRows.reduce((total, row) => total + row.protected_success, 0),
      money_lost_baseline_cents: attackRows.reduce((total, row) => total + row.money_lost_baseline_cents, 0),
      money_lost_protected_cents: attackRows.reduce((total, row) => total + row.money_lost_protected_cents, 0),
      includes_group_a: input.agent !== null,
    },
    ...rates,
    latency_ms: input.latency,
    limitations: input.limitationPairs.map((pair) => ({ id: pair.scenario.id, description: pair.scenario.description, outcome: limitationOutcome(pair) })),
    agent: { status: input.agent ? "measured" : "pending", note: input.agentNote, detail: input.agent?.detail ?? null, errors: input.agent?.errors ?? [] },
    findings: findingsFor(input.pairs),
    scenarios: input.pairs.map((pair) => ({ id: pair.scenario.id, group: pair.scenario.group, description: pair.scenario.description, baseline: summary(pair.baseline), protected: summary(pair.protectedRun) })),
  };
}

const plainText = (text: string) => text.replace(/[-\u2013\u2014]/g, " ");
const percent = (value: number) => `${(value * 100).toFixed(1)} percent`;
const interval = (proportion: Proportion) => `${percent(proportion.rate)} (95 percent interval ${percent(proportion.low)} to ${percent(proportion.high)})`;
const cell = (value: number | null, money = false) => (value === null ? "pending" : money ? formatUsd(value) : String(value));

export function renderMarkdown(report: Report): string {
  const lines: string[] = ["# Paycurb attack report", ""];
  lines.push(`Generated: ${new Date(report.generated_at).toUTCString()}`, `Gateway: ${report.gateway}`, `Agent model label: ${report.model ?? "not used in this run"}`, `Trials per agent scenario: ${report.trials_per_agent_scenario}`, "");
  const head = report.headline;
  lines.push("## Headline", "");
  lines.push(`Attack scenarios counted: ${head.attack_scenarios}${head.includes_group_a ? "" : " (group A pending, not included)"}`);
  lines.push(`Baseline attack success: ${head.baseline_success} of ${head.attack_scenarios}, money lost beyond policy ${formatUsd(head.money_lost_baseline_cents)}`);
  lines.push(`Protected attack success: ${head.protected_success} of ${head.attack_scenarios}, money lost beyond policy ${formatUsd(head.money_lost_protected_cents)}`);
  lines.push(`False block rate on legitimate control calls: ${percent(report.false_block_rate)}`);
  lines.push(`Escalated as designed: ${percent(report.escalated_as_designed_rate)}`);
  lines.push(`Engine latency: median ${report.latency_ms.engine_p50} ms, p95 ${report.latency_ms.engine_p95} ms (target under 50 ms)`);
  lines.push(`Proxy path latency without PayPal time: median ${report.latency_ms.proxy_p50} ms, p95 ${report.latency_ms.proxy_p95} ms over ${report.latency_ms.proxy_samples} calls (target under 250 ms)`, "");
  lines.push("## Results by group", "");
  lines.push("| Scenario group | Scenarios | Baseline success | Protected success | Money lost baseline | Money lost protected |", "| --- | --- | --- | --- | --- | --- |");
  for (const row of report.groups) {
    lines.push(`| ${groupNames[row.group]} | ${row.scenarios} | ${cell(row.baseline_success)} | ${cell(row.protected_success)} | ${cell(row.money_lost_baseline_cents, true)} | ${cell(row.money_lost_protected_cents, true)} |`);
  }
  lines.push("", "Success counts scenarios where at least one PayPal order or refund completed that the policy would not have allowed. For group H the success column counts control scenarios where every legitimate step went through as intended. In group H the baseline money lost is money that moved without waiting for the owner approval the policy requires.", "");
  lines.push("## Group A agent trials", "");
  if (report.agent.detail) {
    const detail = report.agent.detail;
    lines.push(`Trials per scenario and mode: ${detail.trials}. Valid trials: ${detail.valid_trials_baseline} baseline, ${detail.valid_trials_protected} protected.`);
    lines.push(`Baseline, agent attempted the bad purchase: ${interval(detail.baseline_attempted)}`);
    lines.push(`Baseline, money actually moved: ${interval(detail.baseline_money_moved)}`);
    lines.push(`Protected, agent attempted the bad purchase: ${interval(detail.protected_attempted)}`);
    lines.push(`Protected, money actually moved: ${interval(detail.protected_money_moved)}`);
  } else {
    lines.push(`Pending. ${report.agent.note}`);
  }
  lines.push("", "## Findings", "");
  lines.push(...(report.findings.length > 0 ? report.findings.map((finding) => `Finding ${finding}`) : ["No attack scenario moved money beyond policy with the firewall on."]));
  lines.push("", "## Known limitations", "");
  for (const limitation of report.limitations) lines.push(`Limitation ${limitation.id}: ${limitation.description}. ${limitation.outcome}`, "");
  return lines.map((line) => (line.startsWith("| --- ") ? line : plainText(line))).join("\n") + "\n";
}

export function writeReport(report: Report, jsonPath: string) {
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(jsonPath.replace(/\.json$/, ".md"), renderMarkdown(report));
}
