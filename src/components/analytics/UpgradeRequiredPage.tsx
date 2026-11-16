import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PremiumBadge } from "@/components/billing/PlanBadge";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import type { FeatureId } from "@/lib/billing/config";

export function UpgradeRequiredPage({
  featureId,
}: {
  featureId: FeatureId;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface/70">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Brand subtitle="Private ChatGPT export viewer" />
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Link
              href="/analytics"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="m15 6-6 6 6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Analytics
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Back to viewer
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Advanced analytics
          </h1>
          <PremiumBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          This page is part of Premium. The server checked your entitlement
          before rendering it.
        </p>

        <div className="mt-6">
          <UpgradePrompt featureId={featureId} />
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          If you believe you should already have access, check that cookies are
          enabled for this site and that your Premium entitlement has not
          expired. Clearing site data removes the entitlement cookie.
        </p>
      </main>
    </div>
  );
}
