/*
 * The one-time tape-measure camera calibration, required before the eye tests (except in demo mode).
 * The default 75 degree FOV guess can be off by more than the +-10% distance gate, so test sizes
 * would be wrong without it. The result (focal length in px) is saved per phone under 'aerolens.focalPx'.
 */
import type { Lang, Text } from './i18n';

/** Accepted range for the measured distance (cm); face tracking and the tape step work in about this range. */
export const CALIBRATE_MIN_CM = 25;
export const CALIBRATE_MAX_CM = 100;

/** The saved focal length (px), or null if it is missing or not a usable positive number. */
export function parseSavedFocalPx(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const f = Number(raw);
  return Number.isFinite(f) && f > 0 ? f : null;
}

/**
 * The distance typed on the calibration step, in mm; null unless it is a plain number of cm within
 * [CALIBRATE_MIN_CM, CALIBRATE_MAX_CM]. Accepts a decimal comma ("50,5").
 */
export function parseCalibrationDistanceMm(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const cm = Number(t);
  return cm >= CALIBRATE_MIN_CM && cm <= CALIBRATE_MAX_CM ? cm * 10 : null;
}

export interface CameraGate {
  demo: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  faceFound: boolean;
  calibrated: boolean;
}

export const BLOCKER_TEXT = {
  error: {
    en: 'The camera is needed to measure your distance. Fix the camera problem above, then reload the page.',
    hi: 'आपकी दूरी नापने के लिए कैमरा ज़रूरी है। ऊपर लिखी कैमरे की परेशानी ठीक करें, फिर पेज दोबारा खोलें।',
  },
  starting: { en: 'Waiting for the camera to start.', hi: 'कैमरा शुरू होने का इंतज़ार है।' },
  calibrate: { en: 'Calibrate the camera first (once per phone, see the step above).', hi: 'पहले कैमरा सेट करें (हर फ़ोन पर एक बार, ऊपर वाला कदम देखें)।' },
  face: { en: 'Waiting for the camera to see your face.', hi: 'कैमरे को आपका चेहरा दिखने का इंतज़ार है।' },
} satisfies Record<string, Text>;

/** Why "Start the eye tests" is not available yet, in plain words; null when it is. */
export function startBlocker(g: CameraGate, lang: Lang = 'en'): string | null {
  if (g.status === 'error') return BLOCKER_TEXT.error[lang];
  if (g.status !== 'ready') return BLOCKER_TEXT.starting[lang];
  if (!g.demo && !g.calibrated) return BLOCKER_TEXT.calibrate[lang];
  if (!g.faceFound) return BLOCKER_TEXT.face[lang];
  return null;
}
