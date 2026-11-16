import type { Conversation, Message } from "@/lib/chatgpt-export";

/**
 * Small, presentation-only helpers. They never alter parsed conversation data
 * and are only used once an import exists in the browser.
 */

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const fullTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "long",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

function isValidTimestamp(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function formatTimestamp(value: number | null): string | null {
  if (!isValidTimestamp(value)) return null;
  return timestampFormatter.format(new Date(value));
}

export function formatFullTimestamp(value: number | null): string | null {
  if (!isValidTimestamp(value)) return null;
  return fullTimestampFormatter.format(new Date(value));
}

export function formatDate(value: number | null): string | null {
  if (!isValidTimestamp(value)) return null;
  return dateFormatter.format(new Date(value));
}

/** Messages worth showing: not visually hidden and not empty. */
export function getDisplayableMessages(conversation: Conversation): Message[] {
  return conversation.messages.filter((message) => !message.hidden && message.parts.length > 0);
}

export function countDisplayableMessages(conversation: Conversation): number {
  let count = 0;
  for (const message of conversation.messages) {
    if (!message.hidden && message.parts.length > 0) count += 1;
  }
  return count;
}

export function formatMessageCount(count: number): string {
  return `${count} message${count === 1 ? "" : "s"}`;
}

/** Compact duration for analytics rows. Requires a non-negative millisecond span. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "under a minute";

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes} min`;
}
