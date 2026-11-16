import { describe, expect, it } from "vitest";
import { getEntitlementSigningSecret, isProductionRuntime } from "../secrets";

describe("entitlement secrets", () => {
  it("fails closed in every runtime when the secret is missing", () => {
    expect(getEntitlementSigningSecret(undefined)).toBeNull();
    expect(getEntitlementSigningSecret("")).toBeNull();
  });

  it("accepts a sufficiently long production secret", () => {
    expect(
      getEntitlementSigningSecret("0123456789abcdef"),
    ).toBe("0123456789abcdef");
  });

  it("trims a production secret", () => {
    expect(
      getEntitlementSigningSecret("  0123456789abcdef  "),
    ).toBe("0123456789abcdef");
  });

  it("fails closed in production when the secret is missing or short", () => {
    expect(getEntitlementSigningSecret(undefined)).toBeNull();
    expect(getEntitlementSigningSecret("short")).toBeNull();
    expect(getEntitlementSigningSecret("                ")).toBeNull();
  });

  it("detects the production runtime", () => {
    expect(isProductionRuntime("production")).toBe(true);
    expect(isProductionRuntime("development")).toBe(false);
  });
});
