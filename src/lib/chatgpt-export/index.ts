import { safeParseJson } from "./json";
import { resolveLimits, type ImportLimits } from "./limits";
import { normalizeConversation } from "./normalize";
import type { Conversation, ImportInput, ImportResult, ImportWarning } from "./types";
import { extractConversationsJson } from "./zip";

export type * from "./types";
export { DEFAULT_LIMITS, type ImportLimits } from "./limits";

export interface ImportOptions {
  limits?: Partial<ImportLimits>;
}

/** Parses already-decoded conversations.json data. Never throws. */
export function parseConversations(data: unknown): ImportResult {
  if (!Array.isArray(data)) {
    return {
      ok: false,
      error: {
        code: "UNSUPPORTED_FORMAT",
        message: "conversations.json does not contain a list of conversations. This export format is not supported.",
      },
    };
  }

  const warnings: ImportWarning[] = [];
  const conversations: Conversation[] = [];
  data.forEach((raw: unknown, index) => {
    try {
      const conversation = normalizeConversation(raw, index, warnings);
      if (conversation) conversations.push(conversation);
    } catch (err) {
      warnings.push({
        index,
        conversationId: null,
        message: `Conversation could not be parsed and was skipped (${err instanceof Error ? err.message : String(err)}).`,
      });
    }
  });

  conversations.sort(
    (a, b) => (b.updateTime ?? b.createTime ?? 0) - (a.updateTime ?? a.createTime ?? 0),
  );
  return { ok: true, conversations, warnings };
}

/**
 * Imports a ChatGPT data export ZIP entirely in memory. Nothing is uploaded
 * or persisted. Never throws; failures are returned as `{ ok: false }`.
 */
export async function importChatGptExport(
  input: ImportInput,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const extracted = await extractConversationsJson(input, resolveLimits(options.limits));
  if (!extracted.ok) return extracted;

  const parsed = safeParseJson(extracted.text);
  if (!parsed.ok) return parsed;

  return parseConversations(parsed.value);
}
