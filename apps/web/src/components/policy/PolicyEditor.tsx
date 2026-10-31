"use client";

import { useState } from "react";
import { ApiError, errorText, postJson, useApi } from "@/lib/api";
import { dayLabel, formatDateTime } from "@/lib/format";
import { policyLines, policyText } from "@/lib/policySummary";
import type { ActivePolicy, CompileResult, Policy, PolicyVersion } from "@/lib/types";
import { JsonBlock } from "../Drawer";
import { AlertIcon, CheckIcon, ChevronRightIcon, PencilIcon } from "../icons";
import { PageHeader } from "../Shell";
import { ErrorState, Skeleton } from "../states";
import { ChangeTable } from "./ChangeTable";
import { VersionHistory } from "./VersionHistory";

const example =
  "Spend at most $200 per day. Allow up to $100 per purchase. Ask me before any purchase of $50 or more. Only buy from Paper Co. Never allow payouts.";

const STUB = /^\s*(default demo policy)?\s*$/i;

const NO_MODEL = "No model is available on this host. Rules can be edited as JSON below.";

function readPolicy(text: string): { policy: Policy | null; problem: string | null } {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return { policy: null, problem: "The policy must be one JSON object." };
    return { policy: value as Policy, problem: null };
  } catch (problem) {
    return { policy: null, problem: problem instanceof Error ? problem.message : "This is not valid JSON." };
  }
}

function Setting({ id, title, note, aside, children }: { id: string; title: string; note: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="setting" aria-labelledby={id}>
      <div className="setting-label">
        <h2 id={id} className="section-title">
          {title}
        </h2>
        <p className="section-note">{note}</p>
        {aside}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </section>
  );
}

