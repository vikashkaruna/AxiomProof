/**
 * Canonical JSON serialisation.
 *
 * Why not just JSON.stringify? Because two semantically identical objects
 * can serialise to different strings depending on key order, which would
 * break the hash chain. This module produces a canonical, deterministic
 * string for any JSON-compatible value.
 *
 * Rules:
 *   - Object keys are sorted lexicographically
 *   - Arrays preserve order
 *   - Numbers, strings, booleans, null serialise natively
 *   - undefined is treated as null (matching JSON)
 *   - No whitespace
 *   - UTF-8 encoded
 */

type JsonValue =
  string | number | boolean | null | undefined | JsonValue[] | { [k: string]: JsonValue };

function sortKeys(value: JsonValue): JsonValue {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value === 'object') {
    const sorted: { [k: string]: JsonValue } = {};
    for (const key of Object.keys(value as Record<string, JsonValue>).sort()) {
      const v = (value as Record<string, JsonValue>)[key];
      if (v === undefined) {
        sorted[key] = null;
      } else {
        sorted[key] = sortKeys(v);
      }
    }
    return sorted;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value as JsonValue));
}

export async function sha256(input: string | Uint8Array): Promise<string> {
  // Copy byte inputs into an ArrayBuffer-backed typed array. WebCrypto rejects
  // views that could be backed by a SharedArrayBuffer, and TS 6 reflects that.
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
