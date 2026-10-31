"use client";

import { useState } from "react";
import { errorText, postJson, useApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ActivePolicy, CompileResult, PolicyVersion } from "@/lib/types";
import { JsonBlock } from "../Drawer";
import { AlertIcon, CheckIcon, WrenchIcon } from "../icons";
import { Page, PageHeader } from "../Shell";
import { ErrorState, Skeleton } from "../states";
import { ChangeTable } from "./ChangeTable";
import { VersionHistory } from "./VersionHistory";

const example =
  "Only buy office supplies from Acme Office Supply and Paper Co. Ask me before anything at or over $100. Never more than $300 in one order and no more than $500 a day. Ask me about refunds and new merchants. Block subscriptions and payouts.";

export function PolicyEditor() {
  const active = useApi<ActivePolicy>("/api/policy/active");
  const versions = useApi<PolicyVersion[]>("/api/policy/versions");
  const [draft, setDraft] = useState<string | null>(null);
  const [compiled, setCompiled] = useState<CompileResult | null>(null);
  const [compiledText, setCompiledText] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState<number | null>(null);

  const text = draft ?? active.data?.source_text ?? "";
  const stale = compiled !== null && compiledText !== text;
  const noActive = !active.loading && !active.data;

  async function compile() {
    setCompiling(true);
    setError(null);
    setActivated(null);
    try {
      const result = await postJson<CompileResult>("/api/policy/compile", { text });
      setCompiled(result);
      setCompiledText(text);
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setCompiling(false);
    }
  }

  async function activate() {
    if (!compiled) return;
    setActivating(true);
    setError(null);
    try {
      const result = await postJson<{ version: number }>("/api/policy/activate", { policy: compiled.policy, source_text: compiledText });
      setActivated(result.version);
      setCompiled(null);
      setDraft(null);
      await Promise.all([active.reload(), versions.reload()]);
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setActivating(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Policy"
        description="Write the spending rules in plain English. The compiler turns them into strict limits, reads them back to you, and nothing changes until you activate them."
        actions={
          active.data ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
              <span className="h-2 w-2 rounded-full bg-allow" aria-hidden="true" />
              Active v{active.data.version} since {formatDateTime(active.data.created_at)}
            </span>
          ) : undefined
        }
      />

      {active.error && active.status !== 404 && active.data === null && !active.loading && (
        <div className="mb-4">
          <ErrorState title="Could not load the active policy" message={active.error} onRetry={active.reload} />
        </div>
      )}

      {activated !== null && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-allow-soft px-4 py-3 text-sm font-semibold text-allow">
          <CheckIcon size={16} />
          Version {activated} is now active. New payment calls are checked against it.
        </p>
      )}

      <section className="card p-5" aria-labelledby="rules-label">
        <label id="rules-label" htmlFor="rules" className="label text-base!">
          Rules in plain English
        </label>
        {active.loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <textarea
            id="rules"
            rows={5}
            className="input min-h-32 resize-y leading-relaxed"
            placeholder={example}
            value={text}
            onChange={(event) => setDraft(event.target.value)}
            aria-describedby="rules-hint"
          />
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p id="rules-hint" className="text-xs text-muted">
            {noActive ? "No policy is active yet, so every payment is blocked." : "Editing here does not change anything until you activate."}
          </p>
          <div className="flex gap-2">
            {draft !== null && active.data && (
              <button type="button" className="btn-secondary" onClick={() => setDraft(null)} disabled={compiling}>
                Revert to active
              </button>
            )}
            <button type="button" className="btn-primary" onClick={compile} disabled={compiling || text.trim().length === 0}>
              <WrenchIcon size={15} />
              {compiling ? "Compiling..." : "Compile"}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-block">
            <AlertIcon size={15} className="shrink-0" />
            {error}
          </p>
        )}
      </section>

      {compiling && !compiled && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2" role="status">
          <span className="sr-only">Compiling your rules</span>
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      )}

      {compiled && (
        <section aria-labelledby="result-title" className="mt-6 space-y-4">
          <h2 id="result-title" className="sr-only">
            Compiled policy
          </h2>
          {compiled.questions.length > 0 && (
            <div className="rounded-xl border-2 border-escalate/40 bg-escalate-soft p-5" role="alert">
              <p className="flex items-center gap-2 text-base font-bold text-escalate">
                <AlertIcon size={18} />
                The compiler has {compiled.questions.length === 1 ? "a question" : `${compiled.questions.length} questions`} for you
              </p>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px]">
                {compiled.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-muted">Answer by editing your rules and compiling again. If you activate now, the strict defaults shown below apply.</p>
            </div>
          )}
          {stale && (
            <p role="status" className="flex items-center gap-2 text-sm text-escalate">
              <AlertIcon size={15} />
              The rules changed since this compile. Compile again before activating.
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="mb-3 font-semibold">What this policy will do</h3>
              <ul className="space-y-2">
                {compiled.readback.map((sentence) => (
                  <li key={sentence} className="flex gap-2.5 text-sm leading-relaxed">
                    <CheckIcon size={15} className="mt-0.5 shrink-0 text-allow" />
                    <span>{sentence}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card min-w-0 p-5">
              <h3 className="mb-3 font-semibold">Policy JSON</h3>
              <JsonBlock value={compiled.policy} label="Compiled policy JSON" />
            </div>
          </div>
          {active.data && (
            <div className="card p-5">
              <h3 className="mb-3 font-semibold">Changes from active v{active.data.version}</h3>
              <ChangeTable before={active.data.policy} after={compiled.policy} beforeLabel={`Active v${active.data.version}`} afterLabel="New" />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setCompiled(null)} disabled={activating}>
              Discard
            </button>
            <button type="button" className="btn-primary" onClick={activate} disabled={activating || stale}>
              <CheckIcon size={15} />
              {activating ? "Activating..." : "Confirm and Activate"}
            </button>
          </div>
        </section>
      )}

      <VersionHistory versions={versions.data} active={active.data} error={versions.error} onRetry={versions.reload} />
    </Page>
  );
}
