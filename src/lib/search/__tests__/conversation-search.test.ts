import { describe, expect, it } from "vitest";
import type {
  ContentPart,
  Conversation,
  Message,
  Role,
} from "@/lib/chatgpt-export";
import {
  buildConversationSearchIndex,
  dateInputToEndOfDay,
  dateInputToStartOfDay,
  filterAndSortConversations,
  findConversationSnippet,
  getConversationTitle,
  getMessageSearchText,
  highlightMatches,
  tokenizeQuery,
  type ConversationFilters,
  type ConversationSearchEntry,
} from "../conversation-search";

let sequence = 0;

function makeMessage(
  role: Role,
  content: string | ContentPart[],
  options: { hidden?: boolean; createTime?: number | null } = {},
): Message {
  const parts =
    typeof content === "string"
      ? content === ""
        ? []
        : [{ kind: "text" as const, text: content }]
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
  messages?: Message[];
}

function makeConversation(options: ConversationOptions = {}): Conversation {
  return {
    id: options.id ?? `conversation-${sequence++}`,
    title: options.title ?? "Test conversation",
    createTime: options.createTime ?? null,
    updateTime: options.updateTime ?? null,
    model: null,
    messages: options.messages ?? [],
  };
}

function queryEntries(
  entries: readonly ConversationSearchEntry[],
  text: string,
  overrides: Partial<Omit<ConversationFilters, "tokens">> = {},
): ConversationSearchEntry[] {
  return filterAndSortConversations(entries, {
    tokens: tokenizeQuery(text),
    fromMs: null,
    toMs: null,
    hasUserMessages: false,
    hasAssistantMessages: false,
    sort: "newest",
    ...overrides,
  });
}

describe("tokenizeQuery", () => {
  it("lowercases, splits and de-duplicates terms", () => {
    expect(tokenizeQuery("  Hello   WORLD hello ")).toEqual(["hello", "world"]);
    expect(tokenizeQuery("   ")).toEqual([]);
    expect(tokenizeQuery("")).toEqual([]);
  });
});

describe("message text extraction", () => {
  it("extracts text from every textual content part", () => {
    const message = makeMessage("assistant", [
      { kind: "text", text: "Alpha" },
      { kind: "code", language: "ts", text: "const beta = 1;" },
      {
        kind: "quote",
        text: "Delta quote",
        url: null,
        title: "Source title",
        domain: null,
      },
      { kind: "audio", transcript: "Gamma transcript" },
      { kind: "image", assetPointer: null, width: null, height: null },
      { kind: "unsupported", contentType: "mystery" },
    ]);

    const text = getMessageSearchText(message);
    expect(text).toContain("Alpha");
    expect(text).toContain("const beta = 1;");
    expect(text).toContain("Delta quote");
    expect(text).toContain("Source title");
    expect(text).toContain("Gamma transcript");
    expect(text).not.toContain("mystery");
  });

  it("skips empty content without throwing", () => {
    expect(getMessageSearchText(makeMessage("user", ""))).toBe("");
    expect(getMessageSearchText(makeMessage("user", []))).toBe("");
    expect(getMessageSearchText(makeMessage("assistant", "   "))).toBe("");
  });

  it("excludes hidden messages from the index", () => {
    const conversation = makeConversation({
      messages: [
        makeMessage("user", "visible words"),
        makeMessage("assistant", "hidden secret", { hidden: true }),
        makeMessage("assistant", []),
      ],
    });

    const [entry] = buildConversationSearchIndex([conversation]);
    expect(entry.contentLower).toContain("visible words");
    expect(entry.contentLower).not.toContain("hidden secret");
    expect(entry.hasUserMessages).toBe(true);
    expect(entry.hasAssistantMessages).toBe(false);
  });
});

