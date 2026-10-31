import type { AgentEvent } from "./types";

export async function runAgent(body: { task: string } | { preset: string }, onEvent: (event: AgentEvent) => void, signal: AbortSignal) {
  const response = await fetch("/agent/run", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    let message = `The agent returned status ${response.status}`;
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed.error === "string") message = parsed.error;
    } catch {
      if (text && text.length < 200) message = text;
    }
    throw new Error(message);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      try {
        onEvent(JSON.parse(data) as AgentEvent);
      } catch {
        continue;
      }
    }
  }
}

export function parseToolOutput(output: unknown): Record<string, unknown> | null {
  if (output && typeof output === "object") return output as Record<string, unknown>;
  if (typeof output === "string") {
    try {
      const parsed = JSON.parse(output);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}
