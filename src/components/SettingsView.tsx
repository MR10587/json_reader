"use client";

import Link from "next/link";
import { Brand } from "@/components/Brand";
import { useChatArchive } from "@/components/ChatArchiveProvider";
import { ThemeSelector } from "@/components/ThemeToggle";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { PlanSummary } from "@/components/billing/PlanSummary";
import type { Entitlement } from "@/lib/billing/types";
import { formatTimestamp } from "@/lib/ui/format";

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsView({ entitlement }: { entitlement: Entitlement }) {
  const { library } = useChatArchive();
  const importedAt = library ? formatTimestamp(library.importedAt) : null;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface/70">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Brand subtitle="Private ChatGPT export viewer" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PlanBadge planId={entitlement.planId} />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to viewer
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Appearance and privacy details for this browser tab.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <Card
            title="Plan &amp; entitlements"
            description="Your plan is verified on the server from a signed, HttpOnly cookie. No real payment is processed in this preview."
          >
            <PlanSummary entitlement={entitlement} />
            {entitlement.isDevMock ? (
              <p className="mt-3 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-[11px] leading-4 text-warning">
                Development mock. Use the controls on the upgrade page to change
                or reset this entitlement.
              </p>
            ) : null}
          </Card>

          <Card title="Appearance" description="Choose how ChatArchive looks on this device.">
            <ThemeSelector />
          </Card>

          <Card
            title="Current session"
            description="Imported conversations live in memory only and are cleared when this page is reloaded."
          >
            {library ? (
              <dl className="space-y-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">File</dt>
                  <dd className="max-w-[70%] truncate font-medium text-foreground">{library.fileName}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Conversations</dt>
                  <dd className="font-medium text-foreground">{library.conversations.length}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Parsing warnings</dt>
                  <dd className="font-medium text-foreground">{library.warnings.length}</dd>
                </div>
                {importedAt ? (
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted-foreground">Imported</dt>
                    <dd className="font-medium text-foreground">{importedAt}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-4">
                <p className="text-sm text-muted-foreground">
                  No export is loaded in this tab right now.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Import an export
                </Link>
              </div>
            )}
          </Card>

          <Card title="Privacy">
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                ZIP files are read and parsed entirely in this browser tab.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                Conversation content is never sent to a server, API route, or analytics service.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                Conversation content is never written to local storage. Only your theme preference
                and a signed entitlement cookie are stored.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                Reloading or closing this tab clears the imported conversations from memory.
              </li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}
