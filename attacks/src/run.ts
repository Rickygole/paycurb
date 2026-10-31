import { randomUUID } from "node:crypto";
import { createLlm, requiredEnv } from "@paycurb/llm";
import { closePool, inTransaction } from "../../apps/proxy/src/db";
import { activatePolicy, getActivePolicy, type ActivePolicy } from "../../apps/proxy/src/policy";
import { createPayPalGateway } from "../../apps/proxy/src/paypal";
import { seedRegistry } from "../../apps/proxy/src/seed";
import { agentScenarios, limitationScenarios, scriptedScenarios } from "../scenarios";
import { ensureAgentServer, runAgentGroup, type AgentResult } from "./agent-runs";
import { createFakeGateway } from "./fake-gateway";
import { measureLatency } from "./latency";
import { buildReport, modelLabel, writeReport } from "./report";
import { runPairs } from "./suite";

function readOption(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`);
const log = (line: string) => console.log(line);
const reportPath = () => process.env.REPORT_PATH ?? new URL("../../reports/attack-report.json", import.meta.url).pathname;

async function runSuite() {
  const trials = Number(readOption("trials") ?? process.env.TRIALS ?? 10);
  const withAgent = hasFlag("agent") || process.env.ATTACKS_AGENT === "true";
  const fake = hasFlag("fake-gateway");
  const gateway = fake ? createFakeGateway() : createPayPalGateway();
  const env = { gateway, runId: randomUUID().slice(0, 8) };
  await inTransaction((client) => seedRegistry(client));

  log("Scripted scenarios, groups B to H");
  const pairs = await runPairs(scriptedScenarios, env, log);
  log("Known limitation scenarios");
  const limitationPairs = await runPairs(limitationScenarios, env, log);

  let agent: AgentResult | null = null;
  let agentNote = "Group A runs the live demo agent and needs the agent flag and a valid model key.";
  let model: string | null = null;
  if (withAgent) {
    const agentUrl = process.env.AGENT_URL ?? "http://localhost:4100";
    const stop = await ensureAgentServer(agentUrl);
    try {
      const modelId = requiredEnv("LLM_MODEL_AGENT");
      log(`Group A, ${trials} trials per scenario and mode`);
      const result = await runAgentGroup(agentScenarios, env, { llm: createLlm(), model: modelId, agentUrl, trials }, log);
      if (result.detail.valid_trials_baseline + result.detail.valid_trials_protected > 0) {
        agent = result;
        model = modelLabel(modelId);
      } else agentNote = `Every agent trial failed. First error: ${result.errors[0] ?? "unknown"}`;
    } finally {
      stop();
    }
  }

  log("Latency");
  const latency = await measureLatency();
  const report = buildReport({
    generatedAt: new Date(),
    model,
    trials: agent ? trials : 0,
    gateway: fake ? "fake gateway dry run, no PayPal calls" : "PayPal sandbox",
    pairs,
    limitationPairs,
    agent,
    agentScenarioCount: agentScenarios.length,
    agentNote,
    latency,
  });
  writeReport(report, reportPath());
  log(JSON.stringify({ headline: report.headline, false_block_rate: report.false_block_rate, escalated_as_designed_rate: report.escalated_as_designed_rate, latency_ms: report.latency_ms, findings: report.findings }, null, 2));
  log(`Report written to ${reportPath()}`);
}

async function restorePolicy(saved: ActivePolicy | null) {
  if (!saved) return;
  await inTransaction((client) => activatePolicy(client, saved.policy, saved.source_text));
  log(`Restored the owner policy that was active before the run (was version ${saved.version})`);
}

async function main() {
  const saved = await inTransaction((client) => getActivePolicy(client));
  try {
    await runSuite();
  } finally {
    await restorePolicy(saved);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
