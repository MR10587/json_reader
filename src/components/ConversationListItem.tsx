"use client";

import { memo, useMemo } from "react";
import type { Role } from "@/lib/chatgpt-export";
import { HighlightedText } from "@/components/HighlightedText";
import {
  countDisplayableMessages,
  formatDate,
  formatMessageCount,
} from "@/lib/ui/format";
import {
  findConversationSnippet,
  type ConversationSearchEntry,
} from "@/lib/search/conversation-search";

function snippetRoleLabel(role: Role): string {
  switch (role) {
    case "user":
      return "You";
    case "assistant":
      return "ChatGPT";
    case "system":
      return "System";
    case "tool":
      return "Tool";
    default:
      return "Unknown";
  }
}

interface ConversationListItemProps {
  entry: ConversationSearchEntry;
  tokens: readonly string[];
  selected: boolean;
  onSelect: (index: number) => void;
}

export const ConversationListItem = memo(function ConversationListItem({
  entry,
  tokens,
  selected,
  onSelect,
}: ConversationListItemProps) {
  const date = formatDate(entry.time);
  const count = countDisplayableMessages(entry.conversation);
  const snippet = useMemo(
    () => (tokens.length > 0 ? findConversationSnippet(entry.conversation, tokens) : null),
    [entry.conversation, tokens],
  );

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(entry.index)}
        aria-current={selected ? "true" : undefined}
        title={entry.title}
        className={`w-full rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          selected
            ? "border-accent/25 bg-accent-soft text-foreground"
            : "border-transparent text-foreground hover:bg-surface-muted"
        }`}
      >
        <span className="line-clamp-2 block text-sm font-medium leading-5">
          <HighlightedText text={entry.title} tokens={tokens} />
        </span>
        {snippet ? (
          <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-muted-foreground">
            <span className="font-semibold text-foreground/75">
              {snippetRoleLabel(snippet.role)}
            </span>
            <span aria-hidden="true"> · </span>
            <HighlightedText text={snippet.text} tokens={tokens} />
          </span>
        ) : null}
        <span
          className={`mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] ${
            selected ? "text-accent" : "text-muted-foreground"
          }`}
        >
          {date ? <span>{date}</span> : null}
          {date ? <span aria-hidden="true">·</span> : null}
          <span>{formatMessageCount(count)}</span>
        </span>
      </button>
    </li>
  );
});