describe("search matching", () => {
  const entries = buildConversationSearchIndex([
    makeConversation({
      id: "phoenix",
      title: "Project Phoenix",
      messages: [makeMessage("user", "We discussed the launch plan for Tuesday.")],
    }),
    makeConversation({
      id: "sourdough",
      title: "Bakery notes",
      messages: [makeMessage("assistant", "The SOURDOUGH starter needs feeding.")],
    }),
    makeConversation({ id: "empty", title: "Empty thread" }),
  ]);

  it("finds title matches case-insensitively", () => {
    expect(queryEntries(entries, "PHOENIX").map((entry) => entry.conversation.id)).toEqual([
      "phoenix",
    ]);
  });

  it("finds message-content matches case-insensitively", () => {
    expect(queryEntries(entries, "sourdough").map((entry) => entry.conversation.id)).toEqual([
      "sourdough",
    ]);
  });

  it("requires every term to appear somewhere in the conversation", () => {
    expect(queryEntries(entries, "phoenix launch").map((entry) => entry.conversation.id)).toEqual([
      "phoenix",
    ]);
    expect(queryEntries(entries, "phoenix astronaut")).toEqual([]);
  });

  it("returns every conversation for an empty query", () => {
    expect(queryEntries(entries, "   ")).toHaveLength(3);
  });

  it("handles missing or blank titles with a searchable fallback", () => {
    expect(getConversationTitle("")).toBe("Untitled conversation");
    expect(getConversationTitle("   ")).toBe("Untitled conversation");
    expect(getConversationTitle(null)).toBe("Untitled conversation");

    const withBlankTitle = buildConversationSearchIndex([
      makeConversation({ id: "blank", title: "   ", messages: [makeMessage("user", "hello")] }),
    ]);
    expect(queryEntries(withBlankTitle, "untitled")).toHaveLength(1);
  });
});

describe("role filters", () => {
  const entries = buildConversationSearchIndex([
    makeConversation({
      id: "user-only",
      messages: [makeMessage("user", "question")],
    }),
    makeConversation({
      id: "assistant-only",
      messages: [makeMessage("assistant", "answer")],
    }),
    makeConversation({
      id: "both",
      messages: [makeMessage("user", "question"), makeMessage("assistant", "answer")],
    }),
    makeConversation({
      id: "hidden-user",
      messages: [makeMessage("user", "hidden", { hidden: true })],
    }),
  ]);

  it("keeps all conversations when role filters are off", () => {
    expect(queryEntries(entries, "")).toHaveLength(4);
  });

  it("filters conversations with user messages", () => {
    expect(
      queryEntries(entries, "", { hasUserMessages: true }).map((entry) => entry.conversation.id),
    ).toEqual(["user-only", "both"]);
  });

  it("filters conversations with assistant messages", () => {
    expect(
      queryEntries(entries, "", { hasAssistantMessages: true }).map(
        (entry) => entry.conversation.id,
      ),
    ).toEqual(["assistant-only", "both"]);
  });

  it("requires both roles when both filters are active", () => {
    expect(
      queryEntries(entries, "", {
        hasUserMessages: true,
        hasAssistantMessages: true,
      }).map((entry) => entry.conversation.id),
    ).toEqual(["both"]);
  });
});

describe("date filtering", () => {
  const day = Date.UTC(2024, 2, 15);
  const nextDay = Date.UTC(2024, 2, 16);
  const startOfDay = Date.UTC(2024, 2, 15, 0, 0, 0, 0);
  const endOfDay = Date.UTC(2024, 2, 15, 23, 59, 59, 999);

  const entries = buildConversationSearchIndex([
    makeConversation({ id: "updated-today", createTime: day - 10_000, updateTime: day }),
    makeConversation({ id: "created-today", createTime: day, updateTime: null }),
    makeConversation({ id: "tomorrow", createTime: nextDay, updateTime: nextDay }),
    makeConversation({ id: "undated", createTime: null, updateTime: null }),
    makeConversation({ id: "start-boundary", createTime: startOfDay, updateTime: null }),
    makeConversation({ id: "end-boundary", createTime: endOfDay, updateTime: null }),
  ]);

  it("uses the inclusive local-day boundaries supplied by the UI", () => {
    expect(
      queryEntries(entries, "", { fromMs: startOfDay, toMs: endOfDay }).map(
        (entry) => entry.conversation.id,
      ),
    ).toEqual(["end-boundary", "updated-today", "created-today", "start-boundary"]);
  });

  it("supports from-only and to-only ranges", () => {
    expect(
      queryEntries(entries, "", { fromMs: startOfDay }).map((entry) => entry.conversation.id),
    ).toEqual(["tomorrow", "end-boundary", "updated-today", "created-today", "start-boundary"]);

    expect(
      queryEntries(entries, "", { toMs: endOfDay }).map((entry) => entry.conversation.id),
    ).toEqual(["end-boundary", "updated-today", "created-today", "start-boundary"]);
  });

  it("excludes undated conversations only while a range is active", () => {
    expect(queryEntries(entries, "", {})).toHaveLength(6);
    expect(queryEntries(entries, "", { fromMs: startOfDay })).not.toContainEqual(
      expect.objectContaining({ conversation: expect.objectContaining({ id: "undated" }) }),
    );
  });

  it("returns no results for an invalid range", () => {
    expect(queryEntries(entries, "", { fromMs: endOfDay, toMs: startOfDay })).toEqual([]);
  });
});

