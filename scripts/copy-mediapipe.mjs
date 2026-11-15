// Copies the MediaPipe Face Mesh runtime + model from node_modules into public/,
// so the app loads everything from its own origin (no CDN, works offline on the store's phone).
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
const src = 'node_modules/@mediapipe/face_mesh';
const dst = 'public/mediapipe';
mkdirSync(dst, { recursive: true });
for (const f of readdirSync(src)) {
  if (/^face_mesh/.test(f) && !f.endsWith('.d.ts')) cpSync(`${src}/${f}`, `${dst}/${f}`);
}
console.log('MediaPipe assets copied to', dst);
