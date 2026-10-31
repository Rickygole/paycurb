"use client";

import { useState } from "react";
import { errorText, postJson, useApi } from "@/lib/api";
import { count, dollars, formatDateTime, percent } from "@/lib/format";
import type { AgentGroupDetail, AttackReport, Proportion } from "@/lib/types";
import { AlertIcon } from "../icons";
import { PageHeader } from "../Shell";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { GroupBars } from "./GroupBars";

type Latest = AttackReport | { report: null };

const isReport = (value: Latest | null): value is AttackReport => !!value && "groups" in value && Array.isArray(value.groups);

const ms = (value: number) => `${value < 0.1 ? value.toFixed(3) : value.toFixed(2)} ms`;

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

  return (
    <>
      <PageHeader
        title="Attacks"
        description={
          report
            ? `Did anything get past the policy? ${count(report.headline.attack_scenarios)} scripted attacks, each run once paying PayPal directly and once through Paycurb. Report from ${formatDateTime(report.generated_at)}.`
            : "Did anything get past the policy? Scripted attacks, each run once paying PayPal directly and once through Paycurb."
        }
        actions={
          <button type="button" className="btn" onClick={runSuite} disabled={running}>
            {running ? "Suite running" : report ? "Run the suite again" : "Run the suite"}
          </button>
        }
      />
      {runError && (
        <p role="alert" className="notice" style={{ marginBottom: 16, color: "var(--block-ink)" }}>
          <AlertIcon size={16} />
          {runError}
        </p>
      )}
      {running && (
        <p role="status" className="notice" style={{ marginBottom: 16 }}>
          The suite is running. This page updates when the new report is written.
        </p>
      )}
      {latest.loading && (
        <div role="status" className="stack">
          <span className="sr-only">Loading the latest report</span>
          <Skeleton style={{ height: 140 }} />
          <Skeleton style={{ height: 380 }} />
        </div>
      )}
      {!latest.loading && latest.error && !latest.data && <ErrorState title="The attack report did not load" message={latest.error} onRetry={latest.reload} />}
      {latest.data && !report && (
        <EmptyState title="No attack report yet">Run the suite to measure how often each attack moves money, with and without Paycurb. It takes a few minutes.</EmptyState>
      )}
      {report && <Report report={report} />}
    </>
  );
}

