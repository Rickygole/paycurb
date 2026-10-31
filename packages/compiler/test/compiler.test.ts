import { describe, expect, it } from "vitest";
import type { LlmClient, Reply } from "@paycurb/llm";
import { compilePolicy, policySchema, readback, strictPolicy, withStrictDefaults } from "../src/index";

function toolReply(input: unknown): Reply {
  return { content: [{ type: "tool_use", id: "t1", name: "submit_policy", input }] } as unknown as Reply;
}

function textReply(): Reply {
  return { content: [{ type: "text", text: "sure" }] } as unknown as Reply;
}

function fakeLlm(replies: Reply[]) {
  const calls: Parameters<LlmClient["complete"]>[0][] = [];
  const llm: LlmClient = {
    complete: async (params) => {
      calls.push(params);
      return replies[calls.length - 1];
    },
  };
  return { llm, calls };
}

describe("schema", () => {
  it("rejects unknown keys", () => {
    expect(policySchema.safeParse({ ...strictPolicy, extra: 1 }).success).toBe(false);
  });

  it("rejects unknown keys in nested objects", () => {
    const nested = { ...strictPolicy, velocity: { max_transactions: 1, window_minutes: 1, extra: 1 } };
    expect(policySchema.safeParse(nested).success).toBe(false);
  });

  it("rejects fractional cents", () => {
    expect(policySchema.safeParse({ ...strictPolicy, daily_limit_cents: 10.5 }).success).toBe(false);
  });

  it("accepts the strict policy", () => {
    expect(policySchema.safeParse(strictPolicy).success).toBe(true);
  });
});

describe("defaults", () => {
  it("fills everything strictly", () => {
    const policy = withStrictDefaults({});
    expect(policy).toEqual(strictPolicy);
    expect(policy.unknown_merchant_action).toBe("block");
    expect(policy.block_recurring).toBe(true);
    expect(policy.refunds).toBe("escalate");
    expect(policy.payouts).toBe("block");
  });

  it("keeps given values and fills nested gaps", () => {
    const policy = withStrictDefaults({ daily_limit_cents: 500, velocity: { max_transactions: 2 } });
    expect(policy.daily_limit_cents).toBe(500);
    expect(policy.velocity).toEqual({ max_transactions: 2, window_minutes: 60 });
  });

  it("does not share state between calls", () => {
    withStrictDefaults({}).merchant_allowlist.push("x");
    expect(withStrictDefaults({}).merchant_allowlist).toEqual([]);
  });
});

describe("readback", () => {
  it("writes sentences in dollars", () => {
    const lines = readback({ ...strictPolicy, per_transaction_limit_cents: 10000, auto_approve_below_cents: 5000 });
    expect(lines).toContain("Block any single purchase above $100.00.");
    expect(lines).toContain("Ask me before any purchase of $50.00 or more.");
    expect(lines).toContain("Block subscriptions and recurring payments.");
    expect(lines).toContain("Ask me before any refund.");
    expect(lines).toContain("Block all payouts.");
  });

  it("lists merchants and the other branches", () => {
    const lines = readback({
      ...strictPolicy,
      merchant_allowlist: ["acme-office", "paper-co"],
      merchant_blocklist: ["bad-shop"],
      allowed_categories: ["office"],
      unknown_merchant_action: "escalate",
      block_recurring: false,
      refunds: "block",
      payouts: "escalate",
      merchant_window_limit: { cents: 4000, window_minutes: 120 },
      velocity: { max_transactions: 3, window_minutes: 45 },
    });
    expect(lines).toContain("Only buy from: acme-office, paper-co.");
    expect(lines).toContain("Never buy from: bad-shop.");
    expect(lines).toContain("Only allow these categories: office.");
    expect(lines).toContain("Ask me before buying from any merchant that is not on the approved list.");
    expect(lines).toContain("Allow subscriptions and recurring payments.");
    expect(lines).toContain("Block all refunds.");
    expect(lines).toContain("Ask me before any payout.");
    expect(lines).toContain("Block more than $40.00 at one merchant within 2 hours.");
    expect(lines).toContain("Block more than 3 purchases within 45 minutes.");
  });

  it("is deterministic", () => {
    expect(readback(strictPolicy)).toEqual(readback(strictPolicy));
  });
});

describe("compilePolicy", () => {
  it("merges the tool call with strict defaults", async () => {
    const { llm, calls } = fakeLlm([toolReply({ per_transaction_limit_cents: 10000 })]);
    const result = await compilePolicy("no purchase over $100", llm, "m");
    expect(result.policy).toEqual({ ...strictPolicy, per_transaction_limit_cents: 10000 });
    expect(result.readback).toContain("Block any single purchase above $100.00.");
    expect(result.questions).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0].temperature).toBe(0);
    expect(calls[0].tools?.[0].name).toBe("submit_policy");
  });

  it("retries once with the validation error", async () => {
    const { llm, calls } = fakeLlm([toolReply({ daily_limit_cents: 12.5 }), toolReply({ daily_limit_cents: 1250 })]);
    const result = await compilePolicy("daily $12.50", llm, "m");
    expect(result.policy.daily_limit_cents).toBe(1250);
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(calls[1].messages)).toContain("daily_limit_cents");
    expect(calls[1].messages).toHaveLength(3);
  });

  it("retries when the model returns no tool call", async () => {
    const { llm, calls } = fakeLlm([textReply(), toolReply({})]);
    const result = await compilePolicy("hi", llm, "m");
    expect(result.policy).toEqual(strictPolicy);
    expect(calls).toHaveLength(2);
  });

  it("throws when the retry also fails", async () => {
    const { llm, calls } = fakeLlm([toolReply({ bogus: 1 }), toolReply({ bogus: 1 })]);
    await expect(compilePolicy("x", llm, "m")).rejects.toThrow();
    expect(calls).toHaveLength(2);
  });

  it("returns questions and strict defaults for ambiguous rules", async () => {
    const { llm } = fakeLlm([toolReply({ questions: ["How many dollars is a few hundred?"] })]);
    const result = await compilePolicy("a few hundred a day", llm, "m");
    expect(result.questions).toEqual(["How many dollars is a few hundred?"]);
    expect(result.policy.daily_limit_cents).toBe(10000);
  });
});
