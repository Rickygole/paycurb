import { randomUUID } from "node:crypto";
import type { Policy } from "@paycurb/engine";
import { inTransaction } from "../../apps/proxy/src/db";
import type { PayPalGateway } from "../../apps/proxy/src/paypal";
import { activatePolicy, defaultPolicy } from "../../apps/proxy/src/policy";
import { resetDemo } from "../../apps/proxy/src/seed";
import { Session, type Request } from "./session";
import type { CallSpec, Mode, Scenario, ScenarioOutcome } from "./types";

export interface Env {
  gateway: PayPalGateway;
  runId: string;
}

export function startOfDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0));
}

export async function prepareState(overrides: Partial<Policy>): Promise<Policy> {
  const policy = { ...defaultPolicy, ...overrides };
  await inTransaction(async (client) => {
    await resetDemo(client);
    if (Object.keys(overrides).length > 0) await activatePolicy(client, policy, "attack scenario policy");
  });
  return policy;
}

export async function openSession(mode: Mode, scenarioId: string, overrides: Partial<Policy>, env: Env): Promise<Session> {
  const policy = await prepareState(overrides);
  return new Session(mode, policy, env.gateway, `attack-${env.runId}-${scenarioId}-${mode}`, startOfDay());
}

function toRequest(spec: CallSpec, session: Session): Request {
  const args = typeof spec.args === "function" ? (spec.args as (lookup: Session["lookup"]) => unknown)(session.lookup) : spec.args;
  return { tool: spec.tool, args, label: spec.label, expect: spec.expect };
}

async function setupOrder(session: Session, env: Env, label: string, cents: number) {
  const order = await env.gateway.createOrder({
    amountCents: cents,
    currency: "USD",
    items: [{ name: "Setup item", quantity: 1, unitCents: cents }],
    requestId: randomUUID(),
  });
  session.rememberCapture(label, order.captureId);
}

export async function runScenario(scenario: Scenario, mode: Mode, env: Env): Promise<ScenarioOutcome> {
  const session = await openSession(mode, scenario.id, scenario.policy, env);
  for (const step of scenario.steps) {
    if (step.do === "call") await session.run(step.calls.map((spec) => toRequest(spec, session)), step.parallel === true);
    else if (step.do === "setup_order") await setupOrder(session, env, step.label, step.cents);
    else if (step.do === "approve") await session.decide(step.label, "approved");
    else if (step.do === "reject") await session.decide(step.label, "rejected");
    else session.advance(step.minutes);
  }
  return session.outcome(scenario.id, scenario.group, scenario.kind, session.controlsMet());
}
