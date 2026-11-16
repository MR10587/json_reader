import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { mockUpgradeAction } from "@/lib/billing/actions";
import { PRICING } from "@/lib/billing/config";
import { isDevMockEnabled } from "@/lib/billing/dev-mock";
import { PricingTable } from "./PricingTable";

export function UpgradeShell({ planPanel }: { planPanel: ReactNode }) {
  const devMockEnabled = isDevMockEnabled();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface/70">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Brand subtitle="Private ChatGPT export viewer" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
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
              Back to viewer
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Plans &amp; pricing
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Your conversations and basic reading stay free. Premium adds deeper
            analytics for understanding your history over time.
          </p>
        </div>

        {devMockEnabled ? (
          <div className="mt-5 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-xs text-warning">
            <p className="font-semibold">Development mode</p>
            <p className="mt-1 leading-5">{PRICING.devNote}</p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">
              Payments not enabled
            </p>
            <p className="mt-1 leading-5">{PRICING.productionNote}</p>
          </div>
        )}

        <div className="mt-6">{planPanel}</div>

        <div className="mt-6">
          <PricingTable
            devMockEnabled={devMockEnabled}
            upgradeAction={devMockEnabled ? mockUpgradeAction : undefined}
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {PRICING.alwaysFreeNote}
        </p>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-5 text-xs text-muted-foreground shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">
            How Premium works in this preview
          </h2>
          <ul className="mt-3 space-y-2 leading-5">
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              The server reads a signed, HttpOnly entitlement cookie and verifies
              its signature and expiry on every request.
            </li>
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              Premium access is never granted from localStorage or a client-side
              boolean. Client components only receive the resolved plan.
            </li>
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              No real payment is processed in this stage. Development controls
              simulate Premium and are disabled in production.
            </li>
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              A future payment provider can replace the mock issuer while keeping
              the same server-side verification seam.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
