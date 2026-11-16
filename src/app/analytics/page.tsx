import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsView } from "@/components/AnalyticsView";
import { PageLoading } from "@/components/PageLoading";
import { readEntitlement } from "@/lib/billing/session";

export const metadata: Metadata = {
  title: "Analytics · ChatArchive",
  description: "Local statistics for your imported ChatGPT conversations.",
};

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading analytics…" wide />}>
      <AnalyticsPageContent />
    </Suspense>
  );
}

async function AnalyticsPageContent() {
  const entitlement = await readEntitlement();
  return <AnalyticsView entitlement={entitlement} />;
}
