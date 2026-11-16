"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  MonthlyActivityChart,
  WeekdayActivityChart,
} from "@/components/AnalyticsCharts";
import { Brand } from "@/components/Brand";
import { useChatArchive } from "@/components/ChatArchiveProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TopConversationsList } from "@/components/TopConversationsList";
import { PlanBadge, PremiumBadge } from "@/components/billing/PlanBadge";
import {
  computeAnalytics,
  type AnalyticsSummary,
} from "@/lib/analytics/conversation-analytics";
import type { Entitlement } from "@/lib/billing/types";
import {
  EmptyPanel,
  ImportLink,
  StatCard,
  formatNumber,
  pluralize,
} from "./AnalyticsUi";

function AdvancedDashboard({
  analytics,
  fileName,
  warnings,
  onOpenConversation,
}: {
  analytics: AnalyticsSummary;
  fileName: string;
  warnings: number;
  onOpenConversation: (index: number) => void;
}) {
  const { coverage } = analytics;
  const total = analytics.totalVisibleMessages;
  const busiest = analytics.weekday.busiest;
  const topMonth = analytics.monthly.top[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Busiest weekday"
          value={
            busiest.length > 0
              ? busiest.map((bucket) => bucket.label).join(" / ")
              : "Not available"
          }
          available={busiest.length > 0}
          hint={
            busiest.length > 0
              ? `${formatNumber(analytics.weekday.maxMessages)} visible ${pluralize(
                  analytics.weekday.maxMessages,
                  "message",
                  "messages",
                )} on the busiest day`
              : "No message timestamps in this export"
          }
        />
        <StatCard
          label="Top month"
          value={topMonth ? topMonth.label : "Not available"}
          available={topMonth !== null}
          hint={
            topMonth
              ? `${formatNumber(topMonth.conversations)} ${pluralize(
                  topMonth.conversations,
                  "conversation",
                  "conversations",
                )} created`
              : "No conversation creation dates in this export"
          }
        />
        <StatCard
          label="Timed messages"
          value={formatNumber(coverage.messagesWithCreateTime)}
          hint={
            coverage.messagesMissingCreateTime > 0
              ? `${formatNumber(
                  coverage.messagesMissingCreateTime,
                )} without a timestamp are excluded from weekday activity`
              : `All ${formatNumber(total)} visible messages have a timestamp`
          }
        />
        <StatCard
          label="Dated conversations"
          value={formatNumber(coverage.conversationsWithCreateTime)}
          hint={
            coverage.conversationsMissingCreateTime > 0
              ? `${formatNumber(
                  coverage.conversationsMissingCreateTime,
                )} without a creation date are excluded from monthly activity`
              : `All ${formatNumber(
                  analytics.totalConversations,
                )} conversations have a creation date`
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <MonthlyActivityChart
          buckets={analytics.monthly.buckets}
          top={analytics.monthly.top}
        />
        <WeekdayActivityChart
          buckets={analytics.weekday.buckets}
          available={analytics.weekday.available}
        />
      </div>

      <TopConversationsList
        items={analytics.topConversations}
        onSelect={onOpenConversation}
      />

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">
          About this data
        </h2>
        <ul className="mt-3 space-y-2 text-[11px] leading-5 text-muted-foreground">
          <li>
            Source: <span className="font-medium text-foreground">{fileName}</span>
            . Every statistic is calculated in this browser tab; nothing is
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
            {formatNumber(coverage.conversationsWithCreateTime)} of{" "}
            {formatNumber(analytics.totalConversations)} conversations have a
            creation date
            {coverage.conversationsMissingCreateTime > 0
              ? `; ${formatNumber(
                  coverage.conversationsMissingCreateTime,
                )} without one are excluded from the monthly chart`
              : ""}
            .
          </li>
          <li>
            {formatNumber(coverage.messagesWithCreateTime)} of{" "}
            {formatNumber(total)} visible messages have a timestamp
            {coverage.messagesMissingCreateTime > 0
              ? `; ${formatNumber(
                  coverage.messagesMissingCreateTime,
                )} without one are excluded from the weekday chart`
              : ""}
            .
          </li>
          <li>
            {formatNumber(analytics.otherMessages)} visible system, tool or
            unknown{" "}
            {pluralize(
              analytics.otherMessages,
              "message is",
              "messages are",
            )}{" "}
            included in totals and weekday activity, but not in the user or
            assistant cards.
          </li>
          <li>
            {formatNumber(coverage.conversationsWithModel)} of{" "}
            {formatNumber(analytics.totalConversations)} conversations have a
            recorded model label. Exports do not contain reliable token usage,
            so no token statistics are shown.
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
            Months and weekdays use your browser&apos;s local time zone, so
            totals can differ slightly from another device.
          </li>
        </ul>
      </section>
    </div>
  );
}

export function AdvancedAnalyticsView({
  entitlement,
}: {
  entitlement: Entitlement;
}) {
  const { library, selectConversation } = useChatArchive();
  const router = useRouter();

  const conversations = library?.conversations;
  const analytics = useMemo(
    () =>
      conversations && conversations.length > 0
        ? computeAnalytics(conversations)
        : null,
    [conversations],
  );

  const handleOpenConversation = useCallback(
    (index: number) => {
      selectConversation(index);
      router.push("/");
    },
    [router, selectConversation],
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

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Advanced analytics
              </h1>
              <PremiumBadge />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Premium charts and conversation rankings for the export loaded in
              this browser tab. Nothing is uploaded.
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
              description="Import your ChatGPT data export in the viewer to see advanced statistics. The file is read entirely in this tab."
              action={<ImportLink />}
            />
          ) : !analytics ? (
            <EmptyPanel
              title="No conversations in this export"
              description="This file imported successfully but contains no conversations, so there is nothing to summarize."
              action={<ImportLink />}
            />
          ) : (
            <AdvancedDashboard
              analytics={analytics}
              fileName={library.fileName}
              warnings={library.warnings.length}
              onOpenConversation={handleOpenConversation}
            />
          )}
        </div>
      </main>
    </div>
  );
}
