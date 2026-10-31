import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createLlm, requiredEnv } from "@paycurb/llm";
import { renderPage } from "./pages";
import { presets } from "./presets";
import { createProxyTools } from "./proxy-tools";
import { runAgent } from "./run";
import { scriptedLabel, scriptedLlm, scriptedMode } from "./scripted";

export const app = new Hono();

app.get("/merchant/:id", (c) => {
  const html = renderPage(c.req.param("id"));
  if (!html) return c.text("not found", 404);
  return c.html(html);
});

app.get("/healthz", (c) => c.json({ ok: true }));

export function taskFromBody(body: { task?: string; preset?: string }): string | null {
  if (body.preset !== undefined) return typeof body.preset === "string" && Object.hasOwn(presets, body.preset) ? presets[body.preset] : null;
  return body.task && body.task.trim() ? body.task : null;
}

export async function ownerSession(cookie: string | undefined, proxyUrl: string): Promise<boolean> {
  if (!cookie) return false;
  try {
    const response = await fetch(`${proxyUrl}/api/session`, { headers: { cookie } });
    return response.ok && ((await response.json()) as { ok?: boolean }).ok === true;
  } catch {
    return false;
  }
}

app.post("/run", async (c) => {
  if (!(await ownerSession(c.req.header("cookie"), requiredEnv("PROXY_URL")))) return c.json({ error: "login required" }, 401);
  const body: { task?: string; preset?: string } = await c.req.json().catch(() => ({}));
  const task = taskFromBody(body);
  if (!task) return c.json({ error: "task or valid preset required" }, 400);
  const scripted = scriptedMode();
  if (scripted && !body.preset) return c.json({ error: "no model is running on this host, pick a preset task" }, 400);
  return streamSSE(c, async (stream) => {
    const send = (event: unknown) => stream.writeSSE({ data: JSON.stringify(event) });
    const agentUrl = process.env.AGENT_URL ?? "http://localhost:4100";
    const tools = await createProxyTools(requiredEnv("PROXY_URL"), agentUrl);
    try {
      if (scripted) await send({ type: "message", text: scriptedLabel });
      const llm = scripted ? scriptedLlm(body.preset ?? "") : createLlm();
      await runAgent({ task, llm, model: scripted ? "scripted" : requiredEnv("LLM_MODEL_AGENT"), tools: tools.executor, emit: send });
    } catch (error) {
      await send({ type: "message", text: `agent error: ${error instanceof Error ? error.message : String(error)}` });
      await send({ type: "done" });
    } finally {
      await tools.close();
    }
  });
});

export default app;
