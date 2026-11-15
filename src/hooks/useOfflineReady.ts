import { useEffect, useState } from 'react';
import { OFFLINE_WAIT_MS, offlineStatus, type OfflineStatus } from '../lib/offline';

const POLL_MS = 500;

/**
 * The controller when this page (this copy of the JS) loaded. Captured once at module load, not at hook mount, so a
 * welcome screen shown again later (Start over) still knows the page runs the code it loaded with. A first install
 * has none (clientsClaim then fires controllerchange, which is not an update).
 */
const LOAD_CONTROLLER: ServiceWorker | null =
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? navigator.serviceWorker.controller : null;

/**
 * Offline / update status of the app, from the service worker registered by dist/registerSW.js (vite-plugin-pwa).
 * Only observes: never registers, updates or unregisters a worker, and never touches storage.
 */
export function useOfflineReady(): OfflineStatus {
  const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const isDev = import.meta.env.DEV;
  const [facts, setFacts] = useState({
    hasActive: false, hasPending: false, failed: false, timedOut: false, controllerChanged: false,
  });

  useEffect(() => {
    if (!supported || isDev) return;
    const sw = navigator.serviceWorker;
    let reg: ServiceWorkerRegistration | undefined;
    let disposed = false;
    let failed = false;
    let changed = false;
    const watched = new Set<ServiceWorker>();

    const refresh = () => {
      if (disposed) return;
      for (const w of [reg?.installing, reg?.waiting]) {
        if (w && !watched.has(w)) { watched.add(w); w.addEventListener('statechange', onState); }
      }
      const hasActive = !!reg?.active;
      const hasPending = !!(reg?.installing || reg?.waiting);
      // Also catches a takeover that happened while the welcome screen was not mounted.
      const controllerChanged = changed || (!!sw.controller && sw.controller !== LOAD_CONTROLLER);
      setFacts((f) => ({ ...f, hasActive, hasPending, failed, controllerChanged }));
    };
    function onState(this: ServiceWorker) {
      if (this.state === 'redundant' && !reg?.active) failed = true;
      refresh();
    }
    const onControllerChange = () => {
      // Only counts as an update when the page loaded under a controller (see LOAD_CONTROLLER).
      if (sw.controller) changed = true;
      refresh();
    };
    const attach = (r: ServiceWorkerRegistration | undefined) => {
      if (disposed || !r || reg) return;
      reg = r;
      r.addEventListener('updatefound', refresh);
      clearInterval(poll);
      // The timeout keeps running: a registration without any worker still hides the line after the wait.
      refresh();
    };

    // The registration may appear a moment after load (registerSW.js runs on window load): poll briefly.
    const poll = setInterval(() => { sw.getRegistration().then(attach, () => {}); }, POLL_MS);
    const timer = setTimeout(() => {
      clearInterval(poll);
      if (!disposed) setFacts((f) => ({ ...f, timedOut: true }));
    }, OFFLINE_WAIT_MS);
    sw.getRegistration().then(attach, () => {});
    // Resolves once a worker is active (precache complete), without a reload.
    sw.ready.then((r) => { attach(r); refresh(); }, () => {});
    sw.addEventListener('controllerchange', onControllerChange);

    return () => {
      disposed = true;
      clearInterval(poll);
      clearTimeout(timer);
      sw.removeEventListener('controllerchange', onControllerChange);
      reg?.removeEventListener('updatefound', refresh);
      for (const w of watched) w.removeEventListener('statechange', onState);
    };
  }, [supported, isDev]);

  return offlineStatus({ supported, isDev, controlledAtLoad: !!LOAD_CONTROLLER, ...facts });
}
