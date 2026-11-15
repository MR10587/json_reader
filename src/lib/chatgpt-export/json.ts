import type { ImportError } from "./types";

export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: ImportError };

export function safeParseJson(text: string): JsonParseResult {
  // Strip a UTF-8 BOM if present; JSON.parse rejects it.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  try {
    return { ok: true, value: JSON.parse(input) as unknown };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: {
        code: "MALFORMED_JSON",
        message: `conversations.json is not valid JSON (${detail}).`,
      },
    };
  }
}
