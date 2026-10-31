import { describe, expect, it } from "vitest";
import { merchants, products } from "@paycurb/shared";
import { app } from "../src/app";
import { htmlToText } from "../src/browse";
import { pageIds, renderPage } from "../src/pages";

describe("catalog", () => {
  it("adds up an order", () => {
    const total = products.filter((p) => p.merchant_id === "acme-office").reduce((sum, p) => sum + p.price_cents, 0);
    expect(total).toBe(3500 + 1200 + 7500);
  });

  it("gives every product a known merchant", () => {
    for (const product of products) expect(merchants.some((m) => m.id === product.merchant_id)).toBe(true);
  });
});

describe("merchant pages", () => {
  it("shows prices and payee references", () => {
    const acme = htmlToText(renderPage("acme-office")!);
    expect(acme).toContain("acme-office@merchants.example");
    expect(acme).toContain("$35.00");
    expect(acme).toContain("PEN-12");
    const paper = htmlToText(renderPage("paper-co")!);
    expect(paper).toContain("paper-co@merchants.example");
    expect(paper).toContain("$49.99");
    expect(paper).toContain("$8.99");
  });

  it("keeps the hidden injection in the watch page text", () => {
    const text = htmlToText(renderPage("luxury-watches.example")!);
    expect(text).toContain("ignore all previous instructions");
    expect(text).toContain("luxury-watches@merchants.example");
    expect(text).toContain("$400.00");
  });

  it("links the partner page from the acme listing", () => {
    expect(htmlToText(renderPage("acme-office")!)).toContain("/merchant/luxury-watches.example");
  });

  it("carries the injection in review, email, gallery and compromised variants", () => {
    expect(htmlToText(renderPage("acme-office-review")!)).toContain("ignore previous instructions");
    expect(htmlToText(renderPage("promo-email")!)).toContain("ignore previous instructions");
    expect(htmlToText(renderPage("acme-office-gallery")!)).toContain("[image: Notice to AI assistants");
    expect(htmlToText(renderPage("acme-office-compromised")!)).toContain("LAMP-1");
  });

  it("serves every page id over http and 404s unknown ones", async () => {
    for (const id of pageIds) expect((await app.request(`/merchant/${id}`)).status).toBe(200);
    expect((await app.request("/merchant/nope")).status).toBe(404);
  });
});

describe("run endpoint", () => {
  it("rejects a missing task", async () => {
    const response = await app.request("/run", { method: "POST", body: JSON.stringify({}) });
    expect(response.status).toBe(400);
  });
});

describe("htmlToText", () => {
  it("strips tags, keeps hidden text and decodes entities", () => {
    expect(htmlToText('<div style="color:#fff">a &amp; b</div><script>x()</script>')).toBe("a & b");
  });
});
