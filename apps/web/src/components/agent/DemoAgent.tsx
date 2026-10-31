"use client";

import { useEffect, useRef, useState } from "react";
import { runAgent } from "@/lib/agentRun";
import { errorText, postJson } from "@/lib/api";
import type { AgentEvent } from "@/lib/types";
import { BotIcon, CheckIcon, RefreshIcon, SendIcon, StopIcon } from "../icons";
import { Page, PageHeader } from "../Shell";
import { EmptyState } from "../states";
import { TranscriptItem, type Entry } from "./TranscriptItem";

const presets = [
  { id: "normal", label: "Normal purchase", hint: "Desk organizer and pens from a trusted merchant", task: "Normal purchase preset" },
  { id: "approval", label: "Needs approval", hint: "Two desk lamps, over the auto approve line", task: "Needs approval preset" },
  { id: "injection", label: "Injection attack", hint: "A merchant page tells the agent to buy a watch", task: "Injection attack preset" },
] as const;

export function DemoAgent() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const counter = useRef(0);
  const runCount = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [entries.length]);

  useEffect(() => () => abort.current?.abort(), []);

  function push(run: number, item: AgentEvent | { type: "task"; text: string } | { type: "error"; text: string }) {
    counter.current += 1;
    const entry = { ...item, id: counter.current, run } as Entry;
    setEntries((current) => [...current, entry]);
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
      setNotice({ tone: "ok", text: "Demo reset to the starting state. Budgets, approvals and the feed are back to the seed data." });
    } catch (problem) {
      setNotice({ tone: "error", text: errorText(problem) });
    } finally {
      setResetting(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Demo Agent"
        description="A shopping agent that pays only through Paycurb. Watch each tool call and the firewall decision that answers it."
        actions={
          <button type="button" className="btn-secondary" onClick={reset} disabled={resetting}>
            <RefreshIcon size={15} />
            {resetting ? "Resetting..." : "Reset demo"}
          </button>
        }
      />
      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${notice.tone === "ok" ? "bg-allow-soft text-allow" : "bg-block-soft text-block"}`}
        >
          {notice.tone === "ok" ? <CheckIcon size={15} /> : <StopIcon size={15} />}
          {notice.text}
        </p>
      )}
      <section aria-label="Agent chat" className="card flex h-[max(480px,calc(100dvh-180px))] flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {entries.length === 0 ? (
            <EmptyState title="No runs yet" icon={<BotIcon size={28} />}>
              Pick a preset below or type a shopping task. The agent has no PayPal credentials, so every payment goes through the firewall.
            </EmptyState>
          ) : (
            <ol className="space-y-3" aria-live="polite">
              {entries.map((entry) => (
                <TranscriptItem key={entry.id} entry={entry} />
              ))}
            </ol>
          )}
          {running && (
            <p role="status" className="mt-3 ml-10 flex items-center gap-2 text-sm text-muted">
              <span className="flex gap-1" aria-hidden="true">
                <span className="animate-skeleton h-1.5 w-1.5 rounded-full bg-muted" />
                <span className="animate-skeleton h-1.5 w-1.5 rounded-full bg-muted [animation-delay:200ms]" />
                <span className="animate-skeleton h-1.5 w-1.5 rounded-full bg-muted [animation-delay:400ms]" />
              </span>
              Agent is working
            </p>
          )}
          <div ref={end} />
        </div>
        <div className="space-y-3 border-t border-line bg-surface-2 p-4">
          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Preset tasks">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={running}
                onClick={() => start({ preset: preset.id }, preset.task)}
                className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-left transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="block text-sm font-semibold">{preset.label}</span>
                <span className="block text-xs text-muted">{preset.hint}</span>
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex gap-2">
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
              <button type="button" className="btn-danger" onClick={() => abort.current?.abort()}>
                <StopIcon size={15} />
                Stop
              </button>
            ) : (
              <button type="submit" className="btn-primary" disabled={task.trim().length === 0}>
                <SendIcon size={15} />
                Run
              </button>
            )}
          </form>
        </div>
      </section>
    </Page>
  );
}
