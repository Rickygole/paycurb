import { describe, expect, it } from "vitest";
import { strictPolicy } from "../../../packages/compiler/src/defaults";
import { policySchema } from "../../../packages/compiler/src/schema";
import { defaultPolicy } from "../../proxy/src/policy";
import { fields, fieldValue, strictDefault, workspaceDefault } from "../src/components/docs/policy";

describe("docs policy table", () => {
  it("matches the policies the proxy and compiler really use", () => {
    expect(workspaceDefault).toEqual(defaultPolicy);
    expect(strictDefault).toEqual(strictPolicy);
  });

  it("documents every policy field once", () => {
    const keys = Object.keys(policySchema.shape).filter((key) => key !== "version");
    expect(fields.map((field) => field.key).sort()).toEqual(keys.sort());
  });

  it("formats values the way the table shows them", () => {
    expect(fieldValue(workspaceDefault, "approval_ttl_minutes")).toBe("1440 min");
    expect(fieldValue(strictDefault, "merchant_allowlist")).toBe("none");
    expect(fieldValue(workspaceDefault, "per_transaction_limit_cents")).toBe("$100.00");
  });
});
