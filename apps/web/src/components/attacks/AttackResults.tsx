"use client";

import { useState } from "react";
import { errorText, postJson, useApi } from "@/lib/api";
import { count, dollars, formatDateTime, percent } from "@/lib/format";
import type { AttackReport } from "@/lib/types";
import { AlertIcon, PlayIcon, TargetIcon } from "../icons";
import { Page, PageHeader } from "../Shell";
import { EmptyState, ErrorState, LoadingBlock } from "../states";
import { GroupBars } from "./GroupBars";

type Latest = AttackReport | { report: null };

const isReport = (value: Latest | null): value is AttackReport => !!value && "groups" in value && Array.isArray(value.groups);

function Headline({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "allow" | "block" }) {
  const color = tone === "allow" ? "text-allow" : tone === "block" ? "text-block" : "text-fg";
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold tracking-tight num ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function weightedRate(report: AttackReport, pick: "baseline_success" | "protected_success") {
  const total = report.groups.reduce((sum, group) => sum + group.scenarios, 0);
  if (total === 0) return 0;
  return report.groups.reduce((sum, group) => sum + group[pick] * group.scenarios, 0) / total;
}

export function AttackResults() {
  const [started, setStarted] = useState(false);
  const [startedFrom, setStartedFrom] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const latest = useApi<Latest>("/api/attacks/latest", polling ? 3000 : undefined);
  const report = isReport(latest.data) ? latest.data : null;
  const running = started && (report === null || report.generated_at === startedFrom);

  async function runSuite() {
    setRunError(null);
    try {
      await postJson("/api/attacks/run");
      setStartedFrom(report?.generated_at ?? null);
      setStarted(true);
      setPolling(true);
    } catch (problem) {
      setRunError(errorText(problem));
    }
  }

  const runButton = (
    <button type="button" className="btn-primary" onClick={runSuite} disabled={running}>
      <PlayIcon size={14} />
      {running ? "Suite running..." : "Run Suite"}
    </button>
  );

  return (
    <Page>
      <PageHeader
        title="Attack Results"
        description="The same attack scenarios run against the agent twice: once paying PayPal directly, once through Paycurb."
        actions={runButton}
      />
      {runError && (
        <p role="alert" className="mb-4 flex items-center gap-2 text-sm text-block">
          <AlertIcon size={15} className="shrink-0" />
          {runError}
        </p>
      )}
      {running && (
        <p role="status" className="mb-4 rounded-lg bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          The attack suite is running. These results refresh as soon as the new report is written.
        </p>
      )}
      {latest.loading && <LoadingBlock label="Loading the latest report" rows={3} />}
      {!latest.loading && latest.error && !latest.data && <ErrorState title="Could not load attack results" message={latest.error} onRetry={latest.reload} />}
      {latest.data && !report && (
        <EmptyState title="No attack results yet" icon={<TargetIcon size={28} />}>
          Run the suite to measure how often each attack gets money out, with and without the firewall. It takes a few minutes.
        </EmptyState>
      )}
      {report && <Report report={report} />}
    </Page>
  );
}

function Report({ report }: { report: AttackReport }) {
  const baseline = weightedRate(report, "baseline_success");
  const protectedRate = weightedRate(report, "protected_success");
  const lostBaseline = report.groups.reduce((sum, group) => sum + group.money_lost_baseline_cents, 0);
  const lostProtected = report.groups.reduce((sum, group) => sum + group.money_lost_protected_cents, 0);
  const scenarios = report.groups.reduce((sum, group) => sum + group.scenarios, 0);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted">
        Generated {formatDateTime(report.generated_at)}. Agent model: <span className="font-mono">{report.model}</span>. {count(scenarios)} scenarios,{" "}
        {report.trials_per_agent_scenario} trials each.
      </p>
      <section aria-label="Headline numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Headline label="Attack success with Paycurb" value={percent(protectedRate)} hint={`Down from ${percent(baseline)} without it`} tone={protectedRate === 0 ? "allow" : "block"} />
        <Headline label="Money lost with Paycurb" value={dollars(lostProtected)} hint={`${dollars(lostBaseline)} lost without it`} />
        <Headline label="False block rate" value={percent(report.false_block_rate)} hint={`Legitimate purchases stopped. ${percent(report.escalated_as_designed_rate)} escalated as designed`} />
        <Headline
          label="Engine latency, median"
          value={`${report.latency_ms.engine_p50} ms`}
          hint={`${report.latency_ms.engine_p95} ms at p95. Whole proxy ${report.latency_ms.proxy_p50} ms median, ${report.latency_ms.proxy_p95} ms at p95`}
        />
      </section>
      <GroupBars groups={report.groups} />
      <section className="card overflow-x-auto" aria-labelledby="metrics-title">
        <h2 id="metrics-title" className="px-5 pt-5 pb-3 font-semibold">
          Metrics by group
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-line bg-surface-2 text-left text-xs text-muted">
              <th scope="col" className="px-5 py-2.5 font-medium">Group</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Scenarios</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Baseline success</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Protected success</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Lost, baseline</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Lost, protected</th>
            </tr>
          </thead>
          <tbody>
            {report.groups.map((group) => (
              <tr key={group.group} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-5 py-2.5 text-left font-medium">{group.group}</th>
                <td className="px-4 py-2.5 text-right num">{group.scenarios}</td>
                <td className="px-4 py-2.5 text-right num">{percent(group.baseline_success)}</td>
                <td className={`px-4 py-2.5 text-right font-semibold num ${group.protected_success > 0 ? "text-block" : "text-allow"}`}>{percent(group.protected_success)}</td>
                <td className="px-4 py-2.5 text-right num">{dollars(group.money_lost_baseline_cents)}</td>
                <td className="px-5 py-2.5 text-right font-semibold num">{dollars(group.money_lost_protected_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section aria-labelledby="limits-title">
        <h2 id="limits-title" className="mb-1 font-semibold">
          Known limitations
        </h2>
        <p className="mb-3 text-sm text-muted">Cases the firewall does not fully stop, reported as they are.</p>
        {report.limitations.length === 0 ? (
          <p className="text-sm text-muted">The report lists no known limitations.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {report.limitations.map((item) => (
              <li key={item.id} className="card p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="rounded bg-escalate-soft px-1.5 py-0.5 font-mono text-xs text-escalate">{item.id}</span>
                  Scenario
                </p>
                <p className="mt-1.5 text-sm">{item.description}</p>
                <p className="mt-2 text-sm text-muted">
                  <span className="font-semibold text-fg">Outcome: </span>
                  {item.outcome}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
