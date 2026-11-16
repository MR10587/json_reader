import type { Conversation } from "@/lib/chatgpt-export";

/**
 * Pure, browser-only analytics for an imported ChatGPT export.
 *
 * Design rules:
 * - Only information present in the normalized export is used. Nothing is
 *   inferred from other fields and no network requests are made.
 * - Time buckets use the browser's local time zone.
 * - Counts reflect the selected branch of each conversation, because the
 *   parser only keeps the branch reachable from `current_node`.
 * - Missing timestamps are excluded and reported instead of treated as zero.
 */

const titleCollator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

const weekdayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});

export const TOP_CONVERSATION_LIMIT = 5;
export const TOP_MONTH_LIMIT = 3;

/** Monday-first display order; values match `Date#getDay()`. */
const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export interface MonthlyBucket {
  /** Stable `YYYY-MM` key, safe for sorting and keys. */
  key: string;
  year: number;
  /** Zero-based month, matching `Date#getMonth()`. */
  month: number;
  /** Localized, human-readable label. */
  label: string;
  conversations: number;
}

export interface WeekdayBucket {
  /** `Date#getDay()` value: 0 = Sunday. */
  weekday: number;
  label: string;
  messages: number;
}

export interface TopConversation {
  /** Index in the original imported library, used for selection. */
  index: number;
  id: string;
  title: string;
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  /** updateTime, falling back to createTime. */
  lastActivity: number | null;
  /** updateTime - createTime when both are present and ordered. */
  durationMs: number | null;
  model: string | null;
}

export interface AnalyticsCoverage {
  /** Hidden messages are ignored even if they contain content. */
  hiddenMessagesSkipped: number;
  conversationsWithCreateTime: number;
  conversationsMissingCreateTime: number;
  /** Visible messages only. */
  messagesWithCreateTime: number;
  messagesMissingCreateTime: number;
  conversationsWithModel: number;
  conversationsWithMessages: number;
  conversationsWithoutMessages: number;
}

export interface MonthlyAnalytics {
  /** False when no conversation has a usable creation timestamp. */
  available: boolean;
  buckets: MonthlyBucket[];
  top: MonthlyBucket[];
}

export interface WeekdayAnalytics {
  /** False when no visible message has a usable timestamp. */
  available: boolean;
  buckets: WeekdayBucket[];
  /** Every weekday tied for the highest count; empty when unavailable. */
  busiest: WeekdayBucket[];
  maxMessages: number;
}

export interface AnalyticsSummary {
  totalConversations: number;
  totalVisibleMessages: number;
  userMessages: number;
  assistantMessages: number;
  /** Visible system, tool and unknown messages. */
  otherMessages: number;
  /** Null when there are no conversations (not the same as zero). */
  averageMessagesPerConversation: number | null;
  monthly: MonthlyAnalytics;
  weekday: WeekdayAnalytics;
  topConversations: TopConversation[];
  coverage: AnalyticsCoverage;
}

interface MonthAccumulator {
  year: number;
  month: number;
  conversations: number;
}

interface ConversationStats {
  index: number;
  conversation: Conversation;
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
}

