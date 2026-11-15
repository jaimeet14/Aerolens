import { describe, expect, it } from 'vitest';
import { offlineStatus, type OfflineFacts } from './offline';

const base: OfflineFacts = { supported: true, isDev: false, hasActive: false, hasPending: false, failed: false, timedOut: false };
const st = (f: Partial<OfflineFacts>) => offlineStatus({ ...base, ...f });

describe('offlineStatus', () => {
  it('is hidden when service workers are unsupported, whatever else is true', () => {
    expect(st({ supported: false })).toBe('hidden');
    expect(st({ supported: false, hasActive: true })).toBe('hidden');
    expect(st({ supported: false, hasPending: true })).toBe('hidden');
  });

  it('is hidden in dev (no service worker is built)', () => {
    expect(st({ isDev: true })).toBe('hidden');
    expect(st({ isDev: true, hasActive: true })).toBe('hidden');
  });

  it('shows downloading while the registration has not appeared yet (first visit)', () => {
    expect(st({})).toBe('downloading');
  });

  it('shows downloading while a worker is installing or waiting', () => {
    expect(st({ hasPending: true })).toBe('downloading');
    // A slow precache keeps showing downloading after the wait time.
    expect(st({ hasPending: true, timedOut: true })).toBe('downloading');
  });

  it('is ready once a worker is active, also while an update installs', () => {
    expect(st({ hasActive: true })).toBe('ready');
    expect(st({ hasActive: true, hasPending: true })).toBe('ready');
    expect(st({ hasActive: true, failed: true })).toBe('ready');
    expect(st({ hasActive: true, timedOut: true })).toBe('ready');
  });

  it('is hidden when the install failed or nothing appeared in time', () => {
    expect(st({ failed: true })).toBe('hidden');
    expect(st({ timedOut: true })).toBe('hidden');
  });
});
