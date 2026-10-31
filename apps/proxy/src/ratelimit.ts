import type { Context, MiddlewareHandler } from "hono";

const maxClients = 10_000;

export function clientAddress(c: Context): string {
  const hops = c.req.header("x-forwarded-for")?.split(",");
  return hops?.at(-1)?.trim() || "local";
}

export function rateLimit(maxRequests: number, windowMs: number): MiddlewareHandler {
  const hits = new Map<string, number[]>();
  let swept = 0;
  return async (c, next) => {
    const client = clientAddress(c);
    const now = Date.now();
    if (now - swept >= windowMs || hits.size > maxClients) {
      swept = now;
      for (const [key, times] of hits) if (now - times[times.length - 1] >= windowMs) hits.delete(key);
      while (hits.size > maxClients) hits.delete(hits.keys().next().value as string);
    }
    const recent = (hits.get(client) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= maxRequests) return c.json({ error: "too many requests" }, 429);
    hits.delete(client);
    hits.set(client, [...recent, now]);
    await next();
  };
}
