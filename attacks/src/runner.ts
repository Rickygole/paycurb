import { randomUUID } from "node:crypto";
import type { Policy } from "@paycurb/engine";
import { getPool, inTransaction } from "../../apps/proxy/src/db";
import type { PayPalGateway } from "../../apps/proxy/src/paypal";
import { activatePolicy, defaultPolicy } from "../../apps/proxy/src/policy";
import { resetDemo, seedRegistry } from "../../apps/proxy/src/seed";
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
    await seedRegistry(client);
    await resetDemo(client);
    if (Object.keys(overrides).length > 0) await activatePolicy(client, policy, "attack scenario policy");
  });
  return policy;
}

async function stateStamp(): Promise<string> {
  const result = await getPool().query("SELECT (SELECT count(*) FROM merchants) AS merchants, (SELECT count(*) FROM products) AS products, (SELECT string_agg(version::text || created_at::text, ',') FROM policies WHERE active) AS policy");
  return JSON.stringify(result.rows[0]);
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

const MAX_ATTEMPTS = 3;

export async function runScenario(scenario: Scenario, mode: Mode, env: Env): Promise<ScenarioOutcome> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const session = await openSession(mode, scenario.id, scenario.policy, env);
    const before = await stateStamp();
    const outcome = await playSteps(scenario, session, env);
    if ((await stateStamp()) === before) return outcome;
    console.error(`${scenario.id} ${mode}: the database was changed by another process, attempt ${attempt} discarded`);
  }
  throw new Error(`${scenario.id} ${mode}: the shared database kept changing underneath the run`);
}

async function playSteps(scenario: Scenario, session: Session, env: Env): Promise<ScenarioOutcome> {
  for (const step of scenario.steps) {
    if (step.do === "call") await session.run(step.calls.map((spec) => toRequest(spec, session)), step.parallel === true);
    else if (step.do === "setup_order") await setupOrder(session, env, step.label, step.cents);
    else if (step.do === "approve") await session.decide(step.label, "approved");
    else if (step.do === "reject") await session.decide(step.label, "rejected");
    else session.advance(step.minutes);
  }
  return session.outcome(scenario.id, scenario.group, scenario.kind, session.controlsMet());
}
