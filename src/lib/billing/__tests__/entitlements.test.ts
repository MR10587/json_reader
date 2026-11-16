import { describe, expect, it } from "vitest";
import {
  ALL_FEATURE_IDS,
  FEATURES,
  FREE_FEATURE_IDS,
  PLANS,
  PREMIUM_FEATURE_IDS,
  formatPrice,
  getAnnualSavingsPercent,
  getMonthlyEquivalent,
} from "../config";
import {
  createFreeEntitlement,
  createPaidEntitlement,
  hasFeature,
  isPremium,
} from "../entitlements";

describe("billing configuration", () => {
  it("marks advanced analytics as the only premium feature", () => {
    expect(PREMIUM_FEATURE_IDS).toEqual(["analytics.advanced"]);
    expect(FEATURES["analytics.advanced"].tier).toBe("premium");
  });

  it("derives plan feature lists from feature tiers", () => {
    expect(PLANS.free.features).toEqual(FREE_FEATURE_IDS);
    expect(PLANS.premium.features).toEqual(ALL_FEATURE_IDS);
    expect(PLANS.free.features).not.toContain("analytics.advanced");
    expect(PLANS.premium.features).toContain("analytics.advanced");
  });

  it("formats prices from integer cents", () => {
    expect(formatPrice(0)).toBe("$0");
    expect(formatPrice(600)).toBe("$6");
    expect(formatPrice(650)).toBe("$6.50");
  });

  it("computes annual savings and the monthly equivalent", () => {
    expect(getAnnualSavingsPercent(600, 6000)).toBe(17);
    expect(getAnnualSavingsPercent(0, 0)).toBe(0);
    expect(getAnnualSavingsPercent(600, 7200)).toBe(0);
    expect(getMonthlyEquivalent(6000)).toBe(500);
  });
});

describe("entitlement resolution", () => {
  it("creates a Free entitlement with free features only", () => {
    const entitlement = createFreeEntitlement();

    expect(entitlement.planId).toBe("free");
    expect(entitlement.features).toEqual(FREE_FEATURE_IDS);
    expect(entitlement.source).toBe("none");
    expect(entitlement.expiresAt).toBeNull();
    expect(hasFeature(entitlement, "analytics.summary")).toBe(true);
    expect(hasFeature(entitlement, "analytics.advanced")).toBe(false);
    expect(isPremium(entitlement)).toBe(false);
  });

  it("creates a Premium entitlement with every feature", () => {
    const entitlement = createPaidEntitlement("premium", {
      expiresAt: 1_700_000_000_000,
      source: "dev-mock",
      isDevMock: true,
    });

    expect(entitlement.planId).toBe("premium");
    expect(entitlement.features).toEqual(ALL_FEATURE_IDS);
    expect(hasFeature(entitlement, "analytics.advanced")).toBe(true);
    expect(entitlement.isDevMock).toBe(true);
    expect(isPremium(entitlement)).toBe(true);
  });

  it("infers the dev-mock marker from the source", () => {
    const entitlement = createPaidEntitlement("premium", {
      expiresAt: 1,
      source: "dev-mock",
    });

    expect(entitlement.isDevMock).toBe(true);
  });
});
