/** One arc-minute in radians. */
export const ARCMIN = Math.PI / (180 * 60);

/** Average horizontal visible iris diameter of an adult eye (mm). Used as a built-in ruler. */
export const IRIS_MM = 11.7;

/** ISO/IEC 7810 ID-1 card (Aadhaar PVC, PAN, driving licence, debit card): short edge in mm. */
export const CARD_SHORT_MM = 53.98;

/** Default diagonal field of view of a front camera, before the optional tape-measure calibration. */
export const DEFAULT_DIAG_FOV_DEG = 75;

/** Largest width (CSS px) the card-scale box may take: full viewport minus a small gutter, clamped to [160, 480]. */
export function scaleBoxMaxPx(viewportPx: number, gutterPx = 8): number {
  return Math.min(480, Math.max(160, viewportPx - 2 * gutterPx));
}

/**
 * Height of an optotype (mm) that subtends 5 arc-minutes x 10^logMAR at the given distance.
 * logMAR 0.0 (6/6) is 5 arc-minutes tall.
 */
export function optotypeHeightMm(logMAR: number, distanceMm: number): number {
  const angle = 5 * Math.pow(10, logMAR) * ARCMIN;
  return 2 * distanceMm * Math.tan(angle / 2);
}

/** Stroke width of a Tumbling E (height / 5) in physical device pixels. */
export function strokePhysicalPx(logMAR: number, distanceMm: number, pxPerMm: number, dpr: number): number {
  return (optotypeHeightMm(logMAR, distanceMm) / 5) * pxPerMm * dpr;
}

/** Pinhole model: distance = focal_px * real_size / size_in_pixels. */
export function irisDistanceMm(irisPx: number, focalPx: number, irisMm = IRIS_MM): number {
  return (focalPx * irisMm) / irisPx;
}

/** Focal length in pixels from the diagonal field of view of the image. */
export function focalPxFromDiagFov(widthPx: number, heightPx: number, diagFovDeg = DEFAULT_DIAG_FOV_DEG): number {
  const diag = Math.hypot(widthPx, heightPx);
  return diag / 2 / Math.tan((diagFovDeg * Math.PI) / 180 / 2);
}

/** Focal length in pixels from one measurement taken at a known distance (tape measure). */
export function focalPxFromKnownDistance(irisPx: number, knownDistanceMm: number, irisMm = IRIS_MM): number {
  return (irisPx * knownDistanceMm) / irisMm;
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function inRange(distanceMm: number | null, targetMm: number, tolerance = 0.1): boolean {
  return distanceMm !== null && Math.abs(distanceMm - targetMm) <= targetMm * tolerance;
}