describe("date input helpers", () => {
  it("converts date inputs to local start and end of day", () => {
    expect(dateInputToStartOfDay("2024-03-15")).toBe(new Date(2024, 2, 15, 0, 0, 0, 0).getTime());
    expect(dateInputToEndOfDay("2024-03-15")).toBe(
      new Date(2024, 2, 15, 23, 59, 59, 999).getTime(),
    );
  });

  it("rejects empty, malformed and impossible dates", () => {
    expect(dateInputToStartOfDay("")).toBeNull();
    expect(dateInputToEndOfDay("not-a-date")).toBeNull();
    expect(dateInputToStartOfDay("2024-02-31")).toBeNull();
    expect(dateInputToEndOfDay("2024-13-01")).toBeNull();
  });
});

describe("sorting", () => {
  const conversations = [
    makeConversation({ id: "beta", title: "beta", updateTime: 2 }),
    makeConversation({ id: "undated", title: "Undated", updateTime: null, createTime: null }),
    makeConversation({ id: "alpha", title: "Alpha", updateTime: 1 }),
    makeConversation({ id: "gamma", title: "Gamma", updateTime: 3 }),
  ];
  const entries = buildConversationSearchIndex(conversations);
  const originalOrder = entries.map((entry) => entry.conversation.id);

  it("sorts newest first with undated conversations last", () => {
    expect(queryEntries(entries, "", { sort: "newest" }).map((entry) => entry.conversation.id)).toEqual(
      ["gamma", "beta", "alpha", "undated"],
    );
  });

  it("sorts oldest first with undated conversations last", () => {
    expect(queryEntries(entries, "", { sort: "oldest" }).map((entry) => entry.conversation.id)).toEqual(
      ["alpha", "beta", "gamma", "undated"],
    );
  });

  it("sorts alphabetically by title case-insensitively", () => {
    expect(queryEntries(entries, "", { sort: "title" }).map((entry) => entry.conversation.id)).toEqual(
      ["alpha", "beta", "gamma", "undated"],
    );
  });

  it("does not mutate the index or conversation order", () => {
    queryEntries(entries, "", { sort: "oldest" });
    expect(entries.map((entry) => entry.conversation.id)).toEqual(originalOrder);
    expect(conversations.map((conversation) => conversation.id)).toEqual([
      "beta",
      "undated",
      "alpha",
      "gamma",
    ]);
  });
});

