/**
 * Synthetic ChatGPT export fixtures. All content is fake. The shape mirrors
 * the publicly known `conversations.json` structure: an array of conversations,
 * each with a `mapping` tree of nodes `{ id, message, parent, children }` and
 * a `current_node` pointing at the selected leaf.
 */
import JSZip from "jszip";

type Json = Record<string, unknown>;

export interface NodeSpec {
  id: string;
  parent: string | null;
  children?: string[];
  role?: string;
  authorName?: string | null;
  content?: Json;
  createTime?: number | null;
  metadata?: Json;
  /** When true, the node has `message: null` (like the export's root node). */
  noMessage?: boolean;
}

export const text = (...parts: string[]): Json => ({ content_type: "text", parts });

export function makeNode(spec: NodeSpec): Json {
  return {
    id: spec.id,
    parent: spec.parent,
    children: spec.children ?? [],
    message: spec.noMessage
      ? null
      : {
          id: spec.id,
          author: { role: spec.role ?? "user", name: spec.authorName ?? null, metadata: {} },
          create_time: spec.createTime === undefined ? 1_700_000_000.5 : spec.createTime,
          update_time: null,
          content: spec.content ?? text("Hello"),
          status: "finished_successfully",
          end_turn: null,
          weight: 1,
          metadata: spec.metadata ?? {},
          recipient: "all",
        },
  };
}

/** Builds a mapping from node specs, deriving `children` from `parent` when not given. */
export function makeMapping(specs: NodeSpec[]): Record<string, Json> {
  const children = new Map<string, string[]>();
  for (const s of specs) {
    if (s.parent !== null) children.set(s.parent, [...(children.get(s.parent) ?? []), s.id]);
  }
  return Object.fromEntries(
    specs.map((s) => [s.id, makeNode({ ...s, children: s.children ?? children.get(s.id) ?? [] })]),
  );
}

/** A linear conversation: root (null message) → system (hidden) → user → assistant. */
export function makeConversation(overrides: Json = {}): Json {
  const mapping = makeMapping([
    { id: "root", parent: null, noMessage: true },
    {
      id: "sys",
      parent: "root",
      role: "system",
      content: text(""),
      metadata: { is_visually_hidden_from_conversation: true },
    },
    { id: "u1", parent: "sys", role: "user", content: text("What is 2+2?") },
    { id: "a1", parent: "u1", role: "assistant", content: text("2+2 is 4.") },
  ]);
  return {
    title: "Simple math",
    create_time: 1_700_000_000.123,
    update_time: 1_700_000_100.456,
    mapping,
    moderation_results: [],
    current_node: "a1",
    plugin_ids: null,
    conversation_id: "conv-1",
    conversation_template_id: null,
    gizmo_id: null,
    is_archived: false,
    safe_urls: [],
    default_model_slug: "gpt-4o",
    id: "conv-1",
    ...overrides,
  };
}

export async function buildZip(files: Record<string, string | Uint8Array>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export function exportZip(conversations: unknown, extra: Record<string, string> = {}): Promise<Uint8Array> {
  return buildZip({
    "conversations.json": JSON.stringify(conversations),
    "user.json": JSON.stringify({ id: "user-fake" }),
    "chat.html": "<html></html>",
    ...extra,
  });
}
