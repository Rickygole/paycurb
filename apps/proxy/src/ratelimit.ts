import type { MiddlewareHandler } from "hono";

export function rateLimit(maxRequests: number, windowMs: number): MiddlewareHandler {
  const hits = new Map<string, number[]>();
  return async (c, next) => {
    const client = c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "local";
    const now = Date.now();
    const recent = (hits.get(client) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= maxRequests) return c.json({ error: "too many requests" }, 429);
    hits.set(client, [...recent, now]);
    await next();
  };
}
