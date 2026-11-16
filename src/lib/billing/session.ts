import { cookies } from "next/headers";
import { connection } from "next/server";
import { isDevMockEnabled } from "./dev-mock";
import {
  createFreeEntitlement,
  createPaidEntitlement,
} from "./entitlements";
import {
  getEntitlementSigningSecret,
  isProductionRuntime,
} from "./secrets";
import { signEntitlementToken, verifyEntitlementToken } from "./token";
import type { Entitlement } from "./types";

/**
 * Server-only entitlement session.
 *
 * The cookie is a signed, HttpOnly bearer token. Every read re-verifies the
 * signature and expiry against the server clock, so a forged or stale cookie
 * resolves to Free. Client components never import this module; they receive a
 * narrow `Entitlement` object from a server component instead.
 */

export const ENTITLEMENT_COOKIE_NAME = "chatarchive_entitlement";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 366;
const MIN_COOKIE_MAX_AGE_SECONDS = 60;

export async function readEntitlement(): Promise<Entitlement> {
  // Always read request data, even when no signing secret is configured (the
  // production fail-closed path). Cache Components only marks this subtree as
  // request-time if a request-time API is actually called during prerender.
  // Skipping this call would let Next.js cache the Free result statically and
  // serve it to every visitor, including Premium subscribers.
  //
  // `connection()` additionally defers the clock read in token verification,
  // which Cache Components rejects during prerendering.
  await connection();
  const cookieStore = await cookies();

  const secret = getEntitlementSigningSecret();
  if (!secret) return createFreeEntitlement();

  const token = cookieStore.get(ENTITLEMENT_COOKIE_NAME)?.value;
  if (!token) return createFreeEntitlement();

  const payload = verifyEntitlementToken(token, {
    secret,
    allowDevMock: isDevMockEnabled(),
  });

  if (!payload) return createFreeEntitlement();
  if (payload.planId === "free") return createFreeEntitlement();

  return createPaidEntitlement(payload.planId, {
    expiresAt: payload.expiresAt,
    source: payload.source,
    isDevMock: payload.source === "dev-mock",
  });
}

/**
 * Writes a signed development-mock Premium cookie. This is intentionally
 * guarded on the server and never runs in production.
 */
export async function writeMockEntitlement(expiresAt: number): Promise<void> {
  if (!isDevMockEnabled()) return;

  const secret = getEntitlementSigningSecret();
  if (!secret) return;

  const now = Date.now();
  const token = signEntitlementToken(
    {
      planId: "premium",
      expiresAt,
      issuedAt: now,
      source: "dev-mock",
    },
    secret,
  );

  const maxAge = Math.max(
    MIN_COOKIE_MAX_AGE_SECONDS,
    Math.min(MAX_AGE_SECONDS, Math.ceil((expiresAt - now) / 1000)),
  );

  const cookieStore = await cookies();
  cookieStore.set(ENTITLEMENT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionRuntime(),
    path: "/",
    maxAge,
  });
}

export async function clearEntitlement(): Promise<void> {
  if (!isDevMockEnabled()) return;

  const cookieStore = await cookies();
  cookieStore.delete(ENTITLEMENT_COOKIE_NAME);
}
