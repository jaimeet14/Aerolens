/*
 * Offline readiness line on the welcome screen. The service worker (vite-plugin-pwa generateSW, registered by
 * dist/registerSW.js) precaches the app and the MediaPipe Face Mesh files; with generateSW a worker only becomes
 * active after its precache has completed, so "an active worker exists" means "the app works offline".
 */

export type OfflineStatus = 'hidden' | 'downloading' | 'ready';

/** What the page can observe about its service worker. */
export interface OfflineFacts {
  /** 'serviceWorker' in navigator. */
  supported: boolean;
  /** Vite dev server (import.meta.env.DEV): no service worker is built. */
  isDev: boolean;
  /** The registration has an active worker (precache complete). */
  hasActive: boolean;
  /** A worker is installing (precaching) or waiting. */
  hasPending: boolean;
  /** A worker we were watching became redundant (install / precache failed). */
  failed: boolean;
  /** No registration or worker appeared within the wait time (registration failed or never ran). */
  timedOut: boolean;
}

/**
 * hidden: unsupported, dev, failed, or nothing appeared in time; ready: an active worker;
 * downloading: a worker is installing, or the registration is expected but has not appeared yet.
 */
export function offlineStatus(f: OfflineFacts): OfflineStatus {
  if (!f.supported || f.isDev) return 'hidden';
  if (f.hasActive) return 'ready';
  if (f.hasPending) return 'downloading';
  if (f.failed || f.timedOut) return 'hidden';
  return 'downloading';
}

/** How long to wait for a registration to appear before hiding the line. */
export const OFFLINE_WAIT_MS = 10_000;
