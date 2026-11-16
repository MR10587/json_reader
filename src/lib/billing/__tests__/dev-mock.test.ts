import { describe, expect, it } from "vitest";
import { isDevMockEnabled } from "../dev-mock";

describe("development mock guard", () => {
  it("enables mock entitlements only with the explicit opt-in", () => {
    expect(isDevMockEnabled("development", "true")).toBe(true);
    expect(isDevMockEnabled("test", "true")).toBe(true);
    expect(isDevMockEnabled("development", undefined)).toBe(false);
  });

  it("disables mock entitlements in production", () => {
    expect(isDevMockEnabled("production", "true")).toBe(false);
  });

  it("disables mock entitlements in staging-like runtimes", () => {
    expect(isDevMockEnabled("staging", "true")).toBe(false);
    expect(isDevMockEnabled("preview", "true")).toBe(false);
  });
});