describe("snippets", () => {
  it("returns surrounding context with ellipses", () => {
    const conversation = makeConversation({
      messages: [
        makeMessage(
          "assistant",
          `${"intro ".repeat(30)}the SOURDOUGH starter${" outro".repeat(30)}`,
        ),
      ],
    });

    const snippet = findConversationSnippet(conversation, ["sourdough"]);
    expect(snippet).not.toBeNull();
    expect(snippet?.role).toBe("assistant");
    expect(snippet?.text).toContain("SOURDOUGH");
    expect(snippet?.text.startsWith("…")).toBe(true);
    expect(snippet?.text.endsWith("…")).toBe(true);
  });

  it("ignores hidden messages and empty content", () => {
    const conversation = makeConversation({
      messages: [
        makeMessage("assistant", "hidden sourdough", { hidden: true }),
        makeMessage("user", []),
      ],
    });

    expect(findConversationSnippet(conversation, ["sourdough"])).toBeNull();
    expect(findConversationSnippet(conversation, [])).toBeNull();
  });

  it("finds the first matching visible message", () => {
    const conversation = makeConversation({
      messages: [
        makeMessage("user", "first mention of lentils"),
        makeMessage("assistant", "second mention of lentils"),
      ],
    });

    expect(findConversationSnippet(conversation, ["lentils"])?.role).toBe("user");
  });

  it("prefers the message that contains every query term", () => {
    const conversation = makeConversation({
      messages: [
        makeMessage("user", "lentils are in the pantry"),
        makeMessage("assistant", "lentils and saffron make a good soup"),
      ],
    });

    const snippet = findConversationSnippet(conversation, ["lentils", "saffron"]);
    expect(snippet?.role).toBe("assistant");
    expect(snippet?.text).toContain("saffron");
  });
});

describe("highlightMatches", () => {
  it("marks every case-insensitive occurrence", () => {
    const segments = highlightMatches("Hello WORLD, hello", ["hello"]);
    expect(segments.filter((segment) => segment.match).map((segment) => segment.text)).toEqual([
      "Hello",
      "hello",
    ]);
  });

  it("merges overlapping terms", () => {
    const segments = highlightMatches("foobar", ["foo", "foobar"]);
    expect(segments).toEqual([{ text: "foobar", match: true }]);
  });

  it("treats regex characters literally", () => {
    const segments = highlightMatches("2+2 is 4", ["2+2"]);
    expect(segments).toEqual([
      { text: "2+2", match: true },
      { text: " is 4", match: false },
    ]);
  });

  it("returns plain text when there are no terms", () => {
    expect(highlightMatches("plain text", [])).toEqual([{ text: "plain text", match: false }]);
    expect(highlightMatches("", ["anything"])).toEqual([]);
  });

  it("keeps offsets valid when lowercasing changes string length", () => {
    // "İ".toLowerCase() is two code units, so offset mapping must not drift.
    const text = "İstanbul trip";
    const segments = highlightMatches(text, ["stanbul"]);

    expect(segments.map((segment) => segment.text).join("")).toBe(text);
    expect(segments.filter((segment) => segment.match).map((segment) => segment.text)).toEqual([
      "stanbul",
    ]);
  });

  it("never returns offsets outside the original text", () => {
    const text = "İZMİR";
    const segments = highlightMatches(text, ["zm"]);

    expect(segments.map((segment) => segment.text).join("")).toBe(text);
    expect(segments.filter((segment) => segment.match).map((segment) => segment.text)).toEqual([
      "ZM",
    ]);
  });
});

describe("large synthetic datasets", () => {
  it("filters and sorts thousands of conversations without mutating them", () => {
    const conversations = Array.from({ length: 5_000 }, (_, index) =>
      makeConversation({
        id: `bulk-${index}`,
        title: index % 500 === 0 ? `Needle conversation ${index}` : `Conversation ${index}`,
        createTime: index,
        updateTime: index,
        messages: [
          makeMessage("user", `question number ${index}`),
          makeMessage("assistant", `answer number ${index}`),
        ],
      }),
    );

    const entries = buildConversationSearchIndex(conversations);
    const matches = queryEntries(entries, "needle");

    expect(matches).toHaveLength(10);
    expect(matches.every((entry) => entry.titleLower.includes("needle"))).toBe(true);
    expect(matches.map((entry) => entry.index)).toEqual([
      4_500, 4_000, 3_500, 3_000, 2_500, 2_000, 1_500, 1_000, 500, 0,
    ]);

    expect(entries).toHaveLength(5_000);
    expect(conversations).toHaveLength(5_000);
    expect(conversations[0].id).toBe("bulk-0");
  });
});
