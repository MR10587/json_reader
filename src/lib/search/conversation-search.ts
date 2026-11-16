import type { ContentPart, Conversation, Message, Role } from "@/lib/chatgpt-export";

/**
 * Pure, browser-only search helpers.
 *
 * Nothing here performs I/O or sends data anywhere. The index stores derived
 * lowercase text for fast filtering; the original conversations are never
 * copied or mutated.
 */

export type SortOrder = "newest" | "oldest" | "title";

export const UNTITLED_CONVERSATION_TITLE = "Untitled conversation";

const SNIPPET_CONTEXT_CHARS = 60;
const titleCollator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

export interface ConversationSearchEntry {
  /** Index in the original imported library, used for selection. */
  index: number;
  conversation: Conversation;
  title: string;
  titleLower: string;
  /** Lowercase text of visible messages, joined for multi-term matching. */
  contentLower: string;
  hasUserMessages: boolean;
  hasAssistantMessages: boolean;
  /** updateTime, falling back to createTime. */
  time: number | null;
}

export interface ConversationFilters {
  tokens: readonly string[];
  fromMs: number | null;
  toMs: number | null;
  hasUserMessages: boolean;
  hasAssistantMessages: boolean;
  sort: SortOrder;
}

export interface ConversationSnippet {
  role: Role;
  text: string;
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

function validTimestamp(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null;
}

export function getConversationTitle(title: string | null | undefined): string {
  const trimmed = typeof title === "string" ? title.trim() : "";
  return trimmed === "" ? UNTITLED_CONVERSATION_TITLE : trimmed;
}

/** Splits a query into unique, lowercase terms. */
export function tokenizeQuery(query: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const token of query.toLowerCase().split(/\s+/)) {
    if (token === "" || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }

  return tokens;
}

function partSearchText(part: ContentPart): string {
  switch (part.kind) {
    case "text":
    case "code":
    case "execution_output":
    case "browsing":
    case "error":
    case "reasoning":
    case "context":
      return part.text;
    case "quote":
      return [part.title, part.text].filter((value): value is string => Boolean(value)).join("\n");
    case "audio":
      return part.transcript ?? "";
    case "image":
    case "unsupported":
      return "";
  }
}

/** All searchable text in a message, regardless of whether it is visible. */
export function getMessageSearchText(message: Message): string {
  const pieces: string[] = [];

  for (const part of message.parts) {
    const text = partSearchText(part).trim();
    if (text !== "") pieces.push(text);
  }

  return pieces.join("\n");
}

export function buildConversationSearchIndex(
  conversations: readonly Conversation[],
): ConversationSearchEntry[] {
  return conversations.map((conversation, index) => {
    const content: string[] = [];
    let hasUserMessages = false;
    let hasAssistantMessages = false;

    for (const message of conversation.messages) {
      if (message.hidden) continue;

      if (message.parts.length > 0) {
        if (message.role === "user") hasUserMessages = true;
        if (message.role === "assistant") hasAssistantMessages = true;
      }

      const text = getMessageSearchText(message);
      if (text !== "") content.push(text);
    }

    const title = getConversationTitle(conversation.title);

    return {
      index,
      conversation,
      title,
      titleLower: title.toLowerCase(),
      contentLower: content.join("\n").toLowerCase(),
      hasUserMessages,
      hasAssistantMessages,
      time: validTimestamp(conversation.updateTime) ?? validTimestamp(conversation.createTime),
    };
  });
}

function matchesTokens(entry: ConversationSearchEntry, tokens: readonly string[]): boolean {
  for (const token of tokens) {
    if (!entry.titleLower.includes(token) && !entry.contentLower.includes(token)) {
      return false;
    }
  }
  return true;
}

function matchesDateRange(
  entry: ConversationSearchEntry,
  fromMs: number | null,
  toMs: number | null,
): boolean {
  if (fromMs === null && toMs === null) return true;
  if (fromMs !== null && toMs !== null && fromMs > toMs) return false;
  if (entry.time === null) return false;
  if (fromMs !== null && entry.time < fromMs) return false;
  if (toMs !== null && entry.time > toMs) return false;
  return true;
}

function compareEntries(
  a: ConversationSearchEntry,
  b: ConversationSearchEntry,
  sort: SortOrder,
): number {
  if (sort === "title") {
    return titleCollator.compare(a.title, b.title) || a.index - b.index;
  }

  // Undated conversations stay at the end for both chronological sorts.
  if (a.time === null && b.time === null) return a.index - b.index;
  if (a.time === null) return 1;
  if (b.time === null) return -1;

  const difference = sort === "newest" ? b.time - a.time : a.time - b.time;
  return difference || a.index - b.index;
}

export function filterAndSortConversations(
  entries: readonly ConversationSearchEntry[],
  filters: ConversationFilters,
): ConversationSearchEntry[] {
  const result = entries.filter((entry) => {
    if (!matchesTokens(entry, filters.tokens)) return false;
    if (!matchesDateRange(entry, filters.fromMs, filters.toMs)) return false;
    if (filters.hasUserMessages && !entry.hasUserMessages) return false;
    if (filters.hasAssistantMessages && !entry.hasAssistantMessages) return false;
    return true;
  });

  result.sort((a, b) => compareEntries(a, b, filters.sort));
  return result;
}

function buildSnippet(text: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - SNIPPET_CONTEXT_CHARS);
  const end = Math.min(text.length, matchIndex + matchLength + SNIPPET_CONTEXT_CHARS);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();

  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface TermMatch {
  index: number;
  length: number;
}

/**
 * Finds every case-insensitive occurrence of `token` in `text`.
 *
 * The fast path uses offsets from the lowercased copy. Unicode lowercasing can
 * change string length (for example "İ"), so when the lengths differ we fall
 * back to a regex over the original text. Either way the returned offsets are
 * always valid for slicing the original string.
 */
function findTermMatches(text: string, lower: string, token: string): TermMatch[] {
  const matches: TermMatch[] = [];

  if (lower.length === text.length) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(token, from);
      if (index === -1) break;
      matches.push({ index, length: token.length });
      from = index + Math.max(1, token.length);
    }
    return matches;
  }

  const pattern = new RegExp(escapeRegExp(token), "gi");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    matches.push({ index: match.index, length: match[0].length });
    if (match[0] === "") pattern.lastIndex += 1;
  }
  return matches;
}

