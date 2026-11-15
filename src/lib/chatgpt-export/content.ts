import { asFiniteNumber, asNonEmptyString, asString, isObject } from "./guards";
import type { ContentPart } from "./types";

/**
 * Converts a raw `message.content` object into normalized parts.
 * Unknown content types are kept as `unsupported` rather than dropped.
 */

function stringParts(parts: unknown): string[] {
  return Array.isArray(parts) ? parts.filter((p): p is string => typeof p === "string") : [];
}

function textPart(text: string | null): ContentPart[] {
  return text !== null && text !== "" ? [{ kind: "text", text }] : [];
}

function multimodalPart(part: unknown): ContentPart | null {
  if (typeof part === "string") return part === "" ? null : { kind: "text", text: part };
  if (!isObject(part)) return null;

  const type = asString(part.content_type) ?? "unknown";
  switch (type) {
    case "image_asset_pointer":
      return {
        kind: "image",
        assetPointer: asString(part.asset_pointer),
        width: asFiniteNumber(part.width),
        height: asFiniteNumber(part.height),
      };
    case "audio_transcription":
      return { kind: "audio", transcript: asString(part.text) };
    case "audio_asset_pointer":
      return { kind: "audio", transcript: null };
    default:
      return { kind: "unsupported", contentType: type };
  }
}

function thoughtsText(thoughts: unknown): string {
  if (!Array.isArray(thoughts)) return "";
  return thoughts
    .map((t) => {
      if (!isObject(t)) return "";
      const summary = asNonEmptyString(t.summary);
      const content = asNonEmptyString(t.content);
      return [summary, content].filter(Boolean).join("\n");
    })
    .filter((s) => s !== "")
    .join("\n\n");
}

export function normalizeContent(content: unknown): { contentType: string; parts: ContentPart[] } {
  if (!isObject(content)) return { contentType: "missing", parts: [] };

  const contentType = asString(content.content_type) ?? "unknown";
  const parts = ((): ContentPart[] => {
    switch (contentType) {
      case "text":
        return stringParts(content.parts).flatMap((t) => textPart(t));

      case "multimodal_text":
        return Array.isArray(content.parts)
          ? content.parts.map(multimodalPart).filter((p): p is ContentPart => p !== null)
          : [];

      case "code":
        return [
          {
            kind: "code",
            language: asNonEmptyString(content.language),
            text: asString(content.text) ?? "",
          },
        ];

      case "execution_output":
        return [{ kind: "execution_output", text: asString(content.text) ?? "" }];

      case "tether_quote":
        return [
          {
            kind: "quote",
            text: asString(content.text) ?? "",
            url: asNonEmptyString(content.url),
            title: asNonEmptyString(content.title),
            domain: asNonEmptyString(content.domain),
          },
        ];

      case "tether_browsing_display": {
        const text = asNonEmptyString(content.summary) ?? asNonEmptyString(content.result) ?? "";
        return text === "" ? [] : [{ kind: "browsing", text }];
      }

      case "system_error":
        return [
          {
            kind: "error",
            name: asNonEmptyString(content.name),
            text: asString(content.text) ?? "",
          },
        ];

      case "thoughts": {
        const text = thoughtsText(content.thoughts);
        return text === "" ? [] : [{ kind: "reasoning", text }];
      }

      case "reasoning_recap": {
        const text = asNonEmptyString(content.content);
        return text === null ? [] : [{ kind: "reasoning", text }];
      }

      case "user_editable_context": {
        const text = [asNonEmptyString(content.user_profile), asNonEmptyString(content.user_instructions)]
          .filter(Boolean)
          .join("\n\n");
        return text === "" ? [] : [{ kind: "context", text }];
      }

      default:
        return [{ kind: "unsupported", contentType }];
    }
  })();

  return { contentType, parts };
}
