import { normalizeContent } from "./content";
import { asNonEmptyString, isObject, secondsToMs, type RawObject } from "./guards";
import { linearizeThread } from "./thread";
import type { Conversation, ImportWarning, Message, Role } from "./types";

const KNOWN_ROLES: ReadonlySet<Role> = new Set(["user", "assistant", "system", "tool"]);

function normalizeRole(value: unknown): Role {
  return typeof value === "string" && KNOWN_ROLES.has(value as Role) ? (value as Role) : "unknown";
}

function normalizeMessage(node: RawObject, fallbackId: string): Message | null {
  const raw = node.message;
  if (!isObject(raw)) return null; // e.g. the synthetic root node has message: null

  const author = isObject(raw.author) ? raw.author : {};
  const metadata = isObject(raw.metadata) ? raw.metadata : {};
  const { contentType, parts } = normalizeContent(raw.content);

  return {
    id: asNonEmptyString(raw.id) ?? asNonEmptyString(node.id) ?? fallbackId,
    role: normalizeRole(author.role),
    authorName: asNonEmptyString(author.name),
    createTime: secondsToMs(raw.create_time),
    contentType,
    parts,
    hidden: metadata.is_visually_hidden_from_conversation === true,
  };
}

export function normalizeConversation(
  raw: unknown,
  index: number,
  warnings: ImportWarning[],
): Conversation | null {
  if (!isObject(raw)) {
    warnings.push({ index, conversationId: null, message: "Entry is not an object; skipped." });
    return null;
  }

  const id = asNonEmptyString(raw.conversation_id) ?? asNonEmptyString(raw.id) ?? `unknown-${index}`;
  const { nodes, notes } = linearizeThread(raw.mapping, raw.current_node);
  for (const message of notes) warnings.push({ index, conversationId: id, message });

  const messages: Message[] = [];
  nodes.forEach((node, i) => {
    const message = normalizeMessage(node, `${id}-${i}`);
    if (message) messages.push(message);
  });

  return {
    id,
    title: asNonEmptyString(raw.title)?.trim() ?? "Untitled conversation",
    createTime: secondsToMs(raw.create_time),
    updateTime: secondsToMs(raw.update_time),
    model: asNonEmptyString(raw.default_model_slug),
    messages,
  };
}
