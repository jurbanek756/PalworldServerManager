import type { PalworldPlayer, PalworldInfo, PalworldMetrics, Snapshot, ConnectionError, AppError } from "../types";

/**
 * Type Guard verifying if an unknown object satisfies `PalworldPlayer`.
 */
export function isPalworldPlayer(value: unknown): value is PalworldPlayer {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["name"] === "string" &&
    typeof v["playerId"] === "string" &&
    typeof v["level"] === "number"
  );
}

/**
 * Type Guard verifying if an unknown object satisfies `PalworldInfo`.
 */
export function isPalworldInfo(value: unknown): value is PalworldInfo {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["version"] === "string" &&
    typeof v["servername"] === "string" &&
    typeof v["worldguid"] === "string"
  );
}

/**
 * Type Guard verifying if an unknown object satisfies `Snapshot`.
 */
export function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["refreshedAt"] === "string" &&
    isPalworldInfo(v["info"]) &&
    Array.isArray(v["players"])
  );
}

/**
 * Type Guard verifying if an unknown object is an `AppError`.
 */
export function isAppError(value: unknown): value is AppError {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v["code"] === "string" && typeof v["message"] === "string";
}

/**
 * Utility type to extract object keys whose values match `ValueType`.
 */
export type KeysOfType<T, ValueType> = {
  [K in keyof T]: T[K] extends ValueType ? K : never;
}[keyof T];

/**
 * Deep Readonly utility type ensuring recursive immutability.
 */
export type DeepReadonly<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
