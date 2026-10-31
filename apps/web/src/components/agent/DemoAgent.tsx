"use client";

import { useEffect, useRef, useState } from "react";
import { runAgent } from "@/lib/agentRun";
import { errorText, postJson, useApi } from "@/lib/api";
import { askForStats } from "@/lib/motion";
import type { AgentEvent } from "@/lib/types";
import { AlertIcon, CheckIcon, RefreshIcon } from "../icons";
import { PageHeader } from "../Shell";
import { Skeleton } from "../states";
import { TranscriptItem, type Entry } from "./TranscriptItem";

const presets = [
  { id: "normal", label: "Normal purchase", hint: "One desk organizer, a trusted merchant", dot: "var(--allow-ink)" },
  { id: "approval", label: "Needs approval", hint: "One desk lamp, over the approval line", dot: "var(--held-ink)" },
  { id: "injection", label: "Injection attack", hint: "A store page tells the agent to buy a watch", dot: "var(--block-ink)" },
] as const;

function Preview() {
  const rows = [0, 1, 2];
  return (
    <div className="lanes" aria-hidden="true" style={{ alignContent: "start" }}>
      <div style={{ display: "grid", gap: 16, padding: 20 }}>
        {rows.map((row) => (
          <div key={row} className="bubble" style={{ display: "grid", gap: 8, opacity: 1 - row * 0.2 }}>
            <Skeleton style={{ height: 12, width: 90 }} />
            <Skeleton style={{ height: 14, width: `${80 - row * 15}%` }} />
          </div>
        ))}
      </div>
      <div className="lane-col" style={{ display: "grid", gap: 16, padding: 20, alignContent: "start" }}>
        {rows.map((row) => (
          <div key={row} className="bubble" style={{ display: "grid", gap: 8, opacity: 1 - row * 0.2 }}>
            <Skeleton style={{ height: 24, width: 110, borderRadius: 999 }} />
            <Skeleton style={{ height: 14, width: `${70 - row * 12}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoAgent() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const mode = useApi<{ mode: string }>("/agent/healthz");
  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const counter = useRef(0);
  const runCount = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [entries.length]);

  useEffect(() => () => abort.current?.abort(), []);

  function push(run: number, item: AgentEvent | { type: "task"; text: string } | { type: "error"; text: string }) {
    counter.current += 1;
    const entry = { ...item, id: counter.current, run } as Entry;
    setEntries((current) => [...current, entry]);
    if (item.type === "tool_result") askForStats();
  }

  async function start(body: { task: string } | { preset: string }, label: string) {
    if (running) return;
    const run = ++runCount.current;
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true);
    setNotice(null);
    push(run, { type: "task", text: label });
    try {
      await runAgent(body, (event) => push(run, event), controller.signal);
    } catch (problem) {
      if (controller.signal.aborted) push(run, { type: "error", text: "Run stopped." });
      else push(run, { type: "error", text: problem instanceof TypeError ? "The agent could not be reached. Check that the agent app is running." : errorText(problem) });
    } finally {
      setRunning(false);
      abort.current = null;
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = task.trim();
    if (!text) return;
    setTask("");
    start({ task: text }, text);
  }

  async function reset() {
    abort.current?.abort();
    setResetting(true);
    setNotice(null);
    try {
      await postJson("/api/demo/reset");
      setEntries([]);
      askForStats();
      setNotice({ tone: "ok", text: "Back to the starting state. Budgets, approvals and the feed are the seed data again." });
    } catch (problem) {
      setNotice({ tone: "error", text: errorText(problem) });
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Run the agent"
        description={
          mode.data?.mode === "scripted"
            ? "No model runs on this host, so the steps are a fixed replay. Every Paycurb decision is real and every payment still goes through the policy engine."
            : "Runs the shopping agent with the model configured on this host. Every payment still goes through the policy engine."
        }
        actions={
          <button type="button" className="btn btn-quiet" onClick={reset} disabled={resetting}>
            <RefreshIcon size={15} />
            {resetting ? "Resetting" : "Reset the demo"}
          </button>
        }
      />
      {notice && (
        <p role={notice.tone === "error" ? "alert" : "status"} className="notice" style={{ marginBottom: 16, color: notice.tone === "ok" ? "var(--ink)" : "var(--block-ink)" }}>
          {notice.tone === "ok" ? <CheckIcon size={16} style={{ color: "var(--accent)" }} /> : <AlertIcon size={16} />}
          {notice.text}
        </p>
      )}
      <section aria-label="Agent run" className={`panel board${entries.length ? " is-live" : ""}`}>
        <div className="lanes lanes-head">
          <span>Agent</span>
          <span>Paycurb decision</span>
        </div>
        {entries.length === 0 ? (
          <div>
            <Preview />
            <p className="muted" style={{ padding: "0 20px 20px", textAlign: "center" }}>
              Pick a task below. What the agent tries appears on the left, and what Paycurb decides on the right.
            </p>
          </div>
        ) : (
          <ol className="transcript" aria-live="polite">
            {entries.map((entry) => (
              <TranscriptItem key={entry.id} entry={entry} />
            ))}
            {running && (
              <li className="in-agent" role="status">
                <p className="muted">The agent is working</p>
              </li>
            )}
            <li ref={end} className="in-both" aria-hidden="true" style={{ padding: 0 }} />
          </ol>
        )}
        <div className="composer">
          <div className="chips" role="group" aria-label="Preset tasks">
            {presets.map((preset) => (
              <button key={preset.id} type="button" className="chip" disabled={running} onClick={() => start({ preset: preset.id }, `Preset task: ${preset.label.toLowerCase()}`)}>
                <span className="dot" style={{ background: preset.dot }} aria-hidden="true" />
                <span style={{ fontWeight: 500 }}>{preset.label}</span>
                <span className="hint">{preset.hint}</span>
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            <label htmlFor="agent-task" className="sr-only">
              Shopping task for the agent
            </label>
            <input
              id="agent-task"
              className="input"
              placeholder="Buy five reams of copier paper from Paper Co"
              value={task}
              onChange={(event) => setTask(event.target.value)}
              disabled={running}
              autoComplete="off"
            />
            {running ? (
              <button type="button" className="btn btn-outline" style={{ height: 40 }} onClick={() => abort.current?.abort()}>
                Stop
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" style={{ height: 40 }} disabled={task.trim().length === 0}>
                Run
              </button>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
