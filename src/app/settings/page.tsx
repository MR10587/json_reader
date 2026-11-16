import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/PageLoading";
import { SettingsView } from "@/components/SettingsView";
import { readEntitlement } from "@/lib/billing/session";

export const metadata: Metadata = {
  title: "Settings · ChatArchive",
  description: "Appearance, privacy, and plan settings for ChatArchive.",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageLoading label="Loading settings…" />}>
      <SettingsPageContent />
    </Suspense>
  );
}

async function SettingsPageContent() {
  const entitlement = await readEntitlement();
  return <SettingsView entitlement={entitlement} />;
}
