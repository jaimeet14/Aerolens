/*
 * Offline / update status line on the welcome screen. The service worker (vite-plugin-pwa generateSW, registered by
 * dist/registerSW.js) precaches the app and the MediaPipe Face Mesh files; with generateSW a worker only becomes
 * active after its precache has completed, so "an active worker exists" means "the app works offline".
 * With skipWaiting + clientsClaim a new deploy's worker takes control as soon as it has precached
 * (controllerchange), but the open page keeps running the old code until it is reloaded.
 */

export type OfflineStatus = 'hidden' | 'downloading' | 'ready' | 'updating' | 'update-ready';

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
  /** The wait time passed (registration failed or never ran, or it has no worker at all). */
  timedOut: boolean;
  /** The page already had a controller when it loaded (not a first install). */
  controlledAtLoad: boolean;
  /** The controller changed since the page loaded (a controllerchange, or a different controller now). */
  controllerChanged: boolean;
}

/**
 * hidden: unsupported, dev, failed, or nothing appeared in time;
 * update-ready: a new worker took control of a page that was already controlled at load, so this page runs old code
 * (a first install also fires controllerchange through clientsClaim, but had no controller at load);
 * updating: an active worker exists and a new one is installing or waiting;
 * ready: an active worker;
 * downloading: a first worker is installing, or the registration is expected but has not appeared yet.
 * Priority: update-ready > updating > ready > downloading.
 */
export function offlineStatus(f: OfflineFacts): OfflineStatus {
  if (!f.supported || f.isDev) return 'hidden';
  if (f.controlledAtLoad && f.controllerChanged) return 'update-ready';
  if (f.hasActive && f.hasPending) return 'updating';
  if (f.hasActive) return 'ready';
  if (f.hasPending) return 'downloading';
  if (f.failed || f.timedOut) return 'hidden';
  return 'downloading';
}

/** How long to wait for a registration with a worker to appear before hiding the line. */
export const OFFLINE_WAIT_MS = 10_000;
