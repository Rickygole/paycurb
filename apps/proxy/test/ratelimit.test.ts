import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { rateLimit } from "../src/ratelimit";

function limited(max: number, windowMs: number) {
  const app = new Hono();
  app.use("*", rateLimit(max, windowMs));
  app.get("/", (c) => c.text("ok"));
  return (forwarded?: string) => app.request("/", { headers: forwarded ? { "x-forwarded-for": forwarded } : {} });
}

afterEach(() => vi.useRealTimers());

describe("rateLimit", () => {
  it("blocks after the limit", async () => {
    const call = limited(2, 1000);
    expect((await call("9.9.9.9")).status).toBe(200);
    expect((await call("9.9.9.9")).status).toBe(200);
    expect((await call("9.9.9.9")).status).toBe(429);
  });

  it("keys on the last forwarded hop so a spoofed first hop does not reset the limit", async () => {
    const call = limited(1, 1000);
    expect((await call("1.1.1.1, 9.9.9.9")).status).toBe(200);
    expect((await call("2.2.2.2, 9.9.9.9")).status).toBe(429);
    expect((await call("2.2.2.2, 8.8.8.8")).status).toBe(200);
  });

  it("frees a client after the window and survives many one-shot clients", async () => {
    vi.useFakeTimers();
    const call = limited(1, 1000);
    for (let index = 0; index < 12_000; index++) expect((await call(`10.0.${index >> 8}.${index & 255}`)).status).toBe(200);
    expect((await call("10.0.0.0")).status).toBe(200);
    expect((await call("10.0.0.0")).status).toBe(429);
    vi.advanceTimersByTime(1500);
    expect((await call("10.0.0.0")).status).toBe(200);
  });
});
