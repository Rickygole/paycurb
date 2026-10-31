import { afterEach, describe, expect, it, vi } from "vitest";
import { app, ownerSession } from "../src/app";
import { browse, resolveUrl } from "../src/browse";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("browse origin", () => {
  it("resolves paths on the agent origin", () => {
    expect(resolveUrl("/merchant/acme-office", "http://localhost:4100")).toBe("http://localhost:4100/merchant/acme-office");
  });

  it("rejects other hosts", () => {
    expect(() => resolveUrl("https://evil.example/x", "http://localhost:4100")).toThrow();
    expect(() => resolveUrl("//evil.example/x", "http://localhost:4100")).toThrow();
  });

  it("does not follow redirects", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 302, headers: { location: "https://evil.example" } }));
    await expect(browse("/merchant/acme-office", "http://localhost:4100")).rejects.toThrow("redirects");
  });
});

describe("run auth", () => {
  it("rejects a run without a session cookie", async () => {
    vi.stubEnv("PROXY_URL", "http://proxy.test");
    const response = await app.request("/run", { method: "POST", body: JSON.stringify({ preset: "normal" }) });
    expect(response.status).toBe(401);
  });

  it("rejects a cookie the proxy does not accept", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ ok: false }));
    expect(await ownerSession("paycurb_session=bad", "http://proxy.test")).toBe(false);
    vi.stubGlobal("fetch", async () => {
      throw new Error("down");
    });
    expect(await ownerSession("paycurb_session=bad", "http://proxy.test")).toBe(false);
  });

  it("accepts a cookie the proxy confirms and forwards it", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      seen.push((init.headers as Record<string, string>).cookie);
      return Response.json({ ok: true });
    });
    expect(await ownerSession("paycurb_session=good", "http://proxy.test")).toBe(true);
    expect(seen).toEqual(["paycurb_session=good"]);
  });
});
