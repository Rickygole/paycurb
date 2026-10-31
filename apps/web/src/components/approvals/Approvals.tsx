"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import { dollars, formatDateTime, merchantName } from "@/lib/format";
import { useEventStream } from "@/lib/stream";
import type { ApprovalCard } from "@/lib/types";
import { InboxIcon } from "../icons";
import { Page, PageHeader } from "../Shell";
import { EmptyState, ErrorState, LoadingBlock } from "../states";
import { ApprovalCardView } from "./ApprovalCardView";

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const historyWords: Record<ApprovalCard["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  executed: "Executed",
};

export function Approvals() {
  const all = useApi<ApprovalCard[]>("/api/approvals", 3000);
  const [touched, setTouched] = useState<string[]>([]);
  const now = useNow();
  const setAll = all.setData;

  function replace(card: ApprovalCard) {
    setAll((current) => {
      if (!current) return [card];
      const exists = current.some((item) => item.id === card.id);
      return exists ? current.map((item) => (item.id === card.id ? card : item)) : [card, ...current];
    });
  }

  useEventStream(["approval"], (_name, data) => {
    const card = data as ApprovalCard;
    if (card && card.id) replace(card);
  });

  function acted(card: ApprovalCard) {
    setTouched((current) => (current.includes(card.id) ? current : [card.id, ...current]));
    replace(card);
  }

  const list = all.data ?? [];
  const active = list
    .filter((card) => card.status === "pending" || touched.includes(card.id))
    .sort((a, b) => a.expires_at.localeCompare(b.expires_at));
  const history = list.filter((card) => card.status !== "pending" && !touched.includes(card.id)).slice(0, 25);
  const waiting = active.filter((card) => card.status === "pending").length;

  return (
    <Page>
      <PageHeader
        title="Approvals"
        description="Purchases the policy sent to you. Nothing is paid until you approve, and the agent must repeat the exact same order."
        actions={
          waiting > 0 ? (
            <span className="rounded-full bg-escalate-soft px-3 py-1 text-xs font-semibold text-escalate num">{waiting} waiting</span>
          ) : undefined
        }
      />
      {all.loading && <LoadingBlock label="Loading approvals" rows={2} />}
      {!all.loading && all.error && !all.data && <ErrorState title="Could not load approvals" message={all.error} onRetry={all.reload} />}
      {all.data && (
        <>
          {all.error && (
            <p role="status" className="mb-3 text-xs text-block">
              Updates paused: {all.error}
            </p>
          )}
          {active.length === 0 ? (
            <EmptyState title="Nothing needs your approval" icon={<InboxIcon size={28} />}>
              When a purchase is over the auto approve line, at a new merchant, or looks like a repeat, it waits here for you.
            </EmptyState>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {active.map((card) => (
                <ApprovalCardView key={card.id} card={card} nowMs={now} onChange={acted} />
              ))}
            </div>
          )}
          <section aria-labelledby="history-heading" className="mt-10">
            <h2 id="history-heading" className="mb-3 text-sm font-semibold text-muted">
              Recently decided
            </h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted">No decided requests yet.</p>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th scope="col" className="px-4 py-2.5 font-medium">Requested</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Merchant</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Amount</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Rule</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Execution</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">PayPal ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((card) => (
                      <tr key={card.id} className="border-b border-line last:border-b-0">
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted num">{formatDateTime(card.created_at)}</td>
                        <td className="px-4 py-2.5">{merchantName(card.merchant_id, card.merchant_name)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold num">{dollars(card.amount_cents)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{card.rule_id}</td>
                        <td className="px-4 py-2.5">{historyWords[card.status] ?? card.status}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{card.execution?.status ?? "None"}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{card.execution?.paypal_ref ?? "None"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </Page>
  );
}
