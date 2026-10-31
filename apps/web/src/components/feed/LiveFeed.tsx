"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, errorText, useApi } from "@/lib/api";
import { useEventStream } from "@/lib/stream";
import type { Feed, Stats } from "@/lib/types";
import { useLast } from "../Drawer";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { DecisionCard } from "./DecisionCard";
import { DecisionDrawer } from "./DecisionDrawer";
import { Gate } from "./Gate";
import { StatsStrip } from "./StatsStrip";

const KEEP = 200;
const SHOWN = 50;

function merge(current: Feed[], incoming: Feed[]) {
  const seen = new Set(current.map((item) => item.id));
  const added = incoming.filter((item) => !seen.has(item.id));
  if (added.length === 0) return current;
  return [...added, ...current].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, KEEP);
}

function RowSkeletons() {
  return (
    <ol aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <li key={index}>
          <div className="drow" style={{ cursor: "default" }}>
            <Skeleton style={{ height: 24, width: 96, borderRadius: 999 }} />
            <span className="drow-main" style={{ gap: 8 }}>
              <Skeleton style={{ height: 14, width: `${70 - index * 6}%` }} />
              <Skeleton style={{ height: 12, width: 160 }} />
            </span>
            <Skeleton style={{ height: 12, width: 150 }} />
            <span className="drow-end" style={{ gap: 8 }}>
              <Skeleton style={{ height: 14, width: 72 }} />
              <Skeleton style={{ height: 12, width: 110 }} />
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function LiveFeed() {
  const stats = useApi<Stats>("/api/stats", 5000);
  const [items, setItems] = useState<Feed[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Feed | null>(null);
  const shown = useLast(open);
  const reloadStats = stats.reload;

  const fetchLatest = useCallback(
    (markFresh: boolean) =>
      api<Feed[]>(`/api/decisions?limit=${SHOWN}`).then(
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

  const list = items?.slice(0, SHOWN) ?? null;

  return (
    <>
      <Gate items={list} status={status} policyVersion={list?.[0]?.policy_version ?? null} />
      <StatsStrip stats={stats.data} error={stats.error} onRetry={stats.reload} />
      <section className="panel decisions" aria-labelledby="decisions-heading" aria-busy={items === null && !error}>
        <header className="panel-head">
          <h2 id="decisions-heading">What your agent tried</h2>
          <p className="small muted wide-only">{list && list.length > 0 ? `Newest first, last ${list.length}. Select a row for the full record.` : "Newest first"}</p>
        </header>
        {items === null && !error && <RowSkeletons />}
        {items === null && error && (
          <div className="panel-pad">
            <ErrorState title="The decisions did not load" message={error} onRetry={() => fetchLatest(false)} />
          </div>
        )}
        {items !== null && error && (
          <p role="status" className="small" style={{ padding: "10px 20px", color: "var(--block-ink)", borderBottom: "1px solid var(--rule)" }}>
            Updates paused: {error}
          </p>
        )}
        {list !== null && list.length === 0 && (
          <div className="panel-pad">
            <EmptyState title="Nothing has tried to buy anything yet">
              When your agent tries to pay, the decision lands here within a second. <Link href="/agent" className="link-btn">Run the agent</Link> to see one.
            </EmptyState>
          </div>
        )}
        {list !== null && list.length > 0 && (
          <ol aria-live="polite" aria-relevant="additions">
            {list.map((item, index) => (
              <DecisionCard key={item.id} item={item} index={index} fresh={fresh.has(item.id)} onOpen={setOpen} />
            ))}
          </ol>
        )}
        {list !== null && list.length > 0 && list.length < SHOWN && (
          <p className="feed-end muted">
            Nothing else yet. <Link href="/agent" className="link-btn">Run the agent</Link> to see more decisions.
          </p>
        )}
      </section>
      <DecisionDrawer item={shown} open={open !== null} onClose={() => setOpen(null)} />
    </>
  );
}
