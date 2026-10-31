import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createLlm, requiredEnv } from "@paycurb/llm";
import { renderPage } from "./pages";
import { presets } from "./presets";
import { createProxyTools } from "./proxy-tools";
import { runAgent } from "./run";

export const app = new Hono();

app.get("/merchant/:id", (c) => {
  const html = renderPage(c.req.param("id"));
  if (!html) return c.text("not found", 404);
  return c.html(html);
});

app.get("/healthz", (c) => c.json({ ok: true }));

export function taskFromBody(body: { task?: string; preset?: string }): string | null {
  if (body.preset) return presets[body.preset] ?? null;
  return body.task && body.task.trim() ? body.task : null;
}

app.post("/run", async (c) => {
  const task = taskFromBody(await c.req.json().catch(() => ({})));
  if (!task) return c.json({ error: "task or valid preset required" }, 400);
  return streamSSE(c, async (stream) => {
    const send = (event: unknown) => stream.writeSSE({ data: JSON.stringify(event) });
    const agentUrl = process.env.AGENT_URL ?? "http://localhost:4100";
    const tools = await createProxyTools(requiredEnv("PROXY_URL"), agentUrl);
    try {
      await runAgent({ task, llm: createLlm(), model: requiredEnv("LLM_MODEL_AGENT"), tools: tools.executor, emit: send });
    } catch (error) {
      await send({ type: "message", text: `agent error: ${error instanceof Error ? error.message : String(error)}` });
      await send({ type: "done" });
    } finally {
      await tools.close();
    }
  });
});

export default app;
