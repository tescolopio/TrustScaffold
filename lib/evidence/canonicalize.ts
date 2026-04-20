/**
 * RFC 8785 JSON Canonicalization Scheme (JCS).
 *
 * Deterministic serialization of JSON values so that SHA-256 hashes
 * are stable regardless of key ordering or whitespace in the source.
 *
 * Reference: https://www.rfc-editor.org/rfc/rfc8785
 */

/**
 * Produce the RFC-8785 canonical form of a JSON-compatible value.
 *
 * Rules:
 * - Objects: keys sorted by Unicode code-point order, no whitespace.
 * - Arrays: elements in original order.
 * - Strings: minimal JSON escaping (required control chars + `"` and `\`).
 * - Numbers: shortest representation that round-trips (ES `JSON.stringify` for finite numbers).
 * - Literals: `true`, `false`, `null` as-is.
 */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    if (!isFinite(value)) {
      return 'null'; // Infinity / NaN → null per JSON spec
    }
    // ES JSON.stringify already produces the shortest round-trip form
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalize(item));
    return `[${items.join(',')}]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort(); // Unicode code-point order
    const pairs = keys.map((key) => {
      const canonicalKey = JSON.stringify(key);
      const canonicalValue = canonicalize(obj[key]);
      return `${canonicalKey}:${canonicalValue}`;
    });
    return `{${pairs.join(',')}}`;
  }

  // Fallback (BigInt, Symbol, etc.) — serialize as null
  return 'null';
}
