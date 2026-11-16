import { describe, expect, it } from "vitest";
import type { PlanId } from "../config";
import {
  signEntitlementToken,
  verifyEntitlementToken,
  type EntitlementTokenPayload,
} from "../token";

const SECRET = "test-entitlement-signing-secret";
const NOW = 1_700_000_000_000;

function makePayload(
  overrides: Partial<EntitlementTokenPayload> = {},
): EntitlementTokenPayload {
  return {
    planId: "premium",
    expiresAt: NOW + 60_000,
    issuedAt: NOW,
    source: "dev-mock",
    ...overrides,
  };
}

describe("entitlement token", () => {
  it("round trips a valid token", () => {
    const payload = makePayload();
    const token = signEntitlementToken(payload, SECRET);

    expect(
      verifyEntitlementToken(token, {
        secret: SECRET,
        now: NOW,
        allowDevMock: true,
      }),
    ).toEqual(payload);
  });

  it("accepts server-verified tokens in production", () => {
    const payload = makePayload({ source: "verified" });
    const token = signEntitlementToken(payload, SECRET);

    expect(
      verifyEntitlementToken(token, {
        secret: SECRET,
        now: NOW,
        allowDevMock: false,
      }),
    ).toEqual(payload);
  });

  it("rejects dev-mock tokens when mock entitlements are not allowed", () => {
    const token = signEntitlementToken(makePayload(), SECRET);

    expect(
      verifyEntitlementToken(token, {
        secret: SECRET,
        now: NOW,
        allowDevMock: false,
      }),
    ).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = signEntitlementToken(makePayload(), SECRET);
    const [version, body, signature] = token.split(".");
    const replacement = body.endsWith("A") ? "B" : "A";
    const tampered = `${version}.${body.slice(0, -1)}${replacement}.${signature}`;

    expect(
      verifyEntitlementToken(tampered, { secret: SECRET, now: NOW }),
    ).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signEntitlementToken(makePayload(), SECRET);
    const [version, body, signature] = token.split(".");
    const replacement = signature.startsWith("A") ? "B" : "A";
    const tampered = `${version}.${body}.${replacement}${signature.slice(1)}`;

    expect(
      verifyEntitlementToken(tampered, { secret: SECRET, now: NOW }),
    ).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const token = signEntitlementToken(makePayload(), `${SECRET}-other`);

    expect(
      verifyEntitlementToken(token, { secret: SECRET, now: NOW }),
    ).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = signEntitlementToken(
      makePayload({ expiresAt: NOW - 1 }),
      SECRET,
    );

    expect(
      verifyEntitlementToken(token, { secret: SECRET, now: NOW }),
    ).toBeNull();
  });

  it("rejects tokens issued too far in the future", () => {
    const token = signEntitlementToken(
      makePayload({ issuedAt: NOW + 10 * 60_000 }),
      SECRET,
    );

    expect(
      verifyEntitlementToken(token, { secret: SECRET, now: NOW }),
    ).toBeNull();
  });

  it("rejects unknown plans even when correctly signed", () => {
    const token = signEntitlementToken(
      makePayload({ planId: "enterprise" as unknown as PlanId }),
      SECRET,
    );

    expect(
      verifyEntitlementToken(token, { secret: SECRET, now: NOW }),
    ).toBeNull();
  });

  it("rejects malformed and oversized tokens", () => {
    const token = signEntitlementToken(makePayload(), SECRET);

    expect(verifyEntitlementToken("", { secret: SECRET, now: NOW })).toBeNull();
    expect(verifyEntitlementToken("v1", { secret: SECRET, now: NOW })).toBeNull();
    expect(
      verifyEntitlementToken("v1.payload", { secret: SECRET, now: NOW }),
    ).toBeNull();
    expect(
      verifyEntitlementToken(token.replace("v1.", "v2."), {
        secret: SECRET,
        now: NOW,
      }),
    ).toBeNull();
    expect(
      verifyEntitlementToken("a".repeat(4097), { secret: SECRET, now: NOW }),
    ).toBeNull();
    expect(
      verifyEntitlementToken("v1.!!!!.????", { secret: SECRET, now: NOW }),
    ).toBeNull();
  });
});
