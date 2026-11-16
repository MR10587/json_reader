import { describe, expect, it } from "vitest";
import type {
  ContentPart,
  Conversation,
  Message,
  Role,
} from "@/lib/chatgpt-export";
import {
  computeAnalytics,
  TOP_CONVERSATION_LIMIT,
  TOP_MONTH_LIMIT,
} from "../conversation-analytics";

let sequence = 0;

function makeMessage(
  role: Role,
  content: string | ContentPart[],
  options: { hidden?: boolean; createTime?: number | null } = {},
): Message {
  const parts: ContentPart[] =
    typeof content === "string"
      ? content === ""
        ? []
        : [{ kind: "text", text: content }]
      : content;

  return {
    id: `message-${sequence++}`,
    role,
    authorName: null,
    createTime: options.createTime ?? null,
    contentType: "text",
    parts,
    hidden: options.hidden ?? false,
  };
}

interface ConversationOptions {
  id?: string;
  title?: string;
  createTime?: number | null;
  updateTime?: number | null;
  model?: string | null;
  messages?: Message[];
}

function makeConversation(options: ConversationOptions = {}): Conversation {
  return {
    id: options.id ?? `conversation-${sequence++}`,
    title: options.title ?? "Test conversation",
    createTime: options.createTime ?? null,
    updateTime: options.updateTime ?? null,
    model: options.model ?? null,
    messages: options.messages ?? [],
  };
}

/** Local-time constructor (1-based month) so grouping is timezone-stable. */
function at(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour).getTime();
}

function imagePart(): ContentPart {
  return { kind: "image", assetPointer: null, width: null, height: null };
}

describe("empty and missing data", () => {
  it("returns unavailable metrics for an empty export", () => {
    const summary = computeAnalytics([]);

    expect(summary.totalConversations).toBe(0);
    expect(summary.totalVisibleMessages).toBe(0);
    expect(summary.averageMessagesPerConversation).toBeNull();
    expect(summary.monthly.available).toBe(false);
    expect(summary.monthly.buckets).toEqual([]);
    expect(summary.monthly.top).toEqual([]);
    expect(summary.weekday.available).toBe(false);
    expect(summary.weekday.busiest).toEqual([]);
    expect(summary.topConversations).toEqual([]);
    expect(summary.coverage.conversationsMissingCreateTime).toBe(0);
  });

  it("reports zero (not unavailable) when conversations exist without messages", () => {
    const summary = computeAnalytics([makeConversation()]);

    expect(summary.totalConversations).toBe(1);
    expect(summary.totalVisibleMessages).toBe(0);
    expect(summary.averageMessagesPerConversation).toBe(0);
    expect(summary.coverage.conversationsWithMessages).toBe(0);
    expect(summary.coverage.conversationsWithoutMessages).toBe(1);
    expect(summary.monthly.available).toBe(false);
    expect(summary.weekday.available).toBe(false);
    expect(summary.topConversations).toEqual([]);
  });

  it("keeps zero-valued weekdays when some messages have timestamps", () => {
    const summary = computeAnalytics([
      makeConversation({
        messages: [makeMessage("user", "timed", { createTime: at(2024, 1, 1) })],
      }),
    ]);

    expect(summary.weekday.available).toBe(true);
    expect(summary.weekday.buckets).toHaveLength(7);
    expect(summary.weekday.buckets.map((bucket) => bucket.messages)).toEqual([
      1, 0, 0, 0, 0, 0, 0,
    ]);
  });
});

describe("message counting", () => {
  const conversation = makeConversation({
    messages: [
      makeMessage("user", "hello"),
      makeMessage("user", [imagePart()]),
      makeMessage("assistant", "answer"),
      makeMessage("tool", [{ kind: "execution_output", text: "output" }]),
      makeMessage("system", [{ kind: "error", name: null, text: "error" }]),
      makeMessage("user", "hidden text", { hidden: true }),
      makeMessage("assistant", []),
    ],
  });
  const summary = computeAnalytics([conversation]);

  it("counts visible user and assistant messages", () => {
    expect(summary.userMessages).toBe(2);
    expect(summary.assistantMessages).toBe(1);
    expect(summary.otherMessages).toBe(2);
    expect(summary.totalVisibleMessages).toBe(5);
  });

  it("skips hidden and empty messages", () => {
    expect(summary.coverage.hiddenMessagesSkipped).toBe(1);
    expect(summary.coverage.conversationsWithMessages).toBe(1);
    expect(summary.coverage.conversationsWithoutMessages).toBe(0);
  });

  it("keeps role counts consistent with the visible total", () => {
    expect(summary.userMessages + summary.assistantMessages + summary.otherMessages).toBe(
      summary.totalVisibleMessages,
    );
  });
});

describe("average messages per conversation", () => {
  it("divides visible messages by all conversations", () => {
    const summary = computeAnalytics([
      makeConversation({
        messages: [
          makeMessage("user", "one"),
          makeMessage("assistant", "two"),
          makeMessage("user", "three"),
        ],
      }),
      makeConversation({
        messages: [makeMessage("user", "four"), makeMessage("assistant", "five")],
      }),
    ]);

    expect(summary.averageMessagesPerConversation).toBe(2.5);
  });
});

