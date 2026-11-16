import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import { AdvancedAnalyticsGate } from "@/components/analytics/AdvancedAnalyticsGate";

export const metadata: Metadata = {
  title: "Advanced analytics · ChatArchive",
  description: "Premium analytics for your imported ChatGPT conversations.",
};

export default function AdvancedAnalyticsPage() {
  return (
    <Suspense fallback={<PageLoading label="Checking your plan…" wide />}>
      <AdvancedAnalyticsGate />
    </Suspense>
  );
}
