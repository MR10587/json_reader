import { PLANS, type FeatureId, type PlanId } from "./config";
import type { Entitlement, EntitlementSource } from "./types";

export function createFreeEntitlement(): Entitlement {
  return {
    planId: "free",
    planName: PLANS.free.name,
    features: PLANS.free.features,
    expiresAt: null,
    source: "none",
    isDevMock: false,
  };
}

export function createPaidEntitlement(
  planId: Exclude<PlanId, "free">,
  options: {
    expiresAt: number;
    source: EntitlementSource;
    isDevMock?: boolean;
  },
): Entitlement {
  const plan = PLANS[planId];

  return {
    planId,
    planName: plan.name,
    features: plan.features,
    expiresAt: options.expiresAt,
    source: options.source,
    isDevMock: options.isDevMock ?? options.source === "dev-mock",
  };
}

export function hasFeature(
  entitlement: Entitlement,
  featureId: FeatureId,
): boolean {
  return entitlement.features.includes(featureId);
}

export function isPremium(entitlement: Entitlement): boolean {
  return entitlement.planId === "premium";
}
