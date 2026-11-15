const MiB = 1024 * 1024;

export interface ImportLimits {
  /** Maximum size of the selected ZIP file, in bytes. */
  maxZipBytes: number;
  /** Maximum uncompressed size of conversations.json, in bytes. */
  maxJsonBytes: number;
  /** Maximum number of entries in the ZIP archive. */
  maxEntries: number;
}

/**
 * Defaults are bounded by browser memory: JSZip loads the whole archive into
 * memory, and V8 caps string length at roughly 512 MiB.
 */
export const DEFAULT_LIMITS: ImportLimits = {
  maxZipBytes: 1024 * MiB,
  maxJsonBytes: 512 * MiB,
  maxEntries: 50_000,
};

export function resolveLimits(overrides?: Partial<ImportLimits>): ImportLimits {
  return { ...DEFAULT_LIMITS, ...overrides };
}

export function formatBytes(bytes: number): string {
  if (bytes >= MiB) return `${Math.round((bytes / MiB) * 10) / 10} MB`;
  if (bytes >= 1024) return `${Math.round((bytes / 1024) * 10) / 10} KB`;
  return `${bytes} bytes`;
}
