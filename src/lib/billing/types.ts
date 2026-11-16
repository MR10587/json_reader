import type { FeatureId, PlanId } from "./config";

/**
 * Where an entitlement came from. `none` is the default Free state. `dev-mock`
 * is only accepted outside production. `verified` is reserved for a future
 * server-side payment/subscription lookup.
 */
export type EntitlementSource = "none" | "dev-mock" | "verified";

/**
 * Narrow, serializable entitlement passed to client components. It never
 * contains the signing secret, the raw cookie, or a client-controlled boolean
 * that could grant access.
 */
export interface Entitlement {
  planId: PlanId;
  planName: string;
  features: readonly FeatureId[];
  expiresAt: number | null;
  source: EntitlementSource;
  isDevMock: boolean;
}
