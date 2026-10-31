import { evaluate, fingerprint, type Action, type Decision, type Past, type Policy } from "@paycurb/engine";

export interface ShadowApproval {
  id: string;
  payload_hash: string;
  amount_cents: number;
  status: "pending" | "approved" | "rejected" | "executed";
  expires_at_ms: number;
}

interface Purchase {
  amount_cents: number;
  refunded_cents: number;
}

export interface Reference {
  approvalId: string | null;
  captureId: string | null;
}

const block = (rule_id: string, reason: string): Decision => ({ decision: "block", rule_id, reason });

export class Shadow {
  private history: Past[] = [];
  private spentCents = 0;
  private approvals: ShadowApproval[] = [];
  private purchases = new Map<string, Purchase>();

  constructor(private policy: Policy) {}

  register(id: string, action: Action, nowMs: number) {
    const expires_at_ms = nowMs + this.policy.approval_ttl_minutes * 60_000;
    this.approvals.push({ id, payload_hash: action.payload_hash, amount_cents: action.amount_cents, status: "pending", expires_at_ms });
  }

  decide(id: string, verdict: "approved" | "rejected", nowMs: number) {
    const entry = this.approvals.find((approval) => approval.id === id);
    if (entry && entry.status === "pending" && entry.expires_at_ms > nowMs) entry.status = verdict;
  }

  private findApproval(action: Action, approvalId: string | null): ShadowApproval | null {
    if (approvalId) return this.approvals.find((approval) => approval.id === approvalId) ?? null;
    return this.approvals.find((approval) => approval.payload_hash === action.payload_hash && (approval.status === "pending" || approval.status === "approved")) ?? null;
  }

  private refundProblem(action: Action, captureId: string | null): string | null {
    if (action.kind !== "refund") return null;
    const purchase = captureId ? this.purchases.get(captureId) : undefined;
    if (!purchase) return "refund of a purchase the firewall never saw";
    if (action.amount_cents > purchase.amount_cents - purchase.refunded_cents) return "refund exceeds the remaining purchase amount";
    return null;
  }

  judge(action: Action, reference: Reference, nowMs: number): { decision: Decision; used: ShadowApproval | null } {
    const entry = this.findApproval(action, reference.approvalId);
    if (entry && entry.expires_at_ms <= nowMs && entry.status !== "rejected") return { decision: block("R15", "approval expired"), used: null };
    if (entry && (entry.status === "executed" || entry.status === "rejected")) return { decision: block("R15", `approval ${entry.status}`), used: null };
    const refundProblem = this.refundProblem(action, reference.captureId);
    if (refundProblem) return { decision: block("R12", refundProblem), used: null };
    const approved = entry && entry.status === "approved" ? entry : null;
    const state = {
      nowMs,
      dailySpentCents: this.spentCents,
      history: this.history,
      approval: approved ? { payload_hash: approved.payload_hash, amount_cents: approved.amount_cents } : null,
    };
    return { decision: evaluate(action, this.policy, state), used: approved };
  }

  commit(action: Action, used: ShadowApproval | null, nowMs: number, reference: Reference, newCaptureId: string | null) {
    if (used) used.status = "executed";
    if (action.kind === "refund") {
      const purchase = reference.captureId ? this.purchases.get(reference.captureId) : undefined;
      if (purchase) purchase.refunded_cents += action.amount_cents;
      return;
    }
    this.spentCents += action.amount_cents;
    this.history.push({ ts: nowMs, merchant_id: action.merchant_id, amount_cents: action.amount_cents, fingerprint: fingerprint(action) });
    if (newCaptureId) this.purchases.set(newCaptureId, { amount_cents: action.amount_cents, refunded_cents: 0 });
  }
}
