import type { Metadata } from "next";
import { Suspense } from "react";
import { CurrentPlanPanel } from "@/components/billing/CurrentPlanPanel";
import { PlanPanelSkeleton } from "@/components/billing/PlanPanelSkeleton";
import { UpgradeShell } from "@/components/billing/UpgradeShell";

export const metadata: Metadata = {
  title: "Plans & pricing · ChatArchive",
  description: "Compare the Free and Premium ChatArchive plans.",
};

export default function UpgradePage() {
  return (
    <UpgradeShell
      planPanel={
        <Suspense fallback={<PlanPanelSkeleton />}>
          <CurrentPlanPanel />
        </Suspense>
      }
    />
  );
}
