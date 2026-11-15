import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStore, safeGet, safeRemove, safeSet, type StoreLike } from './storage';

function memoryStore(): StoreLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}
const blocked = () => { throw new DOMException('blocked', 'SecurityError'); };
const throwingStore: StoreLike = { getItem: blocked, setItem: blocked, removeItem: blocked };

describe('storage helpers with a working store', () => {
  it('round-trips, removes, and returns null for a missing key', () => {
    const s = memoryStore();
    expect(safeGet(s, 'k')).toBeNull();
    expect(safeSet(s, 'k', '812.5')).toBe(true);
    expect(safeGet(s, 'k')).toBe('812.5');
    expect(safeRemove(s, 'k')).toBe(true);
    expect(safeGet(s, 'k')).toBeNull();
    expect(safeRemove(s, 'k')).toBe(true);
  });
});

describe('storage helpers with a throwing store', () => {
  it('swallows SecurityError and QuotaExceeded-style errors', () => {
    expect(safeGet(throwingStore, 'k')).toBeNull();
    expect(safeSet(throwingStore, 'k', 'v')).toBe(false);
    expect(safeRemove(throwingStore, 'k')).toBe(false);
  });
});

describe('storage helpers with no store', () => {
  it('treats null as empty and unwritable', () => {
    expect(safeGet(null, 'k')).toBeNull();
    expect(safeSet(null, 'k', 'v')).toBe(false);
    expect(safeRemove(null, 'k')).toBe(false);
  });
});

describe('getStore', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns null when there is no window', () => {
    vi.stubGlobal('window', undefined);
    expect(getStore()).toBeNull();
  });
  it('returns null when reading window.localStorage throws', () => {
    vi.stubGlobal('window', Object.defineProperty({}, 'localStorage', { get: blocked }));
    expect(getStore()).toBeNull();
  });
  it('returns window.localStorage when it is available', () => {
    const s = memoryStore();
    vi.stubGlobal('window', { localStorage: s });
    expect(getStore()).toBe(s);
  });
});