export function PolicyEditor() {
  const active = useApi<ActivePolicy>("/api/policy/active");
  const versions = useApi<PolicyVersion[]>("/api/policy/versions");
  const [draft, setDraft] = useState<string | null>(null);
  const [compiled, setCompiled] = useState<CompileResult | null>(null);
  const [compiledText, setCompiledText] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noModel, setNoModel] = useState(false);
  const [jsonText, setJsonText] = useState<string | null>(null);
  const [activated, setActivated] = useState<number | null>(null);

  const written = active.data?.source_text ?? "";
  const text = draft ?? (active.data && STUB.test(written) ? policyText(active.data.policy) : written);
  const stale = compiled !== null && compiledText !== text;
  const editing = jsonText !== null;
  const parsed = editing ? readPolicy(jsonText) : null;
  const candidate = editing ? parsed?.policy ?? null : stale ? null : compiled?.policy ?? null;

  function openJson() {
    setJsonText(JSON.stringify(compiled?.policy ?? active.data?.policy ?? {}, null, 2));
  }

  async function compile() {
    setCompiling(true);
    setError(null);
    setActivated(null);
    try {
      const result = await postJson<CompileResult>("/api/policy/compile", { text });
      setCompiled(result);
      setCompiledText(text);
      setNoModel(false);
      setJsonText(null);
    } catch (problem) {
      if (problem instanceof ApiError && problem.status >= 500) {
        setNoModel(true);
        openJson();
      } else setError(errorText(problem));
    } finally {
      setCompiling(false);
    }
  }

  async function activate() {
    if (!candidate) return;
    setActivating(true);
    setError(null);
    try {
      const result = await postJson<{ version: number }>("/api/policy/activate", { policy: candidate, source_text: editing ? text : compiledText });
      setActivated(result.version);
      setCompiled(null);
      setDraft(null);
      setJsonText(null);
      await Promise.all([active.reload(), versions.reload()]);
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setActivating(false);
    }
  }

  const activeStamp = active.data ? (
    <p className="stamp">
      <b>Version {active.data.version} is active</b>
      since {formatDateTime(active.data.created_at)}
    </p>
  ) : !active.loading ? (
    <p className="stamp">
      <b>No policy is active</b>
      Every payment is blocked until you activate one.
    </p>
  ) : null;

  const why = editing ? (parsed?.problem ? "Fix the JSON to activate." : "Ready to activate.") : !compiled ? "Compile your rules first." : stale ? "The rules changed. Compile again." : "Ready to activate.";

  return (
    <>
      <PageHeader title="Policy" description="Write what your agent may spend in plain English. Paycurb reads it back as strict limits, and nothing changes until you activate." />

      {active.error && active.status !== 404 && !active.data && !active.loading && <ErrorState title="The active policy did not load" message={active.error} onRetry={active.reload} />}

      <Setting id="rules-title" title="Your rules" note="Say limits in dollars, name the merchants you trust, and say what needs your approval." aside={activeStamp}>
        <div className="panel panel-pad">
          <label htmlFor="rules" className="field-label">
            Rules in plain English
          </label>
          {active.loading ? (
            <Skeleton style={{ height: 144 }} />
          ) : (
            <textarea id="rules" rows={5} className="textarea" placeholder={example} value={text} onChange={(event) => setDraft(event.target.value)} />
          )}
          <div className="toolbar">
            <button type="button" className={candidate ? "btn" : "btn btn-primary"} onClick={compile} disabled={compiling || text.trim().length === 0}>
              {compiling ? "Compiling" : "Compile"}
            </button>
            {draft !== null && active.data && (
              <button type="button" className="btn btn-quiet" onClick={() => setDraft(null)} disabled={compiling}>
                Revert to active
              </button>
            )}
            <span className="grow" />
            {!editing && (
              <button type="button" className="link-btn" onClick={openJson}>
                Edit the JSON instead
              </button>
            )}
          </div>
          {noModel && (
            <p role="alert" className="notice" style={{ marginTop: 16, color: "var(--ink)", fontWeight: 500 }}>
              <AlertIcon size={16} style={{ color: "var(--held-ink)", flex: "none" }} />
              {NO_MODEL}
            </p>
          )}
          {error && (
            <p role="alert" className="notice" style={{ marginTop: 16, color: "var(--block-ink)" }}>
              <AlertIcon size={16} style={{ flex: "none" }} />
              {error}
            </p>
          )}
        </div>
      </Setting>

      <Setting
        id="enforce-title"
        title="What Paycurb will enforce"
        note={editing ? "The JSON is checked against the policy schema when you activate." : compiled ? "Read this back before you activate. Any question below means a strict default was used." :"The rules in force now. Compile to see what a change would do."}
      >
        <div className="panel panel-pad" aria-busy={compiling}>
          {compiled && compiled.questions.length > 0 && !editing && (
            <ul className="questions" role="alert">
              {compiled.questions.map((question) => (
                <li key={question}>
                  <span className="status status-held">Question</span>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          )}
          {stale && !editing && (
            <p role="status" className="notice" style={{ marginBottom: 16, color: "var(--held-ink)" }}>
              <AlertIcon size={16} />
              The rules changed since this compile. Compile again before activating.
            </p>
          )}
          {compiling ? (
            <div role="status" style={{ display: "grid", gap: 16 }}>
              <span className="sr-only">Compiling your rules</span>
              <Skeleton style={{ height: 200 }} />
            </div>
          ) : (
            <>
              <h3 className="field-label">{compiled && !editing ? "Read back" : `Active v${active.data?.version ?? ""}`.trim()}</h3>
              {compiled && !editing ? (
                <ReadBack lines={compiled.readback} />
              ) : active.data ? (
                <ReadBack lines={policyLines(active.data.policy)} />
              ) : (
                <p className="muted">No policy is active yet.</p>
              )}
              {editing ? (
                <div style={{ marginTop: 16 }}>
                  <label htmlFor="policy-json" className="field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <PencilIcon size={14} />
                    Policy JSON
                  </label>
                  <textarea id="policy-json" className="textarea json-editor" spellCheck={false} value={jsonText} onChange={(event) => setJsonText(event.target.value)} aria-describedby="json-check" />
                  <p id="json-check" className="small" style={{ marginTop: 8, color: parsed?.problem ? "var(--block-ink)" : "var(--muted)" }}>
                    {parsed?.problem ?? "Valid JSON. Missing keys get the strict defaults."}
                  </p>
                </div>
              ) : (
                <details className="json-toggle">
                  <summary>
                    <ChevronRightIcon size={16} />
                    View as JSON
                  </summary>
                  <JsonBlock value={compiled?.policy ?? active.data?.policy ?? {}} label="Policy JSON" />
                </details>
              )}
            </>
          )}
          {active.data && candidate && (
            <div style={{ marginTop: 20 }}>
              <h3 className="field-label">Changes from active v{active.data.version}</h3>
              <ChangeTable before={active.data.policy} after={candidate} beforeLabel={`Active v${active.data.version}`} afterLabel="New" />
            </div>
          )}
          <div className="toolbar" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--rule)" }}>
            <p className="muted grow" role="status">
              {activated !== null ? (
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                  <CheckIcon size={16} style={{ display: "inline", verticalAlign: "-3px", marginRight: 6, color: "var(--accent)" }} />
                  Version {activated} is active. New payment calls are checked against it.
                </span>
              ) : (
                why
              )}
            </p>
            {(compiled || editing) && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  setCompiled(null);
                  setJsonText(null);
                }}
                disabled={activating}
              >
                Discard
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={activate} disabled={activating || !candidate}>
              {activating ? "Activating" : "Activate"}
            </button>
          </div>
        </div>
      </Setting>

      <Setting
        id="history-title"
        title="Version history"
        note="Every policy you activated, newest first. Open one to see its rules and how it differs from the active one."
        aside={versions.data?.length ? <p className="stamp">{versions.data.length} versions, the first on {dayLabel(versions.data.reduce((first, entry) => (entry.created_at < first ? entry.created_at : first), versions.data[0].created_at))}</p> : null}
      >
        <VersionHistory versions={versions.data} active={active.data} error={versions.error} onRetry={versions.reload} />
      </Setting>
    </>
  );
}

function ReadBack({ lines }: { lines: string[] }) {
  return (
    <ul className="readback">
      {lines.map((line) => (
        <li key={line}>
          <CheckIcon size={15} />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
