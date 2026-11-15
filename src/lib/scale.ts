/**
 * Reusing a saved screen scale (CSS px per mm from the ID-card step) on later tests.
 *
 * CSS px per mm is fixed for one screen at one zoom level, so a saved value is only reused when the
 * screen looks the same: same CSS screen size (either orientation) and same devicePixelRatio.
 * Page zoom and Android "display size" change the dpr; a different monitor changes the screen size.
 */

/** Largest devicePixelRatio difference still treated as the same zoom (also used by the in-test zoom guard). */
export const DPR_TOLERANCE = 0.01;

/**
 * Plausible CSS px per mm. A CSS px is nominally 3.78 px/mm; phones are about 5–7, laptops and
 * monitors about 3–5, and the card step itself can produce about 1.9–8.9 (a 100–480 px box over 53.98 mm).
 * Anything outside [2, 12] is treated as corrupt, so the card step is shown again.
 */
export const PX_PER_MM_MIN = 2;
export const PX_PER_MM_MAX = 12;

export interface ScreenSignature {
  /** Screen size in CSS px, rounded and sorted [short, long], so portrait and landscape match. */
  dims: [number, number];
  dpr: number;
}

export interface SavedScale {
  v: 1;
  pxPerMm: number;
  signature: ScreenSignature;
  /** ISO time of the card step that produced this value. */
  savedAt: string;
}

export function sameDpr(a: number, b: number): boolean {
  return Math.abs(a - b) <= DPR_TOLERANCE;
}

export function screenSignature(screenW: number, screenH: number, dpr: number): ScreenSignature {
  const a = Math.round(screenW), b = Math.round(screenH);
  return { dims: a <= b ? [a, b] : [b, a], dpr };
}

export function makeSavedScale(pxPerMm: number, signature: ScreenSignature, savedAt: string): SavedScale {
  return { v: 1, pxPerMm, signature, savedAt };
}

const isPositiveInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0;
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Strict: anything but a well-formed v1 record with a plausible pxPerMm returns null. */
export function parseSavedScale(raw: string | null): SavedScale | null {
  if (raw === null) return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(o) || o.v !== 1) return null;
  const { pxPerMm, signature: sig, savedAt } = o;
  if (typeof pxPerMm !== 'number' || !Number.isFinite(pxPerMm) || pxPerMm < PX_PER_MM_MIN || pxPerMm > PX_PER_MM_MAX) return null;
  if (!isObject(sig) || !Array.isArray(sig.dims) || sig.dims.length !== 2) return null;
  const [w, h] = sig.dims as unknown[];
  if (!isPositiveInt(w) || !isPositiveInt(h) || w > h) return null;
  if (typeof sig.dpr !== 'number' || !Number.isFinite(sig.dpr) || sig.dpr <= 0) return null;
  if (typeof savedAt !== 'string' || Number.isNaN(Date.parse(savedAt))) return null;
  return makeSavedScale(pxPerMm, { dims: [w, h], dpr: sig.dpr }, savedAt);
}

/** Exact match on the sorted screen size, dpr within DPR_TOLERANCE. */
export function matchesScreen(saved: SavedScale, current: ScreenSignature): boolean {
  const [a, b] = saved.signature.dims;
  return a === current.dims[0] && b === current.dims[1] && sameDpr(saved.signature.dpr, current.dpr);
}
