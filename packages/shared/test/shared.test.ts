import { describe, expect, it } from "vitest";
import { canonicalJson, formatUsd, fromCents, hashPayload, toCents } from "../src";

describe("canonicalJson", () => {
  it("sorts keys at every depth", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [{ y: 1, x: 2 }] } })).toBe('{"a":{"c":[{"x":2,"y":1}],"d":2},"b":1}');
  });
  it("drops undefined values", () => expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"b":1}'));
});

describe("hashPayload", () => {
  it("ignores key order", () => expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 })));
  it("changes when a value changes", () => expect(hashPayload({ a: 150 })).not.toBe(hashPayload({ a: 450 })));
});

describe("money", () => {
  it("parses decimals to cents", () => {
    expect(toCents(49.99)).toBe(4999);
    expect(toCents("10")).toBe(1000);
    expect(toCents("0.5")).toBe(50);
  });
  it("rejects bad input", () => {
    for (const bad of ["-1", "abc", "1.234", "", "1e3"]) expect(() => toCents(bad)).toThrow();
  });
  it("formats", () => {
    expect(formatUsd(7500)).toBe("$75.00");
    expect(fromCents(1999)).toBe("19.99");
  });
});
