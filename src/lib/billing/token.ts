import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS, type PlanId } from "./config";

/**
 * Compact, signed entitlement token.
 *
 * Format: `v1.<base64url(payload)>.<base64url(hmac-sha256)>`
 *
 * The payload stores only the plan id, timestamps, and source. Feature access
 * is derived from the plan on the server, so a tampered feature list cannot
 * grant anything.
 */

const TOKEN_VERSION = "v1";
const MAX_TOKEN_LENGTH = 4096;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const ALLOWED_SOURCES = new Set(["dev-mock", "verified"]);

export interface EntitlementTokenPayload {
  planId: PlanId;
  expiresAt: number;
  issuedAt: number;
  source: "dev-mock" | "verified";
}

export interface VerifyEntitlementOptions {
  secret: string;
  now?: number;
  allowDevMock?: boolean;
}

export function signEntitlementToken(
  payload: EntitlementTokenPayload,
  secret: string,
): string {
  const encodedPayload = Buffer.from(
    JSON.stringify({
      v: 1,
      plan: payload.planId,
      iat: payload.issuedAt,
      exp: payload.expiresAt,
      src: payload.source,
    }),
    "utf8",
  ).toString("base64url");

  const unsigned = `${TOKEN_VERSION}.${encodedPayload}`;
  const signature = createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64url");

  return `${unsigned}.${signature}`;
}

export function verifyEntitlementToken(
  token: string,
  options: VerifyEntitlementOptions,
): EntitlementTokenPayload | null {
  if (typeof token !== "string") return null;
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [version, encodedPayload, encodedSignature] = parts;
  if (version !== TOKEN_VERSION) return null;
  if (!encodedPayload || !encodedSignature) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(encodedPayload)) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(encodedSignature)) return null;

  const expectedSignature = createHmac("sha256", options.secret)
    .update(`${version}.${encodedPayload}`)
    .digest();
  const providedSignature = Buffer.from(encodedSignature, "base64url");

  if (providedSignature.length !== expectedSignature.length) return null;
  if (!timingSafeEqual(providedSignature, expectedSignature)) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    return null;
  }

  if (!isRecord(raw)) return null;
  if (raw.v !== 1) return null;

  if (typeof raw.plan !== "string") return null;
  if (!Object.prototype.hasOwnProperty.call(PLANS, raw.plan)) return null;

  if (typeof raw.iat !== "number" || !Number.isFinite(raw.iat)) return null;
  if (typeof raw.exp !== "number" || !Number.isFinite(raw.exp)) return null;
  if (typeof raw.src !== "string" || !ALLOWED_SOURCES.has(raw.src)) return null;

  const now = options.now ?? Date.now();
  if (raw.exp <= now) return null;
  if (raw.iat > now + MAX_FUTURE_CLOCK_SKEW_MS) return null;

  // A development mock must never grant premium outside development/test,
  // even if the cookie was signed with the same secret.
  if (!options.allowDevMock && raw.src === "dev-mock") return null;

  return {
    planId: raw.plan as PlanId,
    expiresAt: raw.exp,
    issuedAt: raw.iat,
    source: raw.src as "dev-mock" | "verified",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
