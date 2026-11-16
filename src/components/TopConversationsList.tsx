"use client";

import type { TopConversation } from "@/lib/analytics/conversation-analytics";
import { formatDate, formatDuration, formatMessageCount } from "@/lib/ui/format";

export function TopConversationsList({
  items,
  onSelect,
}: {
  items: readonly TopConversation[];
  onSelect: (index: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Longest conversations
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Ranked by visible messages. Duration runs from creation to last update
        when both timestamps exist. Select one to open it.
      </p>

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
          No visible messages to rank in this export.
        </p>
      ) : (
        <ol className="mt-3 divide-y divide-border">
          {items.map((item, rank) => {
            const date = formatDate(item.lastActivity);
            const duration =
              item.durationMs === null ? null : formatDuration(item.durationMs);

            return (
              <li key={`${item.id}-${item.index}`}>
                <button
                  type="button"
                  onClick={() => onSelect(item.index)}
                  className="flex w-full items-center gap-3 rounded-lg px-1.5 py-2.5 text-left transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-muted-foreground">
                    {rank + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-sm font-medium text-foreground"
                      title={item.title}
                    >
                      {item.title}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
                      <span>{formatMessageCount(item.messageCount)}</span>
                      {date ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{date}</span>
                        </>
                      ) : null}
                      {duration ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{duration}</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  >
                    <path
                      d="m9 6 6 6-6 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
