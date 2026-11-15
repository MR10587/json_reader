import JSZip from "jszip";
import { formatBytes, type ImportLimits } from "./limits";
import type { ImportError, ImportInput } from "./types";

const TARGET_FILE = "conversations.json";

export type ExtractResult =
  | { ok: true; text: string; path: string }
  | { ok: false; error: ImportError };

function inputSize(input: ImportInput): number {
  return input instanceof Blob ? input.size : input.byteLength;
}

async function toBinary(input: ImportInput): Promise<ArrayBuffer | Uint8Array> {
  // Read Blobs ourselves so behaviour is the same in browsers and in Node tests.
  return input instanceof Blob ? input.arrayBuffer() : input;
}

function fail(code: ImportError["code"], message: string): ExtractResult {
  return { ok: false, error: { code, message } };
}

/**
 * Picks conversations.json from the archive. Prefers the shallowest match
 * (exports normally have it at the root) and ignores macOS metadata folders.
 */
export function findConversationsEntry(zip: JSZip): JSZip.JSZipObject | null {
  const candidates = Object.values(zip.files).filter((entry) => {
    if (entry.dir) return false;
    const path = entry.name.replace(/\\/g, "/");
    if (path.startsWith("__MACOSX/") || path.includes("/__MACOSX/")) return false;
    const base = path.split("/").pop() ?? "";
    return base.toLowerCase() === TARGET_FILE;
  });
  candidates.sort(
    (a, b) => a.name.split("/").length - b.name.split("/").length || a.name.localeCompare(b.name),
  );
  return candidates[0] ?? null;
}

/**
 * Reads the uncompressed size declared in the ZIP central directory.
 * JSZip does not expose this publicly, so it is read defensively; JSZip
 * itself throws if the actual decompressed length differs from this value.
 */
function declaredUncompressedSize(entry: JSZip.JSZipObject): number | null {
  const data: unknown = (entry as unknown as { _data?: unknown })._data;
  if (typeof data === "object" && data !== null && "uncompressedSize" in data) {
    const size = (data as { uncompressedSize: unknown }).uncompressedSize;
    if (typeof size === "number" && Number.isFinite(size) && size >= 0) return size;
  }
  return null;
}

export async function extractConversationsJson(
  input: ImportInput,
  limits: ImportLimits,
): Promise<ExtractResult> {
  const size = inputSize(input);
  if (size > limits.maxZipBytes) {
    return fail(
      "FILE_TOO_LARGE",
      `The file is ${formatBytes(size)}, which exceeds the ${formatBytes(limits.maxZipBytes)} limit.`,
    );
  }
  if (size === 0) {
    return fail("INVALID_ZIP", "The selected file is empty.");
  }

  let binary: ArrayBuffer | Uint8Array;
  try {
    binary = await toBinary(input);
  } catch {
    return fail("READ_FAILED", "The selected file could not be read. Please try selecting it again.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(binary);
  } catch {
    return fail(
      "INVALID_ZIP",
      "This file could not be opened as a ZIP archive. Please select the .zip file from your ChatGPT data export.",
    );
  }

  const entryCount = Object.keys(zip.files).length;
  if (entryCount > limits.maxEntries) {
    return fail(
      "TOO_MANY_ENTRIES",
      `The archive contains ${entryCount} entries, which exceeds the ${limits.maxEntries} limit.`,
    );
  }

  const entry = findConversationsEntry(zip);
  if (!entry) {
    return fail(
      "NOT_FOUND",
      "No conversations.json was found in this archive. Is this a ChatGPT data export?",
    );
  }

  const tooLarge = (bytes: number) =>
    fail(
      "CONTENT_TOO_LARGE",
      `conversations.json is ${formatBytes(bytes)} uncompressed, which exceeds the ${formatBytes(limits.maxJsonBytes)} limit.`,
    );

  const declared = declaredUncompressedSize(entry);
  if (declared !== null && declared > limits.maxJsonBytes) return tooLarge(declared);

  let bytes: Uint8Array;
  try {
    bytes = await entry.async("uint8array");
  } catch {
    return fail("INVALID_ZIP", "conversations.json could not be decompressed; the archive may be corrupted.");
  }
  if (bytes.byteLength > limits.maxJsonBytes) return tooLarge(bytes.byteLength);

  try {
    return { ok: true, text: new TextDecoder("utf-8").decode(bytes), path: entry.name };
  } catch {
    // e.g. RangeError when the text exceeds the engine's maximum string length.
    return tooLarge(bytes.byteLength);
  }
}
