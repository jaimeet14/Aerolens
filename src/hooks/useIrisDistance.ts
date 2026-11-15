import { useCallback, useEffect, useRef, useState } from 'react';
import { parseSavedFocalPx } from '../lib/calibration';
import { demoFaceSample, irisSymmetric, type FaceSample } from '../lib/face';
import { focalPxFromDiagFov, focalPxFromKnownDistance, irisDistanceMm, median } from '../lib/optics';
import { getStore, safeGet, safeSet } from '../lib/storage';

/* Minimal typing for the MediaPipe Face Mesh browser build loaded from /mediapipe. */
interface Landmark { x: number; y: number; z: number }
interface FaceMeshResults { multiFaceLandmarks?: Landmark[][] }
interface FaceMeshInstance {
  setOptions(o: Record<string, unknown>): void;
  onResults(cb: (r: FaceMeshResults) => void): void;
  initialize(): Promise<void>;
  send(i: { image: HTMLVideoElement }): Promise<void>;
  close(): Promise<void>;
}
declare global {
  interface Window { FaceMesh?: new (c: { locateFile: (f: string) => string }) => FaceMeshInstance }
}

const BASE = `${import.meta.env.BASE_URL}mediapipe/`;
const FOCAL_KEY = 'aerolens.focalPx';
export const DEMO = new URLSearchParams(location.search).has('demo');
/** IrisState.error when camera access was refused; the camera step shows it in the session language. */
export const CAMERA_DENIED = 'Camera permission was denied. Allow camera access and reload.';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(s);
  });
}

export interface IrisState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  faceFound: boolean;
  distanceMm: number | null;
  irisPx: number | null;
  calibrated: boolean;
  stream: MediaStream | null;
}

/** Outcome of the tape-measure calibration. 'not-saved': applied for this session, but storage is blocked. */
export type CalibrateResult = 'saved' | 'not-saved' | 'no-face' | 'bad-distance';

/** Demo frames for the fit step come at about the real camera's rate (one Face Mesh run every 66 ms). */
const DEMO_FRAME_MS = 66;

/**
 * Measures face-to-screen distance from the camera, using the iris (~11.7 mm) as a ruler.
 * Landmarks 469/471 and 474/476 are the horizontal edges of the right and left iris
 * (Face Mesh with refineLandmarks).
 */
