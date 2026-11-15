import { describe, expect, it } from 'vitest';
import { offlineStatus, type OfflineFacts } from './offline';

const base: OfflineFacts = {
  supported: true, isDev: false, hasActive: false, hasPending: false, failed: false, timedOut: false,
  controlledAtLoad: false, controllerChanged: false,
};
const st = (f: Partial<OfflineFacts>) => offlineStatus({ ...base, ...f });

describe('offlineStatus', () => {
  it('is hidden when service workers are unsupported, whatever else is true', () => {
    expect(st({ supported: false })).toBe('hidden');
    expect(st({ supported: false, hasActive: true })).toBe('hidden');
    expect(st({ supported: false, hasPending: true })).toBe('hidden');
    expect(st({ supported: false, controlledAtLoad: true, controllerChanged: true })).toBe('hidden');
  });

  it('is hidden in dev (no service worker is built)', () => {
    expect(st({ isDev: true })).toBe('hidden');
    expect(st({ isDev: true, hasActive: true })).toBe('hidden');
    expect(st({ isDev: true, hasActive: true, hasPending: true })).toBe('hidden');
    expect(st({ isDev: true, controlledAtLoad: true, controllerChanged: true })).toBe('hidden');
  });

  it('shows downloading while the registration has not appeared yet (first visit)', () => {
    expect(st({})).toBe('downloading');
  });

  it('shows downloading while a first worker is installing or waiting', () => {
    expect(st({ hasPending: true })).toBe('downloading');
    // A slow precache keeps showing downloading after the wait time.
    expect(st({ hasPending: true, timedOut: true })).toBe('downloading');
  });

  it('is ready once a worker is active', () => {
    expect(st({ hasActive: true })).toBe('ready');
    expect(st({ hasActive: true, failed: true })).toBe('ready');
    expect(st({ hasActive: true, timedOut: true })).toBe('ready');
    expect(st({ hasActive: true, controlledAtLoad: true })).toBe('ready');
  });

  it('is hidden when the install failed or nothing appeared in time', () => {
    expect(st({ failed: true })).toBe('hidden');
    expect(st({ timedOut: true })).toBe('hidden');
    // A registration without any worker: the wait time still hides the line.
    expect(st({ timedOut: true, failed: false, hasActive: false, hasPending: false })).toBe('hidden');
  });

  describe('first install (no controller at load)', () => {
    const first = { controlledAtLoad: false };
    it('goes downloading -> ready, never update-ready, although clientsClaim fires controllerchange', () => {
      expect(st({ ...first, hasPending: true })).toBe('downloading');
      expect(st({ ...first, hasActive: true, controllerChanged: true })).toBe('ready');
      expect(st({ ...first, hasActive: true, hasPending: false, controllerChanged: true })).toBe('ready');
    });
    it('a later update on the same page shows updating, not update-ready', () => {
      expect(st({ ...first, hasActive: true, hasPending: true, controllerChanged: true })).toBe('updating');
    });
  });

  describe('update of a controlled page', () => {
    const upd = { controlledAtLoad: true, hasActive: true };
    it('shows updating while a new worker installs or waits behind the active one', () => {
      expect(st({ ...upd, hasPending: true })).toBe('updating');
      expect(st({ ...upd, hasPending: true, timedOut: true })).toBe('updating');
    });
    it('shows update-ready once the new worker has taken control', () => {
      expect(st({ ...upd, controllerChanged: true })).toBe('update-ready');
    });
    it('goes back to ready if the update fails (the pending worker disappears)', () => {
      expect(st({ ...upd, hasPending: false, failed: true })).toBe('ready');
    });
  });

  describe('priority: update-ready > updating > ready', () => {
    it('update-ready wins over updating (a second update starts installing)', () => {
      expect(st({ controlledAtLoad: true, controllerChanged: true, hasActive: true, hasPending: true })).toBe('update-ready');
    });
    it('update-ready wins whatever the other facts are', () => {
      expect(st({ controlledAtLoad: true, controllerChanged: true })).toBe('update-ready');
      expect(st({ controlledAtLoad: true, controllerChanged: true, failed: true, timedOut: true })).toBe('update-ready');
    });
    it('updating wins over ready', () => {
      expect(st({ hasActive: true, hasPending: true })).toBe('updating');
      expect(st({ hasActive: true })).toBe('ready');
    });
  });
});
