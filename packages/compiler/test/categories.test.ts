import { describe, expect, it } from "vitest";
import { withInferredCategories } from "../src/categories";
import { strictPolicy } from "../src/defaults";

describe("withInferredCategories", () => {
  it("takes categories from the allowlisted merchants when none were given", () => {
    const policy = withInferredCategories({ ...strictPolicy, merchant_allowlist: ["acme-office", "paper-co"] });
    expect(policy.allowed_categories).toEqual(["office_supplies"]);
  });
  it("keeps categories the owner stated", () => {
    const policy = withInferredCategories({ ...strictPolicy, merchant_allowlist: ["acme-office"], allowed_categories: ["jewelry"] });
    expect(policy.allowed_categories).toEqual(["jewelry"]);
  });
  it("stays strict with no allowlist", () => {
    expect(withInferredCategories(strictPolicy).allowed_categories).toEqual([]);
  });
});