export function useIrisDistance(enabled: boolean) {
  // Read the saved focal length once; storage that is blocked or throws, or a value that is not a
  // positive number, counts as "not calibrated" (so `calibrated` always matches the focal length in use).
  const [savedFocal] = useState(() => parseSavedFocalPx(safeGet(getStore(), FOCAL_KEY)));
  const [state, setState] = useState<IrisState>(() => ({
    status: 'idle', error: null, faceFound: false, distanceMm: null, irisPx: null,
    calibrated: savedFocal !== null, stream: null,
  }));
  const focalRef = useRef<number | null>(savedFocal);
  const irisRef = useRef<number | null>(null);
  /** Which iris to measure. During a monocular test the other eye is covered, so use only the open one. */
  const eyeModeRef = useRef<'both' | 'right' | 'left'>('both');
  const lastGoodRef = useRef(0);
  /** Latest measured distance, for the per-frame samples (state updates are async). */
  const distanceRef = useRef<number | null>(null);
  /** Per-frame listeners (the fit step); frames are only converted to px while someone listens. */
  const listenersRef = useRef(new Set<(s: FaceSample) => void>());

  useEffect(() => {
    if (!enabled) return;
    if (DEMO) {
      setState((s) => ({ ...s, status: 'ready', faceFound: true, distanceMm: 500, irisPx: 14 }));
      return;
    }
    let stopped = false;
    let stream: MediaStream | null = null;
    let fm: FaceMeshInstance | null = null;
    const samples: number[] = [];
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;

    (async () => {
      setState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        video.srcObject = stream;
        await video.play();
        await loadScript(`${BASE}face_mesh.js`);
        if (!window.FaceMesh) throw new Error('Face Mesh failed to load');
        fm = new window.FaceMesh({ locateFile: (f) => `${BASE}${f}` });
        fm.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        fm.onResults((res) => {
          const lm = res.multiFaceLandmarks?.[0];
          const w = video.videoWidth, h = video.videoHeight;
          if (!lm || lm.length < 478) {
            // Ride through brief dropouts (blinks, a hand moving across the face) before declaring the face lost.
            if (performance.now() - lastGoodRef.current < 1500) return;
            samples.length = 0;
            irisRef.current = null;
            distanceRef.current = null;
            return setState((s) => ({ ...s, faceFound: false, distanceMm: null, irisPx: null }));
          }
          const d = (a: Landmark, b: Landmark) => Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
          const right = d(lm[469], lm[471]);
          const left = d(lm[474], lm[476]);
          const mode = eyeModeRef.current;
          // Both eyes open: they should look about the same size, otherwise the head is turned too far.
          if (mode !== 'both' || irisSymmetric(right, left)) {
            lastGoodRef.current = performance.now();
            samples.push(mode === 'right' ? right : mode === 'left' ? left : (right + left) / 2);
            if (samples.length > 9) samples.shift();
            const irisPx = median(samples);
            irisRef.current = irisPx;
            focalRef.current ??= focalPxFromDiagFov(w, h);
            const distanceMm = irisDistanceMm(irisPx, focalRef.current);
            distanceRef.current = distanceMm;
            setState((s) => ({ ...s, status: 'ready', faceFound: true, irisPx, distanceMm }));
          }
          // Every frame with a face goes to the listeners, which apply their own (stricter) checks.
          if (listenersRef.current.size > 0) {
            const sample: FaceSample = {
              landmarks: lm.map((p) => ({ x: p.x * w, y: p.y * h, z: p.z * w })),
              width: w, height: h, distanceMm: distanceRef.current, focalPx: focalRef.current,
            };
            listenersRef.current.forEach((cb) => cb(sample));
          }
        });
        await fm.initialize();
        setState((s) => ({ ...s, status: 'ready', stream }));
        let last = 0;
        const loop = async () => {
          if (stopped) return;
          const now = performance.now();
          if (video.readyState >= 2 && now - last > 66) {
            last = now;
            await fm!.send({ image: video });
          }
          if (!stopped) requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setState((s) => ({
          ...s, status: 'error',
          error: /Permission|NotAllowed/i.test(msg) ? CAMERA_DENIED : msg,
        }));
      }
    })();

    return () => {
      stopped = true;
      distanceRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
      fm?.close().catch(() => {});
      setState((s) => ({ ...s, status: 'idle', faceFound: false, distanceMm: null, irisPx: null, stream: null }));
    };
  }, [enabled]);

  /** Required once per phone (not in demo): hold the eyes at a distance measured with a tape, then calibrate. */
  const calibrateAt = useCallback((mm: number): CalibrateResult => {
    if (!Number.isFinite(mm) || mm <= 0) return 'bad-distance';
    if (!irisRef.current) return 'no-face';
    const f = focalPxFromKnownDistance(irisRef.current, mm);
    focalRef.current = f;
    distanceRef.current = mm;
    // If saving fails the calibration still applies for this session.
    const saved = safeSet(getStore(), FOCAL_KEY, String(f));
    setState((s) => ({ ...s, calibrated: true, distanceMm: mm }));
    return saved ? 'saved' : 'not-saved';
  }, []);

  const setEyeMode = useCallback((m: 'both' | 'right' | 'left') => {
    eyeModeRef.current = m;
  }, []);

  /**
   * Calls `cb` with every camera frame that shows a face: all landmarks in image px (z on the x scale), the image
   * size, and the current distance and focal length. Returns the unsubscribe function. Used by the fit step,
   * which needs the eye mode 'both'. In demo mode it sends a fixed, plausible face (lib/face demoFaceSample).
   */
  const subscribeFace = useCallback((cb: (s: FaceSample) => void) => {
    if (DEMO) {
      let i = 0;
      const id = window.setInterval(() => cb(demoFaceSample(i++)), DEMO_FRAME_MS);
      return () => window.clearInterval(id);
    }
    const listeners = listenersRef.current;
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  return { ...state, calibrateAt, setEyeMode, subscribeFace };
}
export type Iris = ReturnType<typeof useIrisDistance>;
