import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { compilePolicy, policySchema, withStrictDefaults, type Compiled } from "@paycurb/compiler";
import { createLlm, requiredEnv } from "@paycurb/llm";
import { readAudit, verifyChain } from "./audit";
import { decideApproval } from "./approvals";
import { config } from "./config";
import { getPool, inTransaction } from "./db";
import { subscribe } from "./events";
import { handleMcpRequest } from "./mcp";
import type { Deps } from "./pipeline";
import { activatePolicy, getActivePolicy, listVersions } from "./policy";
import { rateLimit } from "./ratelimit";
import { resetDemo } from "./seed";
import { endSession, hasSession, passwordMatches, requireSession, startSession } from "./session";
import { feedForAction, getApproval, listApprovals, recentFeed, stats } from "./views";

const reportPath = () => process.env.REPORT_PATH ?? new URL("../../../reports/attack-report.json", import.meta.url).pathname;

async function withClient<T>(work: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await work(client);
  } finally {
    client.release();
  }
}

const clampInt = (raw: string | undefined, fallback: number, max: number) => Math.min(max, Math.max(1, Number.parseInt(raw ?? "", 10) || fallback));

const compileWithModel = (text: string) => compilePolicy(text, createLlm(), requiredEnv("LLM_MODEL_COMPILER"));

export interface AppOptions {
  deps: Deps;
  compile?: (text: string) => Promise<Compiled>;
  startAttackRun?: () => void;
}

export function createApp({ deps, startAttackRun, compile = compileWithModel }: AppOptions) {
  const app = new Hono();

  app.get("/healthz", (c) => c.json({ ok: true }));
  app.all("/mcp", rateLimit(120, 60_000), (c) => handleMcpRequest(deps, c.req.raw));

  app.post("/api/login", rateLimit(10, 60_000), async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (typeof body.password !== "string" || !passwordMatches(body.password)) return c.json({ error: "wrong password" }, 401);
    startSession(c);
    return c.json({ ok: true });
  });
  app.post("/api/logout", (c) => {
    endSession(c);
    return c.json({ ok: true });
  });
  app.get("/api/session", (c) => c.json({ ok: hasSession(c) }));

  const api = new Hono();
  api.use("*", requireSession);

  api.post("/policy/compile", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (typeof body.text !== "string" || body.text.trim() === "" || body.text.length > 4000) return c.json({ error: "text is required" }, 400);
    try {
      return c.json(await compile(body.text));
    } catch {
      return c.json({ error: "the rules could not be compiled, try rephrasing" }, 502);
    }
  });
  api.post("/policy/activate", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    try {
      const policy = withStrictDefaults(body.policy ?? {});
      const checked = policySchema.parse(policy);
      const version = await inTransaction((client) => activatePolicy(client, checked as never, String(body.source_text ?? "")));
      return c.json({ version });
    } catch {
      return c.json({ error: "policy is not valid" }, 400);
    }
  });
  api.get("/policy/active", async (c) => {
    const active = await withClient(getActivePolicy);
    return active ? c.json(active) : c.json({ error: "no active policy" }, 404);
  });
  api.get("/policy/versions", async (c) => c.json(await withClient(listVersions)));
  api.get("/stats", async (c) => c.json(await withClient((client) => stats(client, deps.now()))));
  api.get("/decisions", async (c) => c.json(await withClient((client) => recentFeed(client, clampInt(c.req.query("limit"), 50, 200)))));
  api.get("/approvals", async (c) => c.json(await withClient((client) => listApprovals(client, c.req.query("status") ?? null))));

  for (const [path, verdict] of [["approve", "approved"], ["reject", "rejected"]] as const) {
    api.post(`/approvals/:id/${path}`, async (c) => {
      const id = c.req.param("id");
      const outcome = await decideApproval(id, verdict, deps.now());
      if (outcome === "missing") return c.json({ error: "approval not found" }, 404);
      if (outcome !== "updated") return c.json({ error: `approval is ${outcome === "expired" ? "expired" : "not pending"}` }, 409);
      return c.json(await withClient((client) => getApproval(client, id)));
    });
  }

  api.get("/audit", async (c) => {
    const limit = clampInt(c.req.query("limit"), 100, 500);
    const cursor = Number.parseInt(c.req.query("cursor") ?? "0", 10) || 0;
    const rows = await withClient((client) => readAudit(client, cursor, limit));
    return c.json({ rows, next_cursor: rows.length === limit ? String(rows[rows.length - 1].seq) : null });
  });
  api.get("/audit/verify", async (c) => c.json(await withClient(verifyChain)));

  api.get("/attacks/latest", (c) => {
    try {
      return c.json(JSON.parse(readFileSync(reportPath(), "utf8")));
    } catch {
      return c.json({ report: null });
    }
  });
  api.post("/attacks/run", (c) => {
    if (!config.demoMode || !startAttackRun) return c.json({ error: "demo mode is off" }, 403);
    startAttackRun();
    return c.json({ started: true });
  });
  api.post("/demo/reset", async (c) => {
    if (!config.demoMode) return c.json({ error: "demo mode is off" }, 403);
    await inTransaction(resetDemo);
    return c.json({ ok: true });
  });

  api.get("/stream", (c) =>
    streamSSE(c, async (stream) => {
      const unsubscribe = subscribe(async (event) => {
        const data = await withClient<unknown>((client) => (event.type === "decision" ? feedForAction(client, event.action_id) : getApproval(client, event.id)));
        if (data) await stream.writeSSE({ event: event.type, data: JSON.stringify(data) });
      });
      stream.onAbort(unsubscribe);
      while (!stream.aborted) {
        await stream.writeSSE({ event: "ping", data: "{}" });
        await stream.sleep(15_000);
      }
    }),
  );

  app.route("/api", api);
  return app;
}
