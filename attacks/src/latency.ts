import { performance } from "node:perf_hooks";
import { evaluate, type Action, type State } from "@paycurb/engine";
import { handleCall } from "../../apps/proxy/src/pipeline";
import { defaultPolicy } from "../../apps/proxy/src/policy";
import { createFakeGateway } from "./fake-gateway";
import { plain } from "../scenarios/helpers";
import { prepareState, startOfDay } from "./runner";
import { percentile } from "./stats";

export interface Latency {
  engine_p50: number;
  engine_p95: number;
  proxy_p50: number;
  proxy_p95: number;
  engine_samples: number;
  proxy_samples: number;
}

const sampleAction: Action = {
  action_id: "latency",
  tool: "create_order",
  kind: "purchase",
  amount_cents: 1200,
  currency: "USD",
  merchant_id: "acme-office",
  category: "office_supplies",
  recurring: false,
  line_items: [{ sku: "PEN-12", qty: 1, unit_cents: 1200 }],
  payload_hash: "latency",
  agent_id: "latency",
};

function sampleState(): State {
  const nowMs = startOfDay().getTime();
  const history = Array.from({ length: 4 }, (_, index) => ({ ts: nowMs - (index + 1) * 60_000, merchant_id: "acme-office", amount_cents: 1000 + index, fingerprint: `f${index}` }));
  return { nowMs, dailySpentCents: 4000, history, approval: null };
}

const round = (value: number) => Math.round(value * 1000) / 1000;

function measureEngine(samples: number): number[] {
  const state = sampleState();
  const times: number[] = [];
  for (let index = 0; index < samples; index++) {
    const start = performance.now();
    evaluate(sampleAction, defaultPolicy, state);
    times.push(performance.now() - start);
  }
  return times;
}

async function measureProxy(samples: number): Promise<number[]> {
  await prepareState({
    per_transaction_limit_cents: 100_000_000,
    auto_approve_below_cents: 100_000_000,
    daily_limit_cents: 100_000_000,
    merchant_window_limit: { cents: 100_000_000, window_minutes: 60 },
    velocity: { max_transactions: 1_000_000, window_minutes: 60 },
    duplicate_window_minutes: 0,
  });
  const deps = { gateway: createFakeGateway(), now: () => startOfDay() };
  const times: number[] = [];
  for (let index = 0; index < samples; index++) {
    const args = plain(`Latency item ${index}`, 10 + index / 100);
    const start = performance.now();
    await handleCall(deps, { tool: "create_order", args, agentId: "latency" });
    times.push(performance.now() - start);
  }
  return times;
}

export async function measureLatency(proxySamples = 250, engineSamples = 5000): Promise<Latency> {
  const engine = measureEngine(engineSamples);
  const proxy = await measureProxy(proxySamples);
  return {
    engine_p50: round(percentile(engine, 0.5)),
    engine_p95: round(percentile(engine, 0.95)),
    proxy_p50: round(percentile(proxy, 0.5)),
    proxy_p95: round(percentile(proxy, 0.95)),
    engine_samples: engineSamples,
    proxy_samples: proxySamples,
  };
}
