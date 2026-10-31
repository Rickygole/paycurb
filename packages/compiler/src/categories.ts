import type { Policy } from "@paycurb/engine";
import { merchants } from "@paycurb/shared";

export function withInferredCategories(policy: Policy): Policy {
  if (policy.allowed_categories.length > 0 || policy.merchant_allowlist.length === 0) return policy;
  const named = merchants.filter((merchant) => policy.merchant_allowlist.includes(merchant.id));
  return { ...policy, allowed_categories: [...new Set(named.map((merchant) => merchant.category))] };
}
