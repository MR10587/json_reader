import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
}));

import {
  ENTITLEMENT_COOKIE_NAME,
  clearEntitlement,
  readEntitlement,
  writeMockEntitlement,
} from "../session";
import { signEntitlementToken } from "../token";

const NOW = 1_700_000_000_000;
const PRODUCTION_SECRET = "production-test-secret-1234";
const DEVELOPMENT_SECRET = "development-test-secret-1234";

function premiumToken(
  options: {
    expiresAt?: number;
    source?: "dev-mock" | "verified";
    secret?: string;
  } = {},
): string {
  return signEntitlementToken(
    {
      planId: "premium",
      expiresAt: options.expiresAt ?? NOW + 60_000,
      issuedAt: NOW,
      source: options.source ?? "dev-mock",
    },
    options.secret ?? DEVELOPMENT_SECRET,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv("CHATARCHIVE_ENABLE_DEV_MOCKS", "true");
  vi.stubEnv("ENTITLEMENT_SIGNING_SECRET", DEVELOPMENT_SECRET);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("entitlement session", () => {
  it("returns Free when the cookie is missing", async () => {
    cookieStore.get.mockReturnValue(undefined);

    const entitlement = await readEntitlement();

    expect(entitlement.planId).toBe("free");
    expect(entitlement.source).toBe("none");
  });

  it("returns Premium for a valid signed cookie", async () => {
    cookieStore.get.mockReturnValue({
      name: ENTITLEMENT_COOKIE_NAME,
      value: premiumToken(),
    });

    const entitlement = await readEntitlement();

    expect(entitlement.planId).toBe("premium");
    expect(entitlement.isDevMock).toBe(true);
  });

  it("returns Free for an expired cookie", async () => {
    cookieStore.get.mockReturnValue({
      name: ENTITLEMENT_COOKIE_NAME,
      value: premiumToken({ expiresAt: NOW - 1 }),
    });

    expect((await readEntitlement()).planId).toBe("free");
  });

  it("returns Free for a tampered cookie", async () => {
    cookieStore.get.mockReturnValue({
      name: ENTITLEMENT_COOKIE_NAME,
      value: `${premiumToken()}x`,
    });

    expect((await readEntitlement()).planId).toBe("free");
  });

  it("returns Free in production when no signing secret is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENTITLEMENT_SIGNING_SECRET", "");

    expect((await readEntitlement()).planId).toBe("free");
    expect(cookieStore.get).not.toHaveBeenCalled();
  });

  it("rejects a dev-mock cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENTITLEMENT_SIGNING_SECRET", PRODUCTION_SECRET);
    cookieStore.get.mockReturnValue({
      name: ENTITLEMENT_COOKIE_NAME,
      value: premiumToken({ secret: PRODUCTION_SECRET }),
    });

    expect((await readEntitlement()).planId).toBe("free");
  });

  it("rejects a dev-mock cookie in staging-like runtimes", async () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv("ENTITLEMENT_SIGNING_SECRET", PRODUCTION_SECRET);
    cookieStore.get.mockReturnValue({
      name: ENTITLEMENT_COOKIE_NAME,
      value: premiumToken({ secret: PRODUCTION_SECRET }),
    });

    expect((await readEntitlement()).planId).toBe("free");
  });

  it("accepts a server-verified cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENTITLEMENT_SIGNING_SECRET", PRODUCTION_SECRET);
    cookieStore.get.mockReturnValue({
      name: ENTITLEMENT_COOKIE_NAME,
      value: premiumToken({
        source: "verified",
        secret: PRODUCTION_SECRET,
      }),
    });

    const entitlement = await readEntitlement();

    expect(entitlement.planId).toBe("premium");
    expect(entitlement.isDevMock).toBe(false);
  });

  it("writes an HttpOnly dev-mock cookie outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENTITLEMENT_SIGNING_SECRET", DEVELOPMENT_SECRET);

    await writeMockEntitlement(NOW + 60_000);

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const [name, value, options] = cookieStore.set.mock.calls[0]!;
    expect(name).toBe(ENTITLEMENT_COOKIE_NAME);
    expect(typeof value).toBe("string");
    expect(options).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });

  it("does not write a cookie in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENTITLEMENT_SIGNING_SECRET", PRODUCTION_SECRET);

    await writeMockEntitlement(NOW + 60_000);

    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("clears the cookie outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await clearEntitlement();

    expect(cookieStore.delete).toHaveBeenCalledWith(ENTITLEMENT_COOKIE_NAME);
  });
});
