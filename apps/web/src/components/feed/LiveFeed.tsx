"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorText, useApi } from "@/lib/api";
import { useEventStream, type StreamStatus } from "@/lib/stream";
import type { Feed, Stats } from "@/lib/types";
import { ActivityIcon } from "../icons";
import { Page, PageHeader } from "../Shell";
import { EmptyState, ErrorState, LoadingBlock } from "../states";
import { DecisionCard } from "./DecisionCard";
import { DecisionDrawer } from "./DecisionDrawer";
import { StatsStrip } from "./StatsStrip";

const KEEP = 200;

function merge(current: Feed[], incoming: Feed[]) {
  const seen = new Set(current.map((item) => item.id));
  const added = incoming.filter((item) => !seen.has(item.id));
  if (added.length === 0) return current;
  return [...added, ...current].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, KEEP);
}

function ConnectionPill({ status }: { status: StreamStatus }) {
  const live = status === "live";
  return (
    <span role="status" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
      <span className={`h-2 w-2 rounded-full ${live ? "bg-allow" : "bg-escalate"}`} aria-hidden="true" />
      {live ? "Live" : status === "connecting" ? "Connecting, polling every 2 seconds" : "Stream offline, polling every 2 seconds"}
    </span>
  );
}

export function LiveFeed() {
  const stats = useApi<Stats>("/api/stats", 5000);
  const [items, setItems] = useState<Feed[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Feed | null>(null);
  const reloadStats = stats.reload;

  const fetchLatest = useCallback(
    (markFresh: boolean) =>
      api<Feed[]>("/api/decisions?limit=50").then(
        (list) => {
          setError(null);
          setItems((current) => {
            if (!current) return list;
            if (markFresh) {
              const known = new Set(current.map((item) => item.id));
              const added = list.filter((item) => !known.has(item.id)).map((item) => item.id);
              if (added.length) setFresh((previous) => new Set([...previous, ...added]));
            }
            return merge(current, list);
          });
        },
        (problem) => setError(errorText(problem)),
      ),
    [],
  );

  const status = useEventStream(["decision"], (_name, data) => {
    const item = data as Feed;
    if (!item || !item.id) return;
    setFresh((previous) => new Set(previous).add(item.id));
    setItems((current) => merge(current ?? [], [item]));
    reloadStats();
  });

  useEffect(() => {
    fetchLatest(false);
  }, [fetchLatest]);

  useEffect(() => {
    if (status === "live") return;
    const timer = setInterval(() => {
      fetchLatest(true);
      reloadStats();
    }, 2000);
    return () => clearInterval(timer);
  }, [status, fetchLatest, reloadStats]);

  return (
    <Page>
      <PageHeader
        title="Live Feed"
        description="Every payment call your agent makes, decided by the policy engine before anything reaches PayPal."
        actions={<ConnectionPill status={status} />}
      />
      <StatsStrip stats={stats.data} error={stats.error} onRetry={stats.reload} />
      <section aria-labelledby="decisions-heading" className="mt-8">
        <h2 id="decisions-heading" className="mb-3 text-sm font-semibold text-muted">
          Recent decisions
        </h2>
        {items === null && !error && <LoadingBlock label="Loading decisions" rows={5} />}
        {items === null && error && <ErrorState title="Could not load decisions" message={error} onRetry={() => fetchLatest(false)} />}
        {items !== null && error && (
          <p role="status" className="mb-3 text-xs text-block">
            Updates paused: {error}
          </p>
        )}
        {items !== null && items.length === 0 && (
          <EmptyState title="No payment calls yet" icon={<ActivityIcon size={28} />}>
            When your agent tries to pay for something, the decision shows up here within a second. Try a preset on the Demo Agent page.
          </EmptyState>
        )}
        {items !== null && items.length > 0 && (
          <ol className="space-y-2.5" aria-live="polite" aria-relevant="additions">
            {items.map((item) => (
              <DecisionCard key={item.id} item={item} fresh={fresh.has(item.id)} onOpen={setOpen} />
            ))}
          </ol>
        )}
      </section>
      <DecisionDrawer item={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
