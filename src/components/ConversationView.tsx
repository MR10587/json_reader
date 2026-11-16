import type { Conversation } from "@/lib/chatgpt-export";
import {
  formatDate,
  formatMessageCount,
  getDisplayableMessages,
} from "@/lib/ui/format";
import { MessageItem } from "@/components/MessageItem";

export function ConversationView({ conversation }: { conversation: Conversation }) {
  const messages = getDisplayableMessages(conversation);
  const updated = formatDate(conversation.updateTime ?? conversation.createTime);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <h1
            id="conversation-title"
            className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            {conversation.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {conversation.model ? (
              <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px]">
                {conversation.model}
              </span>
            ) : null}
            {updated ? <span>Updated {updated}</span> : null}
            <span>{formatMessageCount(messages.length)}</span>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="conversation-title"
        className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        {messages.length > 0 ? (
          <div className="space-y-6 sm:space-y-7">
            {messages.map((message, index) => (
              <MessageItem key={`${message.id}-${index}`} message={message} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6Z" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="mt-4 text-base font-semibold text-foreground">No displayable messages</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              This conversation only contains hidden or empty messages in the export.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
