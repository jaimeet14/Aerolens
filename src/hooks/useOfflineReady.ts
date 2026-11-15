import { useEffect, useState } from 'react';
import { OFFLINE_WAIT_MS, offlineStatus, type OfflineStatus } from '../lib/offline';

const POLL_MS = 500;

/**
 * Offline readiness of the app, from the service worker registered by dist/registerSW.js (vite-plugin-pwa).
 * Only observes: never registers, updates or unregisters a worker, and never touches storage.
 */
export function useOfflineReady(): OfflineStatus {
  const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const isDev = import.meta.env.DEV;
  const [facts, setFacts] = useState({ hasActive: false, hasPending: false, failed: false, timedOut: false });

  useEffect(() => {
    if (!supported || isDev) return;
    const sw = navigator.serviceWorker;
    let reg: ServiceWorkerRegistration | undefined;
    let disposed = false;
    let failed = false;
    const watched = new Set<ServiceWorker>();

    const refresh = () => {
      if (disposed) return;
      for (const w of [reg?.installing, reg?.waiting]) {
        if (w && !watched.has(w)) { watched.add(w); w.addEventListener('statechange', onState); }
      }
      const hasActive = !!reg?.active;
      const hasPending = !!(reg?.installing || reg?.waiting);
      setFacts((f) => ({ ...f, hasActive, hasPending, failed }));
    };
    function onState(this: ServiceWorker) {
      if (this.state === 'redundant' && !reg?.active) failed = true;
      refresh();
    }
    const attach = (r: ServiceWorkerRegistration | undefined) => {
      if (disposed || !r || reg) return;
      reg = r;
      r.addEventListener('updatefound', refresh);
      clearInterval(poll);
      clearTimeout(timer);
      refresh();
    };

    // The registration may appear a moment after load (registerSW.js runs on window load): poll briefly.
    const poll = setInterval(() => { sw.getRegistration().then(attach, () => {}); }, POLL_MS);
    const timer = setTimeout(() => {
      clearInterval(poll);
      if (!disposed && !reg) setFacts((f) => ({ ...f, timedOut: true }));
    }, OFFLINE_WAIT_MS);
    sw.getRegistration().then(attach, () => {});
    // Resolves once a worker is active (precache complete), without a reload.
    sw.ready.then((r) => { attach(r); refresh(); }, () => {});
    sw.addEventListener('controllerchange', refresh);

    return () => {
      disposed = true;
      clearInterval(poll);
      clearTimeout(timer);
      sw.removeEventListener('controllerchange', refresh);
      reg?.removeEventListener('updatefound', refresh);
      for (const w of watched) w.removeEventListener('statechange', onState);
    };
  }, [supported, isDev]);

  return offlineStatus({ supported, isDev, ...facts });
}