function findFirstTermMatch(
  text: string,
  lower: string,
  token: string,
): TermMatch | null {
  return findTermMatches(text, lower, token)[0] ?? null;
}

/**
 * Finds a useful snippet in the first visible message that best covers the
 * query. Prefers a message containing every term, then the message matching the
 * most terms, so multi-word searches surface context instead of a partial match.
 */
export function findConversationSnippet(
  conversation: Conversation,
  tokens: readonly string[],
): ConversationSnippet | null {
  if (tokens.length === 0) return null;

  let fallback: { role: Role; text: string; score: number } | null = null;

  for (const message of conversation.messages) {
    if (message.hidden) continue;

    const text = getMessageSearchText(message);
    if (text === "") continue;

    const lower = text.toLowerCase();
    let score = 0;
    let first: TermMatch | null = null;

    for (const token of tokens) {
      if (token === "") continue;

      const match = findFirstTermMatch(text, lower, token);
      if (match === null) continue;
      score += 1;
      if (first === null || match.index < first.index) first = match;
    }

    if (first === null) continue;

    const snippet = {
      role: message.role,
      text: buildSnippet(text, first.index, first.length),
    };

    if (score === tokens.length) return snippet;
    if (fallback === null || score > fallback.score) {
      fallback = { ...snippet, score };
    }
  }

  return fallback ? { role: fallback.role, text: fallback.text } : null;
}

/** Splits text into safe segments, merging overlapping term matches. */
export function highlightMatches(
  text: string,
  tokens: readonly string[],
): HighlightSegment[] {
  if (text === "" || tokens.length === 0) {
    return text === "" ? [] : [{ text, match: false }];
  }

  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];

  for (const token of tokens) {
    if (token === "") continue;
    for (const match of findTermMatches(text, lower, token)) {
      ranges.push([match.index, match.index + match.length]);
    }
  }

  if (ranges.length === 0) return [{ text, match: false }];

  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);

  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const previous = merged[merged.length - 1];
    if (previous && range[0] <= previous[1]) {
      previous[1] = Math.max(previous[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const [start, end] of merged) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), match: false });
    }
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }

  return segments;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parseDateInput(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/** Converts a date input into the first millisecond of that local day. */
export function dateInputToStartOfDay(value: string): number | null {
  const parts = parseDateInput(value);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0).getTime();
}

/** Converts a date input into the last millisecond of that local day. */
export function dateInputToEndOfDay(value: string): number | null {
  const parts = parseDateInput(value);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999).getTime();
}
