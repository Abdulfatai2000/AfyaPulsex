// Helpers for building $set / create payloads from partial model inputs.
// Strips internal keys callers must never set (ids, timestamps, simulation flag).

export const META_KEYS = [
  "_id",
  "__v",
  "createdAt",
  "updatedAt",
  "simulation",
] as const;

export function omitMeta<T extends object>(
  input: T | undefined | null,
): Partial<T> {
  const source = (input ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (
      !(META_KEYS as readonly string[]).includes(key) &&
      value !== undefined
    ) {
      out[key] = value;
    }
  }
  return out as Partial<T>;
}
