import type { Message } from "@/lib/chatgpt-export";
import { formatFullTimestamp, formatTimestamp } from "@/lib/ui/format";
import { ContentParts } from "@/components/ContentPartView";

function roleLabel(message: Message): string {
  switch (message.role) {
    case "user":
      return "You";
    case "assistant":
      return "ChatGPT";
    case "system":
      return "System";
    case "tool":
      return message.authorName ? `Tool · ${message.authorName}` : "Tool";
    default:
      return "Unknown";
  }
}

function Avatar({ role }: { role: Message["role"] }) {
  const isUser = role === "user";
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
        isUser
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-surface text-muted-foreground"
      }`}
    >
      {isUser ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </span>
  );
}

function MessageMeta({ message, align = "start" }: { message: Message; align?: "start" | "end" }) {
  const timestamp = formatTimestamp(message.createTime);
  const fullTimestamp = formatFullTimestamp(message.createTime);
  const dateTime =
    message.createTime !== null && Number.isFinite(message.createTime)
      ? new Date(message.createTime).toISOString()
      : null;

  return (
    <div
      className={`mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 ${
        align === "end" ? "justify-end" : ""
      }`}
    >
      <span className="text-xs font-semibold text-foreground">{roleLabel(message)}</span>
      {timestamp && dateTime ? (
        <time dateTime={dateTime} title={fullTimestamp ?? undefined} className="text-[11px] text-muted-foreground">
          {timestamp}
        </time>
      ) : null}
    </div>
  );
}

export function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  if (!isUser && !isAssistant) {
    return (
      <article className="rounded-xl border border-border bg-surface-muted/50 px-4 py-3">
        <MessageMeta message={message} />
        <ContentParts parts={message.parts} />
      </article>
    );
  }

  return (
    <article
      aria-label={`${roleLabel(message)} message`}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <Avatar role={message.role} />
      <div className={`min-w-0 ${isUser ? "max-w-[88%] sm:max-w-[75%]" : "flex-1"}`}>
        <MessageMeta message={message} align={isUser ? "end" : "start"} />
        <div
          className={
            isUser
              ? "rounded-2xl rounded-tr-md border border-accent/15 bg-accent-soft px-4 py-3 text-foreground shadow-sm"
              : "rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-4 shadow-sm"
          }
        >
          <ContentParts parts={message.parts} />
        </div>
      </div>
    </article>
  );
}
