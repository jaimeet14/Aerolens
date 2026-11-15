/**
 * Storage access that never throws. Blocked site data, private modes and sandboxed frames can make
 * localStorage, or even reading `window.localStorage`, throw a SecurityError; callers then simply
 * behave as if nothing was saved. The store is a parameter so the helpers can be unit-tested.
 */
export type StoreLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** window.localStorage, or null if it is missing or merely touching it throws. */
export function getStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function safeGet(store: StoreLike | null, key: string): string | null {
  if (!store) return null;
  try { return store.getItem(key); } catch { return null; }
}

/** True if the value was stored. */
export function safeSet(store: StoreLike | null, key: string, value: string): boolean {
  if (!store) return false;
  try { store.setItem(key, value); return true; } catch { return false; }
}

/** True if the remove call went through (including when the key was absent). */
export function safeRemove(store: StoreLike | null, key: string): boolean {
  if (!store) return false;
  try { store.removeItem(key); return true; } catch { return false; }
}