function isValidTimestamp(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function weekdayLabel(weekday: number): string {
  // 2023-01-01 was a Sunday, so this maps 0..6 onto the right weekday.
  return weekdayLabelFormatter.format(new Date(2023, 0, 1 + weekday));
}

/** Expands the observed months so gaps inside the range show as real zeros. */
function buildMonthlyBuckets(
  observed: ReadonlyMap<string, MonthAccumulator>,
): MonthlyBucket[] {
  if (observed.size === 0) return [];

  const keys = [...observed.keys()].sort();
  const first = observed.get(keys[0]);
  const last = observed.get(keys[keys.length - 1]);
  if (!first || !last) return [];

  const buckets: MonthlyBucket[] = [];
  let year = first.year;
  let month = first.month;

  while (year < last.year || (year === last.year && month <= last.month)) {
    const key = monthKey(year, month);
    buckets.push({
      key,
      year,
      month,
      label: monthLabelFormatter.format(new Date(year, month, 1)),
      conversations: observed.get(key)?.conversations ?? 0,
    });

    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }

  return buckets;
}

function rankMonths(buckets: readonly MonthlyBucket[]): MonthlyBucket[] {
  return buckets
    .filter((bucket) => bucket.conversations > 0)
    .sort(
      (a, b) => b.conversations - a.conversations || a.key.localeCompare(b.key),
    )
    .slice(0, TOP_MONTH_LIMIT);
}

function buildWeekdayBuckets(counts: readonly number[]): WeekdayBucket[] {
  return WEEKDAY_DISPLAY_ORDER.map((weekday) => ({
    weekday,
    label: weekdayLabel(weekday),
    messages: counts[weekday] ?? 0,
  }));
}

function conversationDuration(conversation: Conversation): number | null {
  const { createTime, updateTime } = conversation;
  if (!isValidTimestamp(createTime) || !isValidTimestamp(updateTime)) {
    return null;
  }
  if (updateTime < createTime) return null;
  return updateTime - createTime;
}

export function computeAnalytics(
  conversations: readonly Conversation[],
): AnalyticsSummary {
  let userMessages = 0;
  let assistantMessages = 0;
  let otherMessages = 0;
  let hiddenMessagesSkipped = 0;
  let messagesWithCreateTime = 0;
  let messagesMissingCreateTime = 0;
  let conversationsWithCreateTime = 0;
  let conversationsWithModel = 0;
  let conversationsWithMessages = 0;

  const monthly = new Map<string, MonthAccumulator>();
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  const stats: ConversationStats[] = [];

  conversations.forEach((conversation, index) => {
    if (isValidTimestamp(conversation.createTime)) {
      conversationsWithCreateTime += 1;
      const date = new Date(conversation.createTime);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = monthKey(year, month);
      const existing = monthly.get(key);
      if (existing) {
        existing.conversations += 1;
      } else {
        monthly.set(key, { year, month, conversations: 1 });
      }
    }

    if (conversation.model !== null) conversationsWithModel += 1;

    let messageCount = 0;
    let userCount = 0;
    let assistantCount = 0;

    for (const message of conversation.messages) {
      if (message.hidden) {
        hiddenMessagesSkipped += 1;
        continue;
      }
      if (message.parts.length === 0) continue;

      messageCount += 1;
      if (message.role === "user") {
        userCount += 1;
        userMessages += 1;
      } else if (message.role === "assistant") {
        assistantCount += 1;
        assistantMessages += 1;
      } else {
        otherMessages += 1;
      }

      if (isValidTimestamp(message.createTime)) {
        messagesWithCreateTime += 1;
        weekdayCounts[new Date(message.createTime).getDay()] += 1;
      } else {
        messagesMissingCreateTime += 1;
      }
    }

    if (messageCount > 0) conversationsWithMessages += 1;

    stats.push({
      index,
      conversation,
      messageCount,
      userMessages: userCount,
      assistantMessages: assistantCount,
    });
  });

  const totalConversations = conversations.length;
  const totalVisibleMessages = userMessages + assistantMessages + otherMessages;
  const monthlyBuckets = buildMonthlyBuckets(monthly);
  const weekdayBuckets = buildWeekdayBuckets(weekdayCounts);
  const maxMessages = weekdayCounts.reduce(
    (max, count) => Math.max(max, count),
    0,
  );

  const topConversations = stats
    .filter((entry) => entry.messageCount > 0)
    .sort(
      (a, b) =>
        b.messageCount - a.messageCount ||
        titleCollator.compare(a.conversation.title, b.conversation.title) ||
        a.index - b.index,
    )
    .slice(0, TOP_CONVERSATION_LIMIT)
    .map<TopConversation>((entry) => {
      const { conversation } = entry;
      return {
        index: entry.index,
        id: conversation.id,
        title: conversation.title,
        messageCount: entry.messageCount,
        userMessages: entry.userMessages,
        assistantMessages: entry.assistantMessages,
        lastActivity: isValidTimestamp(conversation.updateTime)
          ? conversation.updateTime
          : isValidTimestamp(conversation.createTime)
            ? conversation.createTime
            : null,
        durationMs: conversationDuration(conversation),
        model: conversation.model,
      };
    });

  return {
    totalConversations,
    totalVisibleMessages,
    userMessages,
    assistantMessages,
    otherMessages,
    averageMessagesPerConversation:
      totalConversations === 0 ? null : totalVisibleMessages / totalConversations,
    monthly: {
      available: conversationsWithCreateTime > 0,
      buckets: monthlyBuckets,
      top: rankMonths(monthlyBuckets),
    },
    weekday: {
      available: messagesWithCreateTime > 0,
      buckets: weekdayBuckets,
      busiest:
        maxMessages > 0
          ? weekdayBuckets.filter((bucket) => bucket.messages === maxMessages)
          : [],
      maxMessages,
    },
    topConversations,
    coverage: {
      hiddenMessagesSkipped,
      conversationsWithCreateTime,
      conversationsMissingCreateTime:
        totalConversations - conversationsWithCreateTime,
      messagesWithCreateTime,
      messagesMissingCreateTime,
      conversationsWithModel,
      conversationsWithMessages,
      conversationsWithoutMessages:
        totalConversations - conversationsWithMessages,
    },
  };
}
