/** JavaScriptCore lacks the browser structuredClone global. Clone the engine's data structures. */
export function nativeClone<T>(value: T, seen = new Map<object, unknown>()): T {
  if (typeof value === 'function' || typeof value === 'symbol')
    throw new Error('Unsupported native clone value.');
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value) as T;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (value instanceof Map) {
    const result = new Map();
    seen.set(value, result);
    for (const [key, item] of value) result.set(nativeClone(key, seen), nativeClone(item, seen));
    return result as T;
  }
  if (value instanceof Set) {
    const result = new Set();
    seen.set(value, result);
    for (const item of value) result.add(nativeClone(item, seen));
    return result as T;
  }
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    seen.set(value, result);
    result.length = value.length;
    value.forEach((item, index) => {
      result[index] = nativeClone(item, seen);
    });
    return result as T;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error('Unsupported object in native clone.');
  const result: Record<string, unknown> = prototype === null ? Object.create(null) : {};
  seen.set(value, result);
  for (const [key, item] of Object.entries(value)) result[key] = nativeClone(item, seen);
  return result as T;
}
