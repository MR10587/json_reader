import { hasFeature } from "@/lib/billing/entitlements";
import { readEntitlement } from "@/lib/billing/session";
import { AdvancedAnalyticsView } from "./AdvancedAnalyticsView";
import { UpgradeRequiredPage } from "./UpgradeRequiredPage";

export async function AdvancedAnalyticsGate() {
  const entitlement = await readEntitlement();

  if (!hasFeature(entitlement, "analytics.advanced")) {
    return <UpgradeRequiredPage featureId="analytics.advanced" />;
  }

  return <AdvancedAnalyticsView entitlement={entitlement} />;
}
