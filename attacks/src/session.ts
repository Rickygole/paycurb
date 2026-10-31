import type { Policy } from "@paycurb/engine";
import { decideApproval } from "../../apps/proxy/src/approvals";
import type { PayPalGateway } from "../../apps/proxy/src/paypal";
import { baselineExecutor } from "./baseline";
import type { Execute, Executed } from "./executors";
import { protectedExecutor } from "./executors";
import { Shadow } from "./shadow";
import type { CallRecord, Expectation, Lookup, Mode, ScenarioOutcome } from "./types";
import type { Deps } from "../../apps/proxy/src/pipeline";

export interface Request {
  tool: string;
  args: unknown;
  label?: string;
  expect?: Expectation;
}

const asText = (value: unknown): string | null => (typeof value === "string" ? value : null);
const field = (args: unknown, name: string): unknown => (typeof args === "object" && args !== null ? (args as Record<string, unknown>)[name] : undefined);

export class Session {
  readonly clock: { now: Date };
  readonly records: CallRecord[] = [];
  private shadow: Shadow;
  private execute: Execute;
  private seenRefs = new Set<string>();
  private approvalIds = new Map<string, string>();
  private captureIds = new Map<string, string>();
  private movedCents = 0;
  private lostCents = 0;
  private completedCount = 0;
  private syntheticCount = 0;

  constructor(
    readonly mode: Mode,
    policy: Policy,
    gateway: PayPalGateway,
    agentId: string,
    start: Date,
  ) {
    this.clock = { now: start };
    this.shadow = new Shadow(policy);
    const deps: Deps = { gateway, now: () => this.clock.now };
    this.execute = mode === "protected" ? protectedExecutor(deps, agentId) : baselineExecutor(gateway, agentId);
  }

  lookup: Lookup = {
    approvalId: (label) => this.approvalIds.get(label) ?? `missing-approval-${label}`,
    captureId: (label) => this.captureIds.get(label) ?? `missing-capture-${label}`,
  };

  advance(minutes: number) {
    this.clock.now = new Date(this.clock.now.getTime() + minutes * 60_000);
  }

  rememberCapture(label: string, captureId: string | null) {
    if (captureId) this.captureIds.set(label, captureId);
  }

  async decide(label: string, verdict: "approved" | "rejected") {
    const id = this.approvalIds.get(label);
    if (!id) return;
    if (this.mode === "protected") await decideApproval(id, verdict, this.clock.now);
    this.shadow.decide(id, verdict, this.clock.now.getTime());
  }

  async run(requests: Request[], parallel: boolean): Promise<string[]> {
    if (!parallel) {
      const outputs: string[] = [];
      for (const request of requests) outputs.push(await this.runOne(request));
      return outputs;
    }
    const executed = await Promise.all(requests.map((request) => this.execute(request.tool, request.args)));
    return requests.map((request, index) => this.settle(request, executed[index]));
  }

  private async runOne(request: Request): Promise<string> {
    return this.settle(request, await this.execute(request.tool, request.args));
  }

  private settle(request: Request, executed: Executed): string {
    const nowMs = this.clock.now.getTime();
    const { action } = executed;
    const isNew = executed.completed && executed.ref !== null && !this.seenRefs.has(executed.ref);
    if (executed.ref) this.seenRefs.add(executed.ref);
    const reference = {
      approvalId: asText(field(request.args, "approval_id")),
      captureId: request.tool.toLowerCase() === "create_refund" ? asText(field(request.args, "capture_id")) : null,
    };
    let decision: CallRecord["decision"] = executed.decision;
    let ruleId = executed.rule_id;
    if (action && this.mode === "protected" && executed.decision === "escalate" && executed.approval_id) {
      const id = this.shadow.register(executed.approval_id, action, nowMs);
      if (request.label) this.approvalIds.set(request.label, id);
    }
    if (action && (this.mode === "baseline" || isNew)) {
      const judged = this.shadow.judge(action, reference, nowMs);
      if (this.mode === "baseline") {
        decision = executed.completed ? "allow" : "none";
        ruleId = judged.decision.rule_id;
        if (judged.decision.decision === "escalate") {
          this.syntheticCount += 1;
          const id = this.shadow.register(request.label ?? `synthetic-${this.syntheticCount}`, action, nowMs);
          if (request.label && !this.approvalIds.has(request.label)) this.approvalIds.set(request.label, id);
        }
      }
      if (isNew) {
        this.completedCount += 1;
        this.movedCents += action.amount_cents;
        if (judged.decision.decision === "allow") this.shadow.commit(action, judged.used, nowMs, reference, executed.captureId);
        else this.lostCents += action.amount_cents;
        if (request.label) this.rememberCapture(request.label, executed.captureId);
      }
    }
    this.records.push({ tool: request.tool, decision, rule_id: ruleId, completed: isNew, amount_cents: action?.amount_cents ?? 0, expect: request.expect });
    return executed.json;
  }

  outcome(id: string, group: ScenarioOutcome["group"], kind: ScenarioOutcome["kind"], controlsMet: boolean): ScenarioOutcome {
    const success = kind === "attack" ? this.lostCents > 0 : kind === "control" ? controlsMet : this.completedCount > 0;
    return { id, group, kind, mode: this.mode, success, completed_count: this.completedCount, money_lost_cents: this.lostCents, moved_cents: this.movedCents, calls: this.records };
  }

  controlsMet(): boolean {
    const wanted = this.records.filter((record) => record.expect && record.expect !== "block");
    if (this.mode === "baseline") return wanted.every((record) => record.completed);
    return wanted.every((record) => record.decision === record.expect);
  }
}
