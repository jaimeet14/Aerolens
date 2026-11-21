import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Build time for the version label on the welcome screen (src/lib/version.ts); no git hash, the Vercel CLI
  // builds without .git. Vitest reads this config too, so the constant exists in tests.
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    tailwindcss(),
    // Service worker (Workbox generateSW) so the app installs and runs offline at the counter.
    VitePWA({
      registerType: 'autoUpdate',
      // 'auto' + no `virtual:pwa-register` import: the plugin injects registerSW.js into index.html.
      // A new deploy takes over silently (skipWaiting/clientsClaim) and shows from the next page load,
      // so a test in progress is never reloaded.
      injectRegister: 'auto',
      // Keep public/manifest.webmanifest (linked from index.html) as the only manifest.
      manifest: false,
      workbox: {
        // App shell + the MediaPipe Face Mesh runtime/model copied into public/mediapipe + the recorded interview
        // clips in public/audio (mp3 only; the folder's .gitkeep files are not matched) + the bundled woff2 fonts (the
        // .woff fallbacks Vite also emits are not precached: every browser with a service worker reads woff2).
        globPatterns: ['**/*.{js,css,html,svg,webmanifest,wasm,data,binarypb,tflite,woff2}', 'audio/**/*.mp3'],
        // The Face Mesh .wasm files are about 6 MB each (Workbox default limit is 2 MiB); a ~30 s clip at 64 kbps
        // is about 250 KB.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // Any navigation (e.g. /?demo=1) gets the cached app shell when offline.
        navigateFallback: 'index.html',
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  base: './',
});
