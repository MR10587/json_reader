import { isDevMockEnabled } from "@/lib/billing/dev-mock";
import { readEntitlement } from "@/lib/billing/session";
import { MockEntitlementControls } from "./MockEntitlementControls";
import { PlanSummary } from "./PlanSummary";

export async function CurrentPlanPanel() {
  const entitlement = await readEntitlement();
  const devMockEnabled = isDevMockEnabled();

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Your plan</h2>
        <p className="text-[11px] text-muted-foreground">
          Verified on the server from a signed, HttpOnly cookie.
        </p>
      </div>

      <div className="mt-4">
        <PlanSummary entitlement={entitlement} />
      </div>

      {devMockEnabled ? (
        <div className="mt-5">
          <MockEntitlementControls />
        </div>
      ) : null}
    </section>
  );
}
