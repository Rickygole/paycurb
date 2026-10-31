"use client";

import { useState } from "react";
import { errorText, postJson } from "@/lib/api";
import { askForStats } from "@/lib/motion";
import { clock, countdown, dollars, merchantName, plainReason, secondsLeft } from "@/lib/format";
import type { ApprovalCard } from "@/lib/types";
import { LineItems } from "../feed/DecisionDrawer";
import { AlertIcon, CheckIcon, ClockIcon, XIcon } from "../icons";

const statusWords: Record<ApprovalCard["status"], string> = {
  pending: "Waiting for you",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  executed: "Executed",
};

const FAILED = ["FAILED", "DECLINED", "VOIDED", "DENIED", "ERROR"];

export function executionTone(status: string | undefined) {
  const value = (status ?? "").toUpperCase();
  if (value === "COMPLETED") return "status-allow";
  if (FAILED.includes(value)) return "status-block";
  return "";
}

function Expiry({ expiresAt, nowMs }: { expiresAt: string; nowMs: number }) {
  const left = secondsLeft(expiresAt, nowMs);
  return (
    <p className="expiry" data-urgent={left < 120}>
      <ClockIcon size={16} />
      {left > 0 ? (
        <span>
          Expires in <b className="num">{countdown(left)}</b>
        </span>
      ) : (
        <span>Expired</span>
      )}
    </p>
  );
}

function Outcome({ card }: { card: ApprovalCard }) {
  const execution = card.execution;
  const rejected = card.status === "rejected" || card.status === "expired";
  const value = execution?.status.toUpperCase() ?? "";
  const failed = FAILED.includes(value);
  const tone = failed ? "block" : value === "COMPLETED" ? "allow" : "neutral";
  return (
    <div className="outcome" role="status">
      <span key={tone} className="burst" data-tone={tone}>
        {rejected || failed ? <XIcon size={20} strokeWidth={2.5} /> : <CheckIcon size={20} strokeWidth={2.5} />}
      </span>
      <dl>
        <dt>Request</dt>
        <dd>{statusWords[card.status] ?? card.status}</dd>
        {execution ? (
          <>
            <dt>Execution status</dt>
            <dd>
              <span className={`status ${executionTone(execution.status)}`}>{execution.status}</span>
            </dd>
            <dt>PayPal reference</dt>
            <dd>{execution.paypal_ref ? <span className="mono">{execution.paypal_ref}</span> : <span className="muted">None returned</span>}</dd>
          </>
        ) : card.status === "approved" ? (
          <>
            <dt>Execution status</dt>
            <dd className="muted">The proxy has not reported one yet</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

export function ApprovalCardView({ card, nowMs, index, onChange }: { card: ApprovalCard; nowMs: number; index: number; onChange: (card: ApprovalCard) => void }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const expired = secondsLeft(card.expires_at, nowMs) === 0;
  const canDecide = card.status === "pending" && !expired && busy === null;
  const name = merchantName(card.merchant_id, card.merchant_name);
  const titleId = `approval-${card.id}`;

  async function decide(choice: "approve" | "reject") {
    setBusy(choice);
    setError(null);
    try {
      onChange(await postJson<ApprovalCard>(`/api/approvals/${encodeURIComponent(card.id)}/${choice}`));
      askForStats();
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="panel held rise" style={{ "--i": index } as React.CSSProperties} aria-labelledby={titleId}>
      <header className="held-head">
        <div style={{ minWidth: 0 }}>
          <h2 id={titleId}>{name}</h2>
          <p className="muted">
            Held by rule {card.rule_id} at <span className="num">{clock(card.created_at)}</span>
          </p>
        </div>
        <p className="held-amount num">{dollars(card.amount_cents)}</p>
      </header>
      <p style={{ fontWeight: 500 }}>{plainReason({ tool: "create_order", decision: "escalate", reason: card.reason })}</p>
      {card.line_items.length > 0 ? (
        <LineItems items={card.line_items} />
      ) : (
        <p className="muted">No line items came with this request. Check the merchant and the amount before you approve.</p>
      )}
      {card.status !== "pending" && <Outcome card={card} />}
      {error && (
        <p role="alert" className="notice" style={{ color: "var(--block-ink)" }}>
          <AlertIcon size={16} />
          {error}
        </p>
      )}
      {card.status === "pending" && (
        <footer className="held-foot">
          <Expiry expiresAt={card.expires_at} nowMs={nowMs} />
          <div className="held-actions">
            <button type="button" className="btn btn-outline" disabled={!canDecide} onClick={() => decide("reject")}>
              {busy === "reject" ? "Rejecting" : "Reject"}
            </button>
            <button type="button" className="btn btn-primary" disabled={!canDecide} onClick={() => decide("approve")}>
              <CheckIcon size={16} />
              {busy === "approve" ? "Approving" : `Approve ${dollars(card.amount_cents)}`}
            </button>
          </div>
        </footer>
      )}
    </article>
  );
}