describe("conversations created per month", () => {
  const summary = computeAnalytics([
    makeConversation({ createTime: at(2023, 11, 15) }),
    makeConversation({ createTime: at(2024, 1, 10) }),
    makeConversation({ createTime: at(2024, 1, 20) }),
    makeConversation({ createTime: at(2024, 3, 1) }),
  ]);

  it("sorts chronologically and fills gap months with real zeros", () => {
    expect(summary.monthly.available).toBe(true);
    expect(summary.monthly.buckets.map((bucket) => bucket.key)).toEqual([
      "2023-11",
      "2023-12",
      "2024-01",
      "2024-02",
      "2024-03",
    ]);
    expect(summary.monthly.buckets.map((bucket) => bucket.conversations)).toEqual([
      1, 0, 2, 0, 1,
    ]);
    expect(summary.monthly.buckets.every((bucket) => bucket.label !== "")).toBe(true);
  });

  it("ranks the most active months with a stable tie-break", () => {
    expect(summary.monthly.top.map((bucket) => bucket.key)).toEqual([
      "2024-01",
      "2023-11",
      "2024-03",
    ]);
    expect(summary.monthly.top).toHaveLength(TOP_MONTH_LIMIT);
  });

  it("excludes undated conversations and reports the gap", () => {
    const partial = computeAnalytics([
      makeConversation({ createTime: at(2024, 5, 1) }),
      makeConversation({ createTime: null }),
      makeConversation({ createTime: null }),
    ]);

    expect(partial.monthly.available).toBe(true);
    expect(partial.monthly.buckets.map((bucket) => bucket.conversations)).toEqual([1]);
    expect(partial.coverage.conversationsWithCreateTime).toBe(1);
    expect(partial.coverage.conversationsMissingCreateTime).toBe(2);
  });

  it("marks the chart unavailable when no conversation has a creation date", () => {
    const undated = computeAnalytics([
      makeConversation({ createTime: null }),
      makeConversation({ createTime: null, updateTime: at(2024, 2, 2) }),
    ]);

    expect(undated.monthly.available).toBe(false);
    expect(undated.monthly.buckets).toEqual([]);
    expect(undated.coverage.conversationsMissingCreateTime).toBe(2);
  });
});

describe("weekday activity", () => {
  it("groups visible messages Monday-first using local time", () => {
    // 2024-01-01 was a Monday; 2024-01-07 was a Sunday.
    const summary = computeAnalytics([
      makeConversation({
        messages: [
          makeMessage("user", "monday", { createTime: at(2024, 1, 1) }),
          makeMessage("assistant", "tuesday early", { createTime: at(2024, 1, 2, 9) }),
          makeMessage("assistant", "tuesday late", { createTime: at(2024, 1, 2, 18) }),
          makeMessage("tool", "sunday tool", { createTime: at(2024, 1, 7) }),
        ],
      }),
    ]);

    expect(summary.weekday.available).toBe(true);
    expect(summary.weekday.buckets.map((bucket) => bucket.weekday)).toEqual([
      1, 2, 3, 4, 5, 6, 0,
    ]);
    expect(summary.weekday.buckets.map((bucket) => bucket.messages)).toEqual([
      1, 2, 0, 0, 0, 0, 1,
    ]);
    expect(summary.weekday.maxMessages).toBe(2);
    expect(summary.weekday.busiest.map((bucket) => bucket.weekday)).toEqual([2]);
  });

  it("reports messages without timestamps instead of guessing", () => {
    const summary = computeAnalytics([
      makeConversation({
        messages: [
          makeMessage("user", "timed", { createTime: at(2024, 1, 1) }),
          makeMessage("assistant", "untimed", { createTime: null }),
        ],
      }),
    ]);

    expect(summary.coverage.messagesWithCreateTime).toBe(1);
    expect(summary.coverage.messagesMissingCreateTime).toBe(1);
    expect(summary.weekday.buckets.reduce((sum, bucket) => sum + bucket.messages, 0)).toBe(1);
  });

  it("marks the chart unavailable when no visible message has a timestamp", () => {
    const summary = computeAnalytics([
      makeConversation({
        messages: [
          makeMessage("user", "no time", { createTime: null }),
          makeMessage("assistant", "no time either", { createTime: null }),
        ],
      }),
    ]);

    expect(summary.weekday.available).toBe(false);
    expect(summary.weekday.busiest).toEqual([]);
    expect(summary.weekday.maxMessages).toBe(0);
  });
});

