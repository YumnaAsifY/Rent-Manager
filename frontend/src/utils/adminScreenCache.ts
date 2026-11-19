const cache = new Map<string, unknown>();

export function readAdminCache<T>(key: string): T | undefined {
  if (!cache.has(key)) {
    return undefined;
  }

  return cache.get(key) as T;
}

export function writeAdminCache<T>(key: string, value: T) {
  cache.set(key, value);
}
