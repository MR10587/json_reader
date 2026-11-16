/**
 * Development-only mock entitlements.
 *
 * The upgrade UI and all mock server actions are enabled only in development
 * and test runtimes. This function is intentionally pure so the guard can be
 * tested without Next.js.
 */
export function isDevMockEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  enabled: string | undefined = process.env.CHATARCHIVE_ENABLE_DEV_MOCKS,
): boolean {
  return (
    (nodeEnv === "development" || nodeEnv === "test") && enabled === "true"
  );
}