describe("top conversations", () => {
  it("ranks by visible message count, then title, and keeps original indexes", () => {
    const conversations = [
      makeConversation({
        title: "Zebra",
        messages: [makeMessage("user", "1"), makeMessage("assistant", "2")],
      }),
      makeConversation({
        title: "Middle",
        messages: [
          makeMessage("user", "1"),
          makeMessage("assistant", "2"),
          makeMessage("user", "3"),
        ],
      }),
      makeConversation({
        title: "Alpha",
        messages: [makeMessage("user", "1"), makeMessage("assistant", "2")],
      }),
    ];

    const summary = computeAnalytics(conversations);

    expect(summary.topConversations.map((entry) => entry.title)).toEqual([
      "Middle",
      "Alpha",
      "Zebra",
    ]);
    expect(summary.topConversations.map((entry) => entry.index)).toEqual([1, 2, 0]);
    expect(summary.topConversations.map((entry) => entry.messageCount)).toEqual([3, 2, 2]);
  });

  it(`limits the list to ${TOP_CONVERSATION_LIMIT} conversations`, () => {
    const conversations = Array.from({ length: 7 }, (_, index) =>
      makeConversation({
        title: `Conversation ${index}`,
        messages: Array.from({ length: 7 - index }, () =>
          makeMessage("user", `message ${index}`),
        ),
      }),
    );

    const summary = computeAnalytics(conversations);

    expect(summary.topConversations).toHaveLength(TOP_CONVERSATION_LIMIT);
    expect(summary.topConversations.map((entry) => entry.messageCount)).toEqual([
      7, 6, 5, 4, 3,
    ]);
  });

  it("returns no ranking when every conversation is empty", () => {
    const summary = computeAnalytics([
      makeConversation({ messages: [makeMessage("user", "hidden", { hidden: true })] }),
    ]);

    expect(summary.topConversations).toEqual([]);
  });
});

describe("duration and model coverage", () => {
  it("uses creation and update timestamps when both are ordered", () => {
    const created = at(2024, 4, 1, 10);
    const updated = at(2024, 4, 1, 12);
    const summary = computeAnalytics([
      makeConversation({
        createTime: created,
        updateTime: updated,
        model: "gpt-4o",
      }),
    ]);

    const [top] = summary.topConversations;
    expect(summary.coverage.conversationsWithModel).toBe(1);
    expect(top).toBeUndefined();
    // A conversation without messages is not ranked, but coverage still works.
    expect(summary.monthly.buckets).toHaveLength(1);
  });

  it("computes duration for ranked conversations and falls back safely", () => {
    const created = at(2024, 4, 1, 10);
    const updated = at(2024, 4, 1, 12);
    const summary = computeAnalytics([
      makeConversation({
        title: "With update",
        createTime: created,
        updateTime: updated,
        messages: [makeMessage("user", "hello")],
      }),
      makeConversation({
        title: "Missing update",
        createTime: created,
        updateTime: null,
        messages: [makeMessage("user", "hello")],
      }),
      makeConversation({
        title: "Bad order",
        createTime: updated,
        updateTime: created,
        messages: [makeMessage("user", "hello")],
      }),
    ]);

    const byTitle = new Map(
      summary.topConversations.map((entry) => [entry.title, entry]),
    );

    expect(byTitle.get("With update")?.durationMs).toBe(updated - created);
    expect(byTitle.get("With update")?.lastActivity).toBe(updated);
    expect(byTitle.get("Missing update")?.durationMs).toBeNull();
    expect(byTitle.get("Missing update")?.lastActivity).toBe(created);
    expect(byTitle.get("Bad order")?.durationMs).toBeNull();
  });
});

describe("mixed export invariants", () => {
  it("keeps totals, coverage and rankings internally consistent", () => {
    const summary = computeAnalytics([
      makeConversation({
        title: "Dated",
        createTime: at(2024, 2, 10),
        updateTime: at(2024, 2, 10, 14),
        model: "gpt-4o",
        messages: [
          makeMessage("user", "hello", { createTime: at(2024, 2, 10, 12) }),
          makeMessage("assistant", "hi", { createTime: at(2024, 2, 10, 12) }),
          makeMessage("tool", "tool output", { createTime: at(2024, 2, 10, 12) }),
          makeMessage("user", "hidden", { hidden: true }),
        ],
      }),
      makeConversation({
        title: "Undated",
        createTime: null,
        messages: [
          makeMessage("user", "another", { createTime: null }),
          makeMessage("assistant", "", { createTime: null }),
        ],
      }),
    ]);

    expect(summary.totalConversations).toBe(2);
    expect(summary.totalVisibleMessages).toBe(4);
    expect(summary.userMessages).toBe(2);
    expect(summary.assistantMessages).toBe(1);
    expect(summary.otherMessages).toBe(1);
    expect(summary.averageMessagesPerConversation).toBe(2);
    expect(summary.topConversations).toHaveLength(2);
    expect(summary.topConversations[0].title).toBe("Dated");
    expect(summary.coverage.conversationsMissingCreateTime).toBe(1);
    expect(summary.coverage.messagesMissingCreateTime).toBe(1);
    expect(summary.coverage.hiddenMessagesSkipped).toBe(1);
    expect(
      summary.weekday.buckets.reduce((sum, bucket) => sum + bucket.messages, 0),
    ).toBe(summary.coverage.messagesWithCreateTime);
  });
});
