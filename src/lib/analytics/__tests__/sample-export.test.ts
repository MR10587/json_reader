import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { importChatGptExport } from "@/lib/chatgpt-export";
import { computeAnalytics } from "../conversation-analytics";

/**
 * End-to-end check against the synthetic sample export. The expected numbers
 * are also used in the Stage 4 manual verification instructions.
 */
describe("sample export analytics", () => {
  it("computes the expected summary from the synthetic sample", async () => {
    const bytes = await readFile("test-fixtures/chatgpt-sample.zip");
    const result = await importChatGptExport(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const summary = computeAnalytics(result.conversations);

    expect(summary.totalConversations).toBe(6);
    expect(summary.totalVisibleMessages).toBe(30);
    expect(summary.userMessages).toBe(13);
    expect(summary.assistantMessages).toBe(16);
    expect(summary.otherMessages).toBe(1);
    expect(summary.averageMessagesPerConversation).toBe(5);

    expect(summary.monthly.available).toBe(true);
    expect(
      summary.monthly.buckets.map((bucket) => [bucket.key, bucket.conversations]),
    ).toEqual([["2024-03", 6]]);

    // Weekday totals are timezone-independent even though the labels are local.
    expect(
      summary.weekday.buckets.reduce(
        (sum, bucket) => sum + bucket.messages,
        0,
      ),
    ).toBe(30);
    expect(summary.weekday.maxMessages).toBe(12);

    expect(summary.topConversations.map((entry) => entry.title)).toEqual([
      "Fix CSV parser skipping rows",
      "How does a TCP handshake work?",
      "Weekend trip ideas",
      "Cover letter for bakery manager role",
      "Name ideas for a houseplant",
    ]);

    expect(summary.coverage.hiddenMessagesSkipped).toBe(6);
    expect(summary.coverage.conversationsWithCreateTime).toBe(6);
    expect(summary.coverage.conversationsMissingCreateTime).toBe(0);
    expect(summary.coverage.messagesMissingCreateTime).toBe(0);
    expect(summary.coverage.conversationsWithModel).toBe(6);
  });
});
