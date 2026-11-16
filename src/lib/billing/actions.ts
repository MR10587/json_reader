"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDevMockEnabled } from "./dev-mock";
import { clearEntitlement, writeMockEntitlement } from "./session";

const DAY_MS = 24 * 60 * 60 * 1000;
const SHORT_MOCK_TTL_MS = 2 * 60 * 1000;

function refreshBillingPages() {
  // The plan UI is rendered on several routes; revalidate the shared layout so
  // every page sees the new cookie on its next request.
  revalidatePath("/", "layout");
}

export async function mockUpgradeAction(formData: FormData): Promise<void> {
  if (!isDevMockEnabled()) return;

  const interval = formData.get("interval") === "annual" ? "annual" : "monthly";
  const ttl = formData.get("ttl");

  const duration =
    ttl === "short"
      ? SHORT_MOCK_TTL_MS
      : interval === "annual"
        ? 365 * DAY_MS
        : 30 * DAY_MS;

  await writeMockEntitlement(Date.now() + duration);
  refreshBillingPages();
  redirect("/upgrade");
}

/**
 * Writes a correctly signed cookie whose server-side expiry is already in the
 * past. This lets you verify that expiry is enforced by the server rather than
 * by the browser deleting the cookie.
 */
export async function mockExpireAction(): Promise<void> {
  if (!isDevMockEnabled()) return;

  await writeMockEntitlement(Date.now() - 60_000);
  refreshBillingPages();
  redirect("/upgrade");
}

export async function mockResetAction(): Promise<void> {
  if (!isDevMockEnabled()) return;

  await clearEntitlement();
  refreshBillingPages();
  redirect("/upgrade");
}
