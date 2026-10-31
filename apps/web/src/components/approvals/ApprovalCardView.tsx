"use client";

import { useState } from "react";
import { errorText, postJson } from "@/lib/api";
import { countdown, dollars, formatDateTime, merchantName, secondsLeft } from "@/lib/format";
import type { ApprovalCard } from "@/lib/types";
import { LineItems } from "../feed/DecisionDrawer";
import { AlertIcon, CheckIcon, ClockIcon, StopIcon, XIcon } from "../icons";

const statusWords: Record<ApprovalCard["status"], string> = {
  pending: "Waiting for you",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  executed: "Executed",
};

function executionTone(status: string) {
  const value = status.toUpperCase();
  if (value === "COMPLETED") return { className: "bg-allow-soft text-allow", Icon: CheckIcon };
  if (["FAILED", "DECLINED", "VOIDED", "DENIED", "ERROR"].includes(value)) return { className: "bg-block-soft text-block", Icon: StopIcon };
  return { className: "bg-surface-3 text-fg", Icon: ClockIcon };
}

function Expiry({ expiresAt, nowMs }: { expiresAt: string; nowMs: number }) {
  const left = secondsLeft(expiresAt, nowMs);
  const urgent = left < 120;
  return (
    <p className={`flex items-center gap-1.5 text-sm font-semibold num ${urgent ? "text-block" : "text-escalate"}`}>
      <ClockIcon size={15} />
      {left > 0 ? <span>Expires in {countdown(left)}</span> : <span>Expired</span>}
    </p>
  );
}

function Outcome({ card }: { card: ApprovalCard }) {
  if (card.status === "pending") return null;
  const execution = card.execution;
  const tone = execution ? executionTone(execution.status) : null;
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm" role="status">
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
        <dt className="text-muted">Request status</dt>
        <dd className="font-semibold">{statusWords[card.status] ?? card.status}</dd>
        {execution && tone && (
          <>
            <dt className="text-muted">Execution status</dt>
            <dd>
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[13px] font-semibold ${tone.className}`}>
                <tone.Icon size={13} strokeWidth={2.5} />
                {execution.status}
              </span>
            </dd>
            <dt className="text-muted">PayPal reference</dt>
            <dd className="font-mono text-[13px] break-all">{execution.paypal_ref ?? "None returned"}</dd>
          </>
        )}
      </dl>
      {card.status === "approved" && !execution && <p className="mt-2 text-muted">The proxy has not reported an execution yet.</p>}
    </div>
  );
}

export function ApprovalCardView({ card, nowMs, onChange }: { card: ApprovalCard; nowMs: number; onChange: (card: ApprovalCard) => void }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const expired = secondsLeft(card.expires_at, nowMs) === 0;
  const canDecide = card.status === "pending" && !expired && busy === null;
  const name = merchantName(card.merchant_id, card.merchant_name);

  async function decide(choice: "approve" | "reject") {
    setBusy(choice);
    setError(null);
    try {
      onChange(await postJson<ApprovalCard>(`/api/approvals/${encodeURIComponent(card.id)}/${choice}`));
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="card animate-enter flex flex-col overflow-hidden" aria-labelledby={`approval-${card.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5">
        <div className="min-w-0">
          <p className="eyebrow">Approval request</p>
          <h2 id={`approval-${card.id}`} className="mt-1 truncate text-lg font-bold">
            {name}
          </h2>
          <p className="mt-0.5 text-xs text-muted">Requested {formatDateTime(card.created_at)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight num">{dollars(card.amount_cents)}</p>
          {card.status === "pending" && <Expiry expiresAt={card.expires_at} nowMs={nowMs} />}
        </div>
      </div>
      <div className="flex-1 space-y-4 p-5">
        <div className="flex items-start gap-3 rounded-lg bg-escalate-soft p-3 text-sm">
          <ClockIcon size={16} className="mt-0.5 shrink-0 text-escalate" />
          <p>
            <span className="mr-2 rounded bg-surface px-1.5 py-0.5 font-mono text-xs font-semibold">{card.rule_id}</span>
            {card.reason}
          </p>
        </div>
        {card.line_items.length > 0 ? (
          <LineItems items={card.line_items} />
        ) : (
          <p className="text-sm text-muted">This request has no line items. Check the amount and merchant before approving.</p>
        )}
        <Outcome card={card} />
        {error && (
          <p role="alert" className="flex items-center gap-2 text-sm text-block">
            <AlertIcon size={15} className="shrink-0" />
            {error}
          </p>
        )}
      </div>
      {card.status === "pending" && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
          <button type="button" className="btn-danger" disabled={!canDecide} onClick={() => decide("reject")}>
            <XIcon size={15} />
            {busy === "reject" ? "Rejecting..." : "Reject"}
          </button>
          <button type="button" className="btn-success" disabled={!canDecide} onClick={() => decide("approve")}>
            <CheckIcon size={15} />
            {busy === "approve" ? "Approving..." : `Approve ${dollars(card.amount_cents)}`}
          </button>
        </div>
      )}
    </article>
  );
}
