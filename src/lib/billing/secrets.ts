/**
 * Server-side secret handling for entitlement cookies.
 *
 * Every runtime must provide ENTITLEMENT_SIGNING_SECRET. This prevents a
 * remotely exposed development server from sharing a known signing key.
 */

export const MIN_ENTITLEMENT_SECRET_LENGTH = 16;

export function isProductionRuntime(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv === "production";
}

export function getEntitlementSigningSecret(
  envSecret: string | undefined = process.env.ENTITLEMENT_SIGNING_SECRET,
): string | null {
  const trimmed = envSecret?.trim();
  if (trimmed && trimmed.length >= MIN_ENTITLEMENT_SECRET_LENGTH) {
    return trimmed;
  }

  return null;
}
