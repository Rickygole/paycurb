import { z } from "zod";

const cents = z.number().int().nonnegative();
const minutes = z.number().int().positive();

export const policySchema = z
  .object({
    version: z.number().int().positive(),
    currency: z.string().min(3).max(3),
    per_transaction_limit_cents: cents,
    auto_approve_below_cents: cents,
    daily_limit_cents: cents,
    merchant_window_limit: z.object({ cents, window_minutes: minutes }).strict(),
    merchant_allowlist: z.array(z.string()),
    merchant_blocklist: z.array(z.string()),
    unknown_merchant_action: z.enum(["block", "escalate"]),
    allowed_categories: z.array(z.string()),
    block_recurring: z.boolean(),
    max_quantity_per_line: z.number().int().positive(),
    velocity: z.object({ max_transactions: z.number().int().positive(), window_minutes: minutes }).strict(),
    refunds: z.enum(["escalate", "block"]),
    payouts: z.enum(["escalate", "block"]),
    duplicate_window_minutes: z.number().int().nonnegative(),
    approval_ttl_minutes: minutes,
  })
  .strict();

export type PolicyInput = z.infer<typeof policySchema>;