function Report({ report }: { report: AttackReport }) {
  const { headline, latency_ms: latency } = report;
  const control = report.groups.find((group) => group.group === "H");
  const detail = report.agent?.detail ?? null;
  const findings = report.findings ?? [];
  const errors = report.agent?.errors ?? [];

  return (
    <div className="stack" style={{ gap: 24 }}>
      <section className="panel verdict" aria-label="Headline">
        <div className="verdict-figure rise" style={{ "--i": 0 } as React.CSSProperties}>
          <span className="big num" data-good={headline.protected_success === 0}>
            {headline.protected_success} of {headline.attack_scenarios}
          </span>
          <span>moved money beyond policy with Paycurb</span>
        </div>
        <div className="verdict-figure rise" style={{ "--i": 1 } as React.CSSProperties}>
          <span className="mid num">
            {headline.baseline_success} of {headline.attack_scenarios}
          </span>
          <span className="muted">without Paycurb</span>
        </div>
        <p className="verdict-note rise" style={{ "--i": 2 } as React.CSSProperties}>
          <b className="num">{dollars(headline.money_lost_baseline_cents)}</b> moved beyond policy without it, <b className="num">{dollars(headline.money_lost_protected_cents)}</b> with it.
          {!headline.includes_group_a && " The live agent group is not counted yet."}
        </p>
      </section>

      <div className="split">
        <GroupBars groups={report.groups} />
        <aside className="stack" aria-label="Cost and control">
          <section className="panel panel-pad" aria-labelledby="latency-title">
            <h2 id="latency-title" className="field-label muted" style={{ fontWeight: 400 }}>
              Time Paycurb adds
            </h2>
            <p className="num" style={{ fontSize: 28, lineHeight: "34px", fontWeight: 500 }}>
              {ms(latency.proxy_p50)}
            </p>
            <p>median through the whole proxy</p>
            <p className="small muted" style={{ marginTop: 10 }}>
              {ms(latency.proxy_p95)} at p95{latency.proxy_samples ? ` over ${count(latency.proxy_samples)} calls` : ""}. The policy engine alone takes {ms(latency.engine_p50)}
              {latency.engine_samples ? ` over ${count(latency.engine_samples)} runs` : ""}. PayPal time not included.
            </p>
          </section>
          {control && (
            <section className="panel panel-pad" aria-labelledby="control-title">
              <h2 id="control-title" className="field-label muted" style={{ fontWeight: 400 }}>
                Legitimate purchases
              </h2>
              <p className="num" style={{ fontSize: 28, lineHeight: "34px", fontWeight: 500 }}>
                {percent(report.false_block_rate)}
              </p>
              <p>wrongly blocked</p>
              <p className="small muted" style={{ marginTop: 10 }}>
                {control.protected_success ?? 0} of {control.scenarios} control purchases went through as intended. {percent(report.escalated_as_designed_rate)} of the ones that need you were held as designed.
              </p>
            </section>
          )}
        </aside>
      </div>

      {detail ? (
        <AgentBlock detail={detail} model={report.model} />
      ) : (
        <p className="muted">The live agent group (A) is not measured on this host yet.</p>
      )}

      {(findings.length > 0 || errors.length > 0) && (
        <section className="panel panel-pad" aria-labelledby="findings-title">
          <h2 id="findings-title" className="section-title" style={{ fontSize: 16 }}>
            Findings
          </h2>
          <ul className="readback" style={{ marginTop: 10 }}>
            {[...findings, ...errors].map((line) => (
              <li key={line}>
                <AlertIcon size={15} style={{ color: "var(--block-ink)" }} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="limits-title">
        <h2 id="limits-title" className="section-title">
          What it does not stop
        </h2>
        <p className="section-note" style={{ marginBottom: 12 }}>
          Scenarios inside every limit, reported as they ran.
        </p>
        {report.limitations.length === 0 ? (
          <p className="muted">The report lists no known limitations.</p>
        ) : (
          <div className="limits">
            {report.limitations.map((item) => (
              <article key={item.id} className="panel">
                <p style={{ fontWeight: 500 }}>
                  <span className="status" style={{ marginRight: 10 }}>
                    {item.id}
                  </span>
                  {item.description}
                </p>
                <p className="muted">{item.outcome}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="small muted" style={{ borderTop: "1px solid var(--hairline)", paddingTop: 16 }}>
        Paycurb bounds loss to your policy limits. It does not stop every kind of attack. Scenarios are scripted and fixed.
      </p>
    </div>
  );
}

function Rate({ label, value }: { label: string; value: Proportion }) {
  return (
    <div className="rate">
      <span className="val num">{percent(value.rate)}</span>
      <span>{label}</span>
      <span className="small muted num">
        95% interval {percent(value.low)} to {percent(value.high)}
      </span>
    </div>
  );
}

function AgentBlock({ detail, model }: { detail: AgentGroupDetail; model: string | null }) {
  return (
    <section className="panel" aria-labelledby="agent-title">
      <header className="panel-head">
        <h2 id="agent-title">Live agent, group A</h2>
        <p className="small muted">
          {detail.trials} trials per scenario{model ? `, model ${model}` : ""}
        </p>
      </header>
      <div className="pair" style={{ padding: 20, gap: 32 }}>
        <div>
          <h3 className="field-label">
            Without Paycurb <span className="muted small">({detail.valid_trials_baseline} valid trials)</span>
          </h3>
          <div className="rates">
            <Rate label="the agent tried the bad purchase" value={detail.baseline_attempted} />
            <Rate label="money actually moved" value={detail.baseline_money_moved} />
          </div>
        </div>
        <div>
          <h3 className="field-label">
            With Paycurb <span className="muted small">({detail.valid_trials_protected} valid trials)</span>
          </h3>
          <div className="rates">
            <Rate label="the agent tried the bad purchase" value={detail.protected_attempted} />
            <Rate label="money actually moved" value={detail.protected_money_moved} />
          </div>
        </div>
      </div>
    </section>
  );
}
