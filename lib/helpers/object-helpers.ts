/**
 * Object helper utilities for Supabase services.
 */

/**
 * Strip `undefined` values from an object before passing to Supabase.
 */
export function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

/**
 * Convert camelCase keys to snake_case, strip `undefined` values and
 * remove common non-DB keys (`id`, `createdAt`, `updatedAt`).
 *
 * Use this when passing TypeScript model objects to Supabase
 * `.insert()` / `.update()` to avoid sending camelCase keys that PostgREST
 * will reject with 400.
 */
export function toSnakePayload(
  obj: Record<string, unknown>,
  { stripKeys = ["id", "createdAt", "updatedAt"] }: { stripKeys?: string[] } = {}
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (stripKeys.includes(key)) continue;
    // Convert camelCase → snake_case
    const snakeKey = key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}
