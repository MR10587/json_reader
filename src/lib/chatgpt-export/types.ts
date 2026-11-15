/**
 * Normalized output types produced by the ChatGPT export parser.
 *
 * These are ChatArchive's own types and are intentionally decoupled from the
 * raw export format: raw data is always handled as `unknown` and narrowed
 * defensively in `normalize.ts` / `content.ts`.
 */

export type Role = "user" | "assistant" | "system" | "tool" | "unknown";

export type ContentPart =
  | { kind: "text"; text: string }
  | { kind: "code"; language: string | null; text: string }
  | { kind: "execution_output"; text: string }
  | {
      kind: "quote";
      text: string;
      url: string | null;
      title: string | null;
      domain: string | null;
    }
  | { kind: "browsing"; text: string }
  | { kind: "error"; name: string | null; text: string }
  | { kind: "reasoning"; text: string }
  | { kind: "context"; text: string }
  | {
      kind: "image";
      assetPointer: string | null;
      width: number | null;
      height: number | null;
    }
  | { kind: "audio"; transcript: string | null }
  /** A content type (or multimodal part type) this parser does not understand. */
  | { kind: "unsupported"; contentType: string };

export interface Message {
  id: string;
  role: Role;
  /** Author name, e.g. the tool name for `tool` messages. */
  authorName: string | null;
  /** Milliseconds since epoch, or null if missing/invalid. */
  createTime: number | null;
  /** Raw `content.content_type`, kept for debugging/UI hints. */
  contentType: string;
  parts: ContentPart[];
  /** True when the export marks the message as hidden from the conversation UI. */
  hidden: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  /** Milliseconds since epoch, or null if missing/invalid. */
  createTime: number | null;
  /** Milliseconds since epoch, or null if missing/invalid. */
  updateTime: number | null;
  model: string | null;
  /** Messages on the currently selected branch, oldest first. */
  messages: Message[];
}

export type ImportErrorCode =
  | "FILE_TOO_LARGE"
  | "READ_FAILED"
  | "INVALID_ZIP"
  | "TOO_MANY_ENTRIES"
  | "NOT_FOUND"
  | "CONTENT_TOO_LARGE"
  | "MALFORMED_JSON"
  | "UNSUPPORTED_FORMAT";

export interface ImportError {
  code: ImportErrorCode;
  message: string;
}

export interface ImportWarning {
  /** Index of the conversation in the source array. */
  index: number;
  conversationId: string | null;
  message: string;
}

export type ImportResult =
  | { ok: true; conversations: Conversation[]; warnings: ImportWarning[] }
  | { ok: false; error: ImportError };

export type ImportInput = Blob | ArrayBuffer | Uint8Array;
