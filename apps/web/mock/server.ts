import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { Policy } from "@paycurb/engine";
import { compile } from "./compile.ts";
import { expireApprovals, nextScenario, paypalRef, record, reset, seedReport, stats, store, verifyChain } from "./data.ts";
import { runAgent } from "./agent.ts";
import type { ApprovalCard, Feed } from "../src/lib/types.ts";

const PROXY_PORT = Number(process.env.MOCK_PROXY_PORT || 4000);
const AGENT_PORT = Number(process.env.MOCK_AGENT_PORT || 4100);
const PASSWORD = process.env.OWNER_PASSWORD || "demo";
const STREAM_EVERY_MS = Number(process.env.MOCK_STREAM_MS || 5000);

const sessions = new Set<string>();
const listeners = new Set<ServerResponse>();

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function hasSession(req: IncomingMessage) {
  const cookie = req.headers.cookie ?? "";
  const match = /(?:^|;\s*)pc_session=([^;]+)/.exec(cookie);
  return !!match && sessions.has(match[1]);
}

export function broadcast(event: "decision" | "approval", data: Feed | ApprovalCard) {
  for (const res of listeners) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL) {
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (path === "/healthz") return send(res, 200, { ok: true });
  if (path === "/api/login" && method === "POST") {
    const body = await readBody(req);
    await wait(300);
    if (body.password !== PASSWORD) return send(res, 401, { error: "That password is not correct" });
    const id = randomUUID();
    sessions.add(id);
    return send(res, 200, { ok: true }, { "set-cookie": `pc_session=${id}; Path=/; HttpOnly; SameSite=Lax` });
  }
  if (path === "/api/logout" && method === "POST") {
    return send(res, 200, { ok: true }, { "set-cookie": "pc_session=; Path=/; Max-Age=0" });
  }
  if (path === "/api/session") return send(res, 200, { ok: hasSession(req) });
  if (!hasSession(req)) return send(res, 401, { error: "Sign in to continue" });

  if (path === "/api/policy/compile" && method === "POST") {
    const body = await readBody(req);
    const text = typeof body.text === "string" ? body.text.trim() : "";
    await wait(900);
    if (!text) return send(res, 400, { error: "Write at least one rule before compiling" });
    if (text.length < 12) return send(res, 422, { error: "The compiler could not find any rules in that text" });
    return send(res, 200, compile(text, store.versions.length + 1));
  }
  if (path === "/api/policy/activate" && method === "POST") {
    const body = await readBody(req);
    if (!body.policy || typeof body.source_text !== "string") return send(res, 400, { error: "policy and source_text are required" });
    const version = store.versions.length + 1;
    const policy = { ...(body.policy as Policy), version };
    for (const entry of store.versions) entry.active = false;
    store.versions.push({ version, active: true, created_at: new Date().toISOString(), source_text: body.source_text, policy });
    store.policy = policy;
    return send(res, 200, { version });
  }
  if (path === "/api/policy/active") {
    const active = store.versions.find((entry) => entry.active);
    if (!active) return send(res, 404, { error: "No active policy" });
    return send(res, 200, { version: active.version, policy: active.policy, source_text: active.source_text, created_at: active.created_at });
  }
  if (path === "/api/policy/versions") return send(res, 200, [...store.versions].reverse());
  if (path === "/api/stats") return send(res, 200, stats());
  if (path === "/api/decisions") {
    const limit = Math.min(500, Number(url.searchParams.get("limit") || 50));
    return send(res, 200, store.feed.slice(-limit).reverse());
  }
  if (path === "/api/approvals") {
    const status = url.searchParams.get("status");
    const list = store.approvals.filter((a) => !status || a.status === status);
    return send(res, 200, [...list].reverse());
  }
  const approvalMatch = /^\/api\/approvals\/([^/]+)\/(approve|reject)$/.exec(path);
  if (approvalMatch && method === "POST") return decide(res, approvalMatch[1], approvalMatch[2] as "approve" | "reject");
  if (path === "/api/audit") {
    const cursor = Number(url.searchParams.get("cursor") || 0);
    const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit") || 100)));
    const rows = store.audit.filter((row) => row.seq > cursor).slice(0, limit);
    const last = rows[rows.length - 1];
    const more = !!last && last.seq < store.audit[store.audit.length - 1].seq;
    await wait(120);
    return send(res, 200, { rows, next_cursor: more ? String(last.seq) : null });
  }
  if (path === "/api/audit/verify") {
    await wait(500);
    return send(res, 200, verifyChain());
  }
  if (path === "/api/attacks/latest") return send(res, 200, store.report ?? { report: null });
  if (path === "/api/attacks/run" && method === "POST") {
    if (store.attackRunning) return send(res, 409, { error: "The attack suite is already running" });
    store.attackRunning = true;
    setTimeout(() => {
      store.report = seedReport();
      store.attackRunning = false;
    }, 6000);
    return send(res, 200, { started: true });
  }
  if (path === "/api/demo/reset" && method === "POST") {
    reset();
    return send(res, 200, { ok: true });
  }
  if (path === "/api/stream") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" });
    res.write("retry: 3000\n\n");
    listeners.add(res);
    req.on("close", () => listeners.delete(res));
    return;
  }
  return send(res, 404, { error: `No route for ${method} ${path}` });
}

function decide(res: ServerResponse, id: string, choice: "approve" | "reject") {
  const approval = store.approvals.find((a) => a.id === id);
  if (!approval) return send(res, 404, { error: "Approval not found" });
  if (approval.status !== "pending") return send(res, 409, { error: `This request is already ${approval.status}` });
  if (new Date(approval.expires_at).getTime() <= Date.now()) {
    approval.status = "expired";
    return send(res, 409, { error: "This request expired before it was decided" });
  }
  if (choice === "reject") {
    approval.status = "rejected";
    broadcast("approval", approval);
    return send(res, 200, approval);
  }
  approval.status = "approved";
  approval.execution = { status: "PENDING", paypal_ref: null };
  setTimeout(() => {
    const failed = approval.amount_cents > 25000;
    approval.status = failed ? "approved" : "executed";
    approval.execution = failed ? { status: "FAILED", paypal_ref: null } : { status: "COMPLETED", paypal_ref: paypalRef() };
    broadcast("approval", approval);
  }, 2500);
  broadcast("approval", approval);
  return send(res, 200, approval);
}

export function start() {
  reset();
  createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    handleApi(req, res, url).catch((error) => send(res, 500, { error: String(error) }));
  }).listen(PROXY_PORT, () => console.log(`mock proxy on http://localhost:${PROXY_PORT}`));

  createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "POST" && url.pathname === "/run") {
      readBody(req).then((body) => runAgent(body, res, broadcast)).catch((error) => send(res, 500, { error: String(error) }));
      return;
    }
    send(res, 404, { error: "Not found" });
  }).listen(AGENT_PORT, () => console.log(`mock agent on http://localhost:${AGENT_PORT}`));

  setInterval(() => {
    const { feed, approval } = record(nextScenario(), Date.now());
    broadcast("decision", feed);
    if (approval) broadcast("approval", approval);
    for (const expired of expireApprovals(Date.now())) broadcast("approval", expired);
  }, STREAM_EVERY_MS);

  setInterval(() => {
    for (const res of listeners) res.write(": ping\n\n");
  }, 15000);
}

if (process.argv[1]?.endsWith("server.ts")) start();
