"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Brand } from "@/components/Brand";
import { useChatArchive } from "@/components/ChatArchiveProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CheckIcon } from "@/components/billing/icons";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import {
  computeAnalytics,
  type AnalyticsSummary,
} from "@/lib/analytics/conversation-analytics";
import { PLANS } from "@/lib/billing/config";
import type { Entitlement } from "@/lib/billing/types";
import {
  EmptyPanel,
  ImportLink,
  StatCard,
  formatNumber,
  pluralize,
} from "./analytics/AnalyticsUi";

function SummaryDashboard({
  analytics,
  fileName,
  warnings,
  entitlement,
}: {
  analytics: AnalyticsSummary;
  fileName: string;
  warnings: number;
  entitlement: Entitlement;
}) {
  const { coverage } = analytics;
  const total = analytics.totalVisibleMessages;
  const average = analytics.averageMessagesPerConversation;
  const userShare =
    total > 0 ? Math.round((analytics.userMessages / total) * 100) : null;
  const assistantShare =
    total > 0 ? Math.round((analytics.assistantMessages / total) * 100) : null;
  const premium = entitlement.planId === "premium";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Conversations"
          value={formatNumber(analytics.totalConversations)}
          hint={`${formatNumber(
            coverage.conversationsWithMessages,
          )} with visible messages`}
        />
        <StatCard
          label="User messages"
          value={formatNumber(analytics.userMessages)}
          hint={
            userShare === null
              ? "No visible messages in this export"
              : `${userShare}% of ${formatNumber(total)} visible messages`
          }
        />
        <StatCard
          label="Assistant messages"
          value={formatNumber(analytics.assistantMessages)}
          hint={
            assistantShare === null
              ? "No visible messages in this export"
              : `${assistantShare}% of ${formatNumber(total)} visible messages`
          }
        />
        <StatCard
          label="Avg messages / conversation"
          value={average === null ? "Not available" : average.toFixed(1)}
          available={average !== null}
          hint={
            average === null
              ? "No conversations in this export"
              : `Visible messages ÷ all ${formatNumber(
                  analytics.totalConversations,
                )} conversations`
          }
        />
      </div>

      {premium ? (
        <section className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Advanced analytics
                </h2>
                <PlanBadge planId="premium" />
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                Your Premium plan includes monthly and weekday activity charts,
                the busiest weekday and top month, the longest conversations,
                and detailed coverage notes.
              </p>
            </div>
            <Link
              href="/analytics/advanced"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Open advanced analytics
            </Link>
          </div>

          <ul className="mt-4 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            {PLANS.premium.highlights.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <UpgradePrompt featureId="analytics.advanced" compact />
      )}

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">
          About this data
        </h2>
        <ul className="mt-3 space-y-2 text-[11px] leading-5 text-muted-foreground">
          <li>
            Source:{" "}
            <span className="font-medium text-foreground">{fileName}</span>.
            Every statistic is calculated in this browser tab; nothing is
            uploaded or sent to an analytics service.
          </li>
          <li>
            {formatNumber(total)} visible{" "}
            {pluralize(total, "message", "messages")} counted;{" "}
            {formatNumber(coverage.hiddenMessagesSkipped)} hidden{" "}
            {pluralize(
              coverage.hiddenMessagesSkipped,
              "message was",
              "messages were",
            )}{" "}
            ignored.
          </li>
          <li>
            Monthly and weekday charts, conversation rankings, and detailed
            coverage notes are part of Premium advanced analytics.
          </li>
          {warnings > 0 ? (
            <li>
              {formatNumber(warnings)} parsing{" "}
              {pluralize(warnings, "warning was", "warnings were")} reported
              during import; skipped entries are not counted here.
            </li>
          ) : null}
          <li>
            Counts cover the branch selected in each exported conversation, not
            alternative branches that were edited or regenerated away.
          </li>
          <li>
            Totals are independent of your time zone. Monthly and weekday
            groupings in advanced analytics use your browser&apos;s local time
            zone.
          </li>
        </ul>
      </section>
    </div>
  );
}

export function AnalyticsView({ entitlement }: { entitlement: Entitlement }) {
  const { library } = useChatArchive();

  const conversations = library?.conversations;
  const analytics = useMemo(
    () =>
      conversations && conversations.length > 0
        ? computeAnalytics(conversations)
        : null,
    [conversations],
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Brand subtitle="Private ChatGPT export viewer" />
          <div className="flex flex-wrap items-center gap-2">
            <PlanBadge planId={entitlement.planId} />
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

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A local summary of the export loaded in this browser tab. Premium
              adds deeper charts and rankings.
            </p>
          </div>
          {library ? (
            <p
              className="max-w-full truncate text-xs text-muted-foreground"
              title={library.fileName}
            >
              Source: {library.fileName}
            </p>
          ) : null}
        </div>

        <div className="mt-6">
          {!library ? (
            <EmptyPanel
              title="No export loaded"
              description="Import your ChatGPT data export in the viewer to see statistics. The file is read entirely in this tab."
              action={<ImportLink />}
            />
          ) : !analytics ? (
            <EmptyPanel
              title="No conversations in this export"
              description="This file imported successfully but contains no conversations, so there is nothing to summarize."
              action={<ImportLink />}
            />
          ) : (
            <SummaryDashboard
              analytics={analytics}
              fileName={library.fileName}
              warnings={library.warnings.length}
              entitlement={entitlement}
            />
          )}
        </div>
      </main>
    </div>
  );
}
