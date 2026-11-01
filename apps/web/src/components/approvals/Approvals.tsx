"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import { splitApprovals } from "@/lib/approvals";
import { dollars, merchantName, stamp } from "@/lib/format";
import { useEventStream } from "@/lib/stream";
import type { ApprovalCard, Outcome } from "@/lib/types";
import { DecisionBadge } from "../DecisionBadge";
import { PageHeader } from "../Shell";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { ApprovalCardView, DecidedBanner, ExecutionPill } from "./ApprovalCardView";

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const historyWords: Record<ApprovalCard["status"], string> = {
  pending: "Waiting",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  executed: "Executed",
};

const historyTone: Record<ApprovalCard["status"], Outcome | null> = {
  pending: "escalate",
  approved: "allow",
  rejected: "block",
  expired: null,
  executed: "allow",
};

function HeldSkeleton() {
  return (
    <div className="panel held" aria-hidden="true">
      <div className="held-head">
        <Skeleton style={{ height: 20, width: 180 }} />
        <Skeleton style={{ height: 26, width: 96 }} />
      </div>
      <Skeleton style={{ height: 14, width: "60%" }} />
      <Skeleton style={{ height: 72 }} />
      <div className="held-foot">
        <Skeleton style={{ height: 16, width: 140 }} />
        <Skeleton style={{ height: 36, width: 220 }} />
      </div>
    </div>
  );
}

function WhatHappens() {
  return (
    <aside aria-labelledby="approve-steps">
      <h2 id="approve-steps" className="section-title" style={{ fontSize: 16 }}>
        What happens on approve
      </h2>
      <ol className="steps" style={{ marginTop: 8 }}>
        <li>Paycurb records your approval for this exact order, matched by its payload hash.</li>
        <li>The proxy sends the held order to PayPal right away. The status PayPal returns and its reference show on the order.</li>
        <li>The approval is used once. A different merchant, item or amount is a new order and is checked again.</li>
      </ol>
      <p className="small muted" style={{ marginTop: 8 }}>
        Reject, or let the timer run out, and nothing is paid.
      </p>
    </aside>
  );
}

function History({ cards, sending }: { cards: ApprovalCard[]; sending: Record<string, number> }) {
  return (
    <section className="panel" aria-labelledby="history-heading" style={{ marginTop: 48 }}>
      <header className="panel-head">
        <h2 id="history-heading">Recently decided</h2>
        <p className="small muted">{cards.length === 0 ? "None yet" : `Last ${cards.length}`}</p>
      </header>
      {cards.length === 0 ? (
        <p className="panel-pad muted">Orders you approve or reject, and ones that expire, are listed here.</p>
      ) : (
        <div className="history-wrap">
          <table className="history">
            <thead>
              <tr>
                <th scope="col">Merchant</th>
                <th scope="col" className="n">
                  Amount
                </th>
                <th scope="col">Request</th>
                <th scope="col">Execution</th>
                <th scope="col">PayPal reference</th>
                <th scope="col" className="n">
                  Held at
                </th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id}>
                  <td>{merchantName(card.merchant_id, card.merchant_name)}</td>
                  <td className="n num" data-label="Amount">
                    {dollars(card.amount_cents)}
                  </td>
                  {card.id in sending ? (
                    <>
                      <td data-label="Request">
                        <DecisionBadge decision="escalate" label="Executing at PayPal" />
                      </td>
                      <td data-label="Execution">
                        <ExecutionPill status="PENDING" />
                      </td>
                      <td data-label="PayPal reference" className="muted">
                        Waiting for PayPal
                      </td>
                    </>
                  ) : (
                    <>
                      <td data-label="Request">
                        <DecisionBadge decision={historyTone[card.status] ?? null} label={historyWords[card.status] ?? card.status} />
                      </td>
                      <td data-label="Execution">{card.execution ? <ExecutionPill status={card.execution.status} /> : <span className="missing" role="img" aria-label="None" />}</td>
                      <td data-label="PayPal reference">{card.execution?.paypal_ref ? <span className="mono">{card.execution.paypal_ref}</span> : <span className="missing" role="img" aria-label="None" />}</td>
                    </>
                  )}
                  <td className="n num muted" data-label="Held at" title={new Date(card.created_at).toLocaleString()}>
                    {stamp(card.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function Approvals() {
  const all = useApi<ApprovalCard[]>("/api/approvals", 3000);
  const [acted, setActed] = useState<Record<string, number>>({});
  const [sending, setSending] = useState<Record<string, number>>({});
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

  function decided(card: ApprovalCard) {
    setActed((current) => ({ ...current, [card.id]: Date.now() }));
    replace(card);
    all.reload();
  }

  function markSending(id: string, on: boolean) {
    setSending((current) => {
      const next = { ...current };
      if (on) next[id] = Date.now();
      else delete next[id];
      return next;
    });
  }

  const { active, confirming, history, waiting, lapsed } = splitApprovals(all.data ?? [], acted, now, sending);
  const paying = Object.keys(sending).length > 0;
  const settling = paying || confirming.length > 0;

  function headline() {
    if (!all.data) return "Orders the policy held for you. Nothing is paid until you approve.";
    if (waiting > 0) return `${waiting} held ${waiting === 1 ? "order is" : "orders are"} waiting. Nothing is paid until you approve.`;
    if (paying) return "Sending the approved order to PayPal.";
    if (confirming.length > 0) return "Decided just now. Nothing else is waiting.";
    return `Nothing is waiting.${lapsed > 0 ? ` ${lapsed} expired unanswered and nothing was paid.` : ""} Orders over your approval line, from a new merchant, or repeats land here.`;
  }

  return (
    <>
      <PageHeader title="Approvals" description={headline()} />
      <div className="split">
        <div className="stack">
          <div role="status" className="stack confirmations">
            {confirming.map((card) => (
              <DecidedBanner key={card.id} card={card} />
            ))}
          </div>
          {all.loading && (
            <div role="status" className="stack">
              <span className="sr-only">Loading held orders</span>
              <HeldSkeleton />
              <HeldSkeleton />
            </div>
          )}
          {!all.loading && all.error && !all.data && <ErrorState title="Held orders did not load" message={all.error} onRetry={all.reload} />}
          {all.data && all.error && (
            <p role="status" className="small" style={{ color: "var(--block-ink)" }}>
              Updates paused: {all.error}
            </p>
          )}
          {all.data && active.length === 0 && !settling && (
            <EmptyState
              title="No orders are waiting for you"
              action={
                <Link href="/policy" className="btn btn-sm">
                  Review your approval line
                </Link>
              }
            >
              When your policy holds an order, it shows up here with the exact items, the amount and a timer.
            </EmptyState>
          )}
          {active.map((card, index) => (
            <ApprovalCardView key={card.id} card={card} index={index} nowMs={now} onChange={decided} onSending={markSending} />
          ))}
          {all.data && <History cards={history} sending={sending} />}
        </div>
        <WhatHappens />
      </div>
    </>
  );
}
