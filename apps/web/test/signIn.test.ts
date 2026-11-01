import { describe, expect, it } from "vitest";
import { ApiError, signInProblem } from "../src/lib/api";

const unreachable = "The demo workspace is not reachable right now. Try again in a moment.";

describe("signInProblem", () => {
  it("tells a visitor the demo is unreachable when the network fails or the server errors", () => {
    expect(signInProblem(new TypeError("Failed to fetch"), "demo")).toBe(unreachable);
    expect(signInProblem(new ApiError("The server answered with status 502. Check that the proxy is running.", 502), "demo")).toBe(unreachable);
  });

  it("keeps the wrong password copy for a 401", () => {
    expect(signInProblem(new ApiError("x", 401), "password")).toBe("That password is not correct. Check it and try again.");
    expect(signInProblem(new ApiError("x", 401), "demo")).toBe("The demo workspace did not open. Try again, or sign in with the owner password.");
  });

  it("never mentions the proxy", () => {
    expect(signInProblem(new ApiError("x", 500), "password")).not.toMatch(/proxy/);
  });
});
