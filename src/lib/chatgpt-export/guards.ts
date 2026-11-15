/** Small helpers for narrowing untrusted `unknown` export data. */

export type RawObject = Record<string, unknown>;

export function isObject(value: unknown): value is RawObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Export timestamps are Unix seconds (often fractional). Returns ms or null. */
export function secondsToMs(value: unknown): number | null {
  const seconds = asFiniteNumber(value);
  if (seconds === null || seconds <= 0) return null;
  return Math.round(seconds * 1000);
}
