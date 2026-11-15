/*
 * Phase 2: selfie PD, face shape and frame fit, from MediaPipe Face Mesh landmarks (refineLandmarks, 478 points).
 * Pure functions: the camera hook supplies FaceSample frames and the Fit step collects them.
 *
 * Scale. On the iris plane, at distance D (mm) from a camera with focal length f (px), one image px is D / f mm
 * (the pinhole model in optics.ts). The hook measures D from the iris width (D = f * IRIS_MM / irisPx), so there
 * D / f = IRIS_MM / irisPx: the PD does not depend on the camera calibration, only on this person's iris being
 * about the average 11.7 mm. Iris size varies about ±4% between adults (about ±2.5 mm on a 63 mm PD), which is
 * the main limit of this method, so the optician should confirm the PD before lenses are made.
 *
 * Depth. Points behind the iris plane (the sides of the face) look smaller. Face Mesh gives each landmark a z on
 * the same scale as x (image px; smaller = nearer the camera), so a landmark's distance is taken as
 * Z = D * (1 + (z - zIris) / f), with Z / D clamped to DEPTH_FACTOR_RANGE. Landmarks are back-projected with the
 * image centre as the principal point, X = (x - cx) * Z / f and Y = (y - cy) * Z / f, and every size here is
 * measured in that frontal (X, Y) plane, in mm.
 *
 * All thresholds below are PROVISIONAL first guesses from published adult averages, to be tuned on the Phase 4
 * volunteers. The output is advice for choosing frames; it is never a prescription.
 *
 * Words. The stored FitRecord (session, report, history) always holds the English sentences. The patient screens
 * show them in the session language with fitText (recomputed from the stored numbers, so it matches the English
 * exactly), frameIssueText and fitProblemText.
 */
import { fmt, type Lang, type Text } from './i18n';
import { inRange, median } from './optics';

/** A Face Mesh landmark in image px: x right, y down; z is depth on the x scale (smaller = nearer the camera). */
export interface PointPx { x: number; y: number; z: number }

/** One camera frame for the fit step. */
export interface FaceSample {
  /** All 478 landmarks, in image px (see PointPx). */
  landmarks: PointPx[];
  /** Image size in px; the principal point is taken as the image centre. */
  width: number;
  height: number;
  /** Iris-measured face distance (mm) at this frame; null until measured. */
  distanceMm: number | null;
  /** Focal length (px) in use; null until known. */
  focalPx: number | null;
}

/** Face Mesh landmark indices used here. "Right" and "left" are the person's own right and left eye. */
export const LM = {
  rightIris: 468,
  leftIris: 473,
  rightIrisEdges: [469, 471],
  leftIrisEdges: [474, 476],
  /** Nose bridge, between the eyes. */
  noseBridge: 168,
  /** Upper and lower eyelid, centre of each eye. */
  rightLids: [159, 145],
  leftLids: [386, 374],
  /** Eye corners (outer, inner / inner, outer). */
  rightCorners: [33, 133],
  leftCorners: [362, 263],
  cheeks: [234, 454],
  jaw: [172, 397],
  forehead: [54, 284],
  /** Top of the mesh on the forehead (below the hairline) and the chin. */
  top: 10,
  chin: 152,
} as const;
const LANDMARK_COUNT = 478;

type Pair = readonly [number, number];
const imgDist = (a: PointPx, b: PointPx) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;

/* ---------- Frame checks (per camera frame) ---------- */

/** Largest relative difference between the two iris widths with both eyes open; beyond it the head is turned too far. */
export const IRIS_SYMMETRY_TOL = 0.25;

/** Both irises look about the same size (shared with the distance measurement in useIrisDistance). */
export function irisSymmetric(rightPx: number, leftPx: number, tol = IRIS_SYMMETRY_TOL): boolean {
  return Math.abs(rightPx - leftPx) / ((rightPx + leftPx) / 2) <= tol;
}

/** PROVISIONAL: eyelid gap / eye width below this counts as closed (open is about 0.25–0.35, a blink under 0.1). */
export const EYE_OPEN_MIN = 0.15;
/** PROVISIONAL: largest tilt of the eye line from horizontal (degrees) for a "head level" frame. */
export const MAX_ROLL_DEG = 8;
/**
 * PROVISIONAL: largest |right − left| / PD, with the monocular PDs measured in the image to the nose bridge.
 * Above it the head is turned (or the bridge was missed). Real faces differ by about 3% (e.g. 33 / 31 mm).
 */
export const MAX_BRIDGE_OFFSET = 0.1;

export type FrameIssue = 'no-face' | 'no-distance' | 'distance' | 'head-turned' | 'head-tilted' | 'eyes-closed';

/** Live guidance for a rejected frame, per issue. {cm} is the target distance. */
export const FRAME_ISSUE_TEXT: Record<FrameIssue, Text> = {
  'no-face': { en: 'Look at the screen so the camera can see your face.', hi: 'स्क्रीन की ओर देखें, ताकि कैमरा आपका चेहरा देख सके।' },
  'no-distance': { en: 'Hold still while the distance is measured.', hi: 'दूरी नापी जा रही है, हिलें नहीं।' },
  distance: { en: 'Hold the screen about {cm} cm from your face.', hi: 'स्क्रीन को चेहरे से लगभग {cm} cm दूर रखें।' },
  'head-turned': { en: 'Face the screen straight on.', hi: 'स्क्रीन के ठीक सामने सीधे देखें।' },
  'head-tilted': { en: 'Keep your head level, not tilted to one side.', hi: 'सिर सीधा रखें, किसी एक तरफ़ न झुकाएँ।' },
  'eyes-closed': { en: 'Keep both eyes open.', hi: 'दोनों आँखें खुली रखें।' },
};

/** Live guidance for a rejected frame. */
export function frameIssueText(issue: FrameIssue, targetMm: number, lang: Lang = 'en'): string {
  return fmt(FRAME_ISSUE_TEXT[issue][lang], { cm: Math.round(targetMm / 10) });
}

/** Eyelid gap over eye width for one eye, from the image. */
export function eyeOpenness(lm: PointPx[], eye: 'right' | 'left'): number {
  const [up, down] = eye === 'right' ? LM.rightLids : LM.leftLids;
  const [a, b] = eye === 'right' ? LM.rightCorners : LM.leftCorners;
  const width = imgDist(lm[a], lm[b]);
  return width > 0 ? imgDist(lm[up], lm[down]) / width : 0;
}

/** Tilt of the line through the iris centres from horizontal, in degrees (0–90), whether or not the image is mirrored. */
export function rollDeg(lm: PointPx[]): number {
  const r = lm[LM.rightIris], l = lm[LM.leftIris];
  const a = Math.abs((Math.atan2(l.y - r.y, l.x - r.x) * 180) / Math.PI);
  return Math.min(a, 180 - a);
}

/** Where the nose bridge sits along the eye line, from the right iris (0) to the left iris (1), in the image. */
function bridgeShare(lm: PointPx[]): number {
  const r = lm[LM.rightIris], l = lm[LM.leftIris], b = lm[LM.noseBridge];
  const dx = l.x - r.x, dy = l.y - r.y;
  const len2 = dx * dx + dy * dy;
  return len2 > 0 ? ((b.x - r.x) * dx + (b.y - r.y) * dy) / len2 : NaN;
}

/**
 * Why this frame should not be used for the fit capture; null when it is usable: a face at the target
 * distance (±10%), facing the screen (same iris check as the distance measurement, plus the nose bridge
 * centred between the eyes), head level, both eyes open.
 */
export function checkFrame(s: FaceSample, targetMm: number): FrameIssue | null {
  const lm = s.landmarks;
  if (lm.length < LANDMARK_COUNT) return 'no-face';
  if (s.distanceMm === null || s.focalPx === null || !(s.distanceMm > 0) || !(s.focalPx > 0)) return 'no-distance';
  if (!inRange(s.distanceMm, targetMm)) return 'distance';
  const right = imgDist(lm[LM.rightIrisEdges[0]], lm[LM.rightIrisEdges[1]]);
  const left = imgDist(lm[LM.leftIrisEdges[0]], lm[LM.leftIrisEdges[1]]);
  if (!irisSymmetric(right, left)) return 'head-turned';
  const t = bridgeShare(lm);
  if (!(Math.abs(2 * t - 1) <= MAX_BRIDGE_OFFSET)) return 'head-turned';
  if (rollDeg(lm) > MAX_ROLL_DEG) return 'head-tilted';
  if (eyeOpenness(lm, 'right') < EYE_OPEN_MIN || eyeOpenness(lm, 'left') < EYE_OPEN_MIN) return 'eyes-closed';
  return null;
}

/* ---------- Measurement (median over the captured frames) ---------- */

/** Clamp of a landmark's distance relative to the iris plane (Z / D), against implausible mesh depths. */
export const DEPTH_FACTOR_RANGE = [0.85, 1.25] as const;

/** Per-frame sizes in mm, on the frontal plane. */
export interface FrameMm {
  distanceMm: number;
  pdMm: number;
  /** Right iris to the nose bridge along the eye line, as a share of the PD (0..1 when the bridge is between the eyes). */
  rightShare: number;
  cheekWidthMm: number;
  jawWidthMm: number;
  foreheadWidthMm: number;
  faceLengthMm: number;
}

/** One frame's sizes (see the scale and depth notes at the top); null without a face, distance or focal length. */
export function frameMm(s: FaceSample): FrameMm | null {
  const { landmarks: lm, distanceMm: D, focalPx: f } = s;
  if (lm.length < LANDMARK_COUNT || D === null || f === null || !(D > 0) || !(f > 0)) return null;
  const zIris = (lm[LM.rightIris].z + lm[LM.leftIris].z) / 2;
  const cx = s.width / 2, cy = s.height / 2;
  const at = (i: number) => {
    const p = lm[i];
    const Z = D * clamp(1 + (p.z - zIris) / f, DEPTH_FACTOR_RANGE[0], DEPTH_FACTOR_RANGE[1]);
    return { x: ((p.x - cx) * Z) / f, y: ((p.y - cy) * Z) / f };
  };
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const width = ([a, b]: Pair) => dist(at(a), at(b));
  const r = at(LM.rightIris), l = at(LM.leftIris), b = at(LM.noseBridge);
  const pd = dist(r, l);
  // Monocular PD: the nose bridge projected onto the eye line, so right + left = PD exactly.
  const rightShare = pd > 0 ? ((b.x - r.x) * (l.x - r.x) + (b.y - r.y) * (l.y - r.y)) / (pd * pd) : NaN;
  return {
    distanceMm: D,
    pdMm: pd,
    rightShare,
    cheekWidthMm: width(LM.cheeks),
    jawWidthMm: width(LM.jaw),
    foreheadWidthMm: width(LM.forehead),
    faceLengthMm: dist(at(LM.top), at(LM.chin)),
  };
}

/**
 * Distance from the entrance pupil (seen as the iris centre) to the eye's centre of rotation, in mm: the centre
 * of rotation is about 13.5 mm behind the cornea and the entrance pupil about 3 mm behind it.
 */
export const PUPIL_TO_ROTATION_MM = 10.5;

/**
 * Distance PD (eyes looking far away) from a PD measured while fixating a point `viewingMm` in front of the pupils.
 * The eyes rotate about centres a distance-PD apart; looking at a near point each pupil swings nasally, so
 * near = distance × viewing / (viewing + r), hence distance = near × (viewing + r) / viewing.
 * About +2% (+1.3 mm) at 50 cm. Assumes the person looks at the screen, centred in front of the face.
 */
export function distancePdFromNear(nearMm: number, viewingMm: number, rotationMm = PUPIL_TO_ROTATION_MM): number {
  return (nearMm * (viewingMm + rotationMm)) / viewingMm;
}

/** Frames the fit step collects. */
export const FIT_FRAMES = 30;
/** measureFit refuses fewer usable frames than this. */
export const MIN_FIT_FRAMES = 15;
/** PROVISIONAL adult range for the distance PD (mm); a result outside it is rejected, not shown. */
export const PD_RANGE_MM = [50, 80] as const;
/** PROVISIONAL range for each monocular distance PD (mm). */
export const MONO_RANGE_MM = [20, 45] as const;
/** PROVISIONAL: largest interquartile range of the per-frame PD (mm) for a steady capture. */
export const PD_MAX_SPREAD_MM = 3;
/** PROVISIONAL: a right/left difference above this (mm) gets a note. */
export const MONO_DIFF_NOTE_MM = 3;
/** PROVISIONAL plausible adult ranges for the face outline (mm), against a missed outline (hair, hands). */
export const FACE_WIDTH_RANGE_MM = [100, 180] as const;
export const FACE_LENGTH_RANGE_MM = [120, 240] as const;

export interface MonoPd { totalMm: number; rightMm: number; leftMm: number }

export interface PdResult {
  /** Median face-to-camera distance (mm) during the capture: `measured` was taken with the eyes converged at it. */
  viewingDistanceMm: number;
  /** Measured between the iris centres at the viewing distance: a near PD for that distance. */
  measured: MonoPd;
  /** Estimated distance PD (eyes looking far away): measured × (viewing + rotationMm) / viewing. */
  distanceEstimate: MonoPd;
  /** Pupil to centre-of-rotation distance used for the estimate (PUPIL_TO_ROTATION_MM). */
  rotationMm: number;
  /** Interquartile range of the per-frame measured PD (mm): how steady the capture was. */
  spreadMm: number;
}

export interface FaceMeasurements {
  /** Landmarks 234–454, the widest part of the face at the cheekbones. */
  cheekWidthMm: number;
  /** Landmarks 172–397, at the angle of the jaw. */
  jawWidthMm: number;
  /** Landmarks 54–284, the upper forehead. */
  foreheadWidthMm: number;
  /** Landmarks 10–152, top of the mesh on the forehead (below the hairline) to the chin. */
  faceLengthMm: number;
}

export interface FitCapture {
  status: 'captured';
  /** Usable frames the medians came from. */
  frames: number;
  pd: PdResult;
  face: FaceMeasurements;
  shape: ShapeResult;
  frame: FrameFit;
  /** Data-driven notes for the person and the optician (may be empty). */
  notes: string[];
}

export interface FitSkipped {
  status: 'skipped';
  /** The message of the last failed capture before skipping, or null if none failed. */
  failure: string | null;
}

/** The fit step's outcome, stored in the session and exported. */
export type FitRecord = FitCapture | FitSkipped;

/** Why a capture was not used (measureFit), or did not finish in time (the fit step's timeout), with its numbers. */
export type FitProblem =
  | { kind: 'few-frames'; frames: number }
  | { kind: 'unsteady'; spreadMm: number }
  | { kind: 'pd-range'; pdMm: number }
  | { kind: 'bridge'; rightMm: number; leftMm: number }
  | { kind: 'outline'; widthMm: number; lengthMm: number }
  | { kind: 'timeout'; seconds: number; issue: FrameIssue | null; targetMm: number };

/** Retake messages; the timeout message is followed by the most common frame issue, when there was one. */
export const FIT_PROBLEM_TEXT: Record<FitProblem['kind'], Text> = {
  'few-frames': {
    en: 'Only {n} usable camera frames (at least {min} are needed). Hold still and retake.',
    hi: 'कैमरे से सिर्फ़ {n} काम की तस्वीरें मिलीं (कम से कम {min} चाहिए)। हिलें नहीं और फिर से नापें।',
  },
  unsteady: {
    en: 'The readings varied too much (by {spread} mm). Hold the phone and your head still, and retake.',
    hi: 'नाप बहुत ऊपर-नीचे हुआ ({spread} mm तक)। फ़ोन और सिर स्थिर रखें, और फिर से नापें।',
  },
  'pd-range': {
    en: 'The PD came out as {pd} mm, outside the usual adult range ({lo}–{hi} mm), so it was not used. Check the distance reading, take glasses off, and retake.',
    hi: 'PD {pd} mm आया, जो बड़ों की आम सीमा ({lo}–{hi} mm) से बाहर है, इसलिए इसे नहीं लिया गया। दूरी की रीडिंग देखें, चश्मा उतारें और फिर से नापें।',
  },
  bridge: {
    en: 'The nose bridge was not found clearly (right {right} mm, left {left} mm). Face the screen straight on and retake.',
    hi: 'नाक का ऊपरी हिस्सा (ब्रिज) साफ़ नहीं दिखा (दायाँ {right} mm, बायाँ {left} mm)। स्क्रीन के ठीक सामने देखें और फिर से नापें।',
  },
  outline: {
    en: 'The outline of the face was not found clearly (width {width} mm, length {length} mm). Keep hair and hands away from the face, and retake.',
    hi: 'चेहरे की बाहरी रेखा साफ़ नहीं दिखी (चौड़ाई {width} mm, लंबाई {length} mm)। बाल और हाथ चेहरे से दूर रखें, और फिर से नापें।',
  },
  timeout: { en: 'Could not get a steady view in {s} seconds.', hi: '{s} सेकंड में चेहरे की साफ़, स्थिर तस्वीर नहीं मिल पाई।' },
};

/** The retake message for a problem. The fit step stores the English one (FitSkipped.failure) and shows `lang`. */
export function fitProblemText(p: FitProblem, lang: Lang = 'en'): string {
  const t = FIT_PROBLEM_TEXT[p.kind][lang];
  switch (p.kind) {
    case 'few-frames': return fmt(t, { n: p.frames, min: MIN_FIT_FRAMES });
    case 'unsteady': return fmt(t, { spread: p.spreadMm.toFixed(1) });
    case 'pd-range': return fmt(t, { pd: p.pdMm, lo: PD_RANGE_MM[0], hi: PD_RANGE_MM[1] });
    case 'bridge': return fmt(t, { right: p.rightMm, left: p.leftMm });
    case 'outline': return fmt(t, { width: p.widthMm, length: p.lengthMm });
    case 'timeout': {
      const head = fmt(t, { s: p.seconds });
      return p.issue ? `${head} ${frameIssueText(p.issue, p.targetMm, lang)}` : head;
    }
  }
}

/** A failed outcome carries the English message (as before) and the problem, to show it in another language. */
export type FitOutcome = { ok: true; fit: FitCapture } | { ok: false; message: string; problem: FitProblem };

const failed = (problem: FitProblem): FitOutcome => ({ ok: false, message: fitProblemText(problem), problem });

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const mono = (total: number, rightShare: number): MonoPd => {
  const right = round1(total * rightShare);
  const t = round1(total);
  return { totalMm: t, rightMm: right, leftMm: round1(t - right) };
};

export const MONO_DIFF_TEXT: Text = {
  en: 'Right and left PD differ by {diff} mm. This can be real, or the head was slightly turned: confirm before ordering lenses.',
  hi: 'दाईं और बाईं PD में {diff} mm का फ़र्क है। ऐसा सच में हो सकता है, या सिर थोड़ा मुड़ा था: लेंस ऑर्डर करने से पहले दोबारा जाँच लें।',
};

/** A capture's notes, from its distance PDs (FitCapture.notes holds the English ones). */
export function fitNotes(distanceEstimate: MonoPd, lang: Lang = 'en'): string[] {
  const diff = Math.abs(distanceEstimate.rightMm - distanceEstimate.leftMm);
  return diff > MONO_DIFF_NOTE_MM ? [fmt(MONO_DIFF_TEXT[lang], { diff: diff.toFixed(1) })] : [];
}

/**
 * PD, face measurements, face shape and frame fit from the captured frames (medians over frames), or a
 * plain-words reason to retake when the result is implausible.
 */
export function measureFit(frames: FaceSample[]): FitOutcome {
  const per = frames.map(frameMm).filter((m): m is FrameMm => m !== null);
  if (per.length < MIN_FIT_FRAMES) return failed({ kind: 'few-frames', frames: per.length });
  const med = (k: keyof FrameMm) => median(per.map((m) => m[k]));
  const pds = per.map((m) => m.pdMm).sort((a, b) => a - b);
  const spread = quantile(pds, 0.75) - quantile(pds, 0.25);
  const viewing = med('distanceMm');
  const near = med('pdMm');
  const share = med('rightShare');
  const far = distancePdFromNear(near, viewing);
  const measured = mono(near, share);
  const distanceEstimate = mono(far, share);

  if (spread > PD_MAX_SPREAD_MM) return failed({ kind: 'unsteady', spreadMm: spread });
  if (!(far >= PD_RANGE_MM[0] && far <= PD_RANGE_MM[1])) return failed({ kind: 'pd-range', pdMm: round1(far) });
  const monoOk = (x: number) => x >= MONO_RANGE_MM[0] && x <= MONO_RANGE_MM[1];
  if (!monoOk(distanceEstimate.rightMm) || !monoOk(distanceEstimate.leftMm)) {
    return failed({ kind: 'bridge', rightMm: distanceEstimate.rightMm, leftMm: distanceEstimate.leftMm });
  }
  const face: FaceMeasurements = {
    cheekWidthMm: round1(med('cheekWidthMm')),
    jawWidthMm: round1(med('jawWidthMm')),
    foreheadWidthMm: round1(med('foreheadWidthMm')),
    faceLengthMm: round1(med('faceLengthMm')),
  };
  const widthOk = face.cheekWidthMm >= FACE_WIDTH_RANGE_MM[0] && face.cheekWidthMm <= FACE_WIDTH_RANGE_MM[1];
  const lengthOk = face.faceLengthMm >= FACE_LENGTH_RANGE_MM[0] && face.faceLengthMm <= FACE_LENGTH_RANGE_MM[1];
  if (!widthOk || !lengthOk) return failed({ kind: 'outline', widthMm: face.cheekWidthMm, lengthMm: face.faceLengthMm });

  const notes = fitNotes(distanceEstimate);
  const shape = classifyFaceShape(face);
  return {
    ok: true,
    fit: {
      status: 'captured',
      frames: per.length,
      pd: { viewingDistanceMm: Math.round(viewing), measured, distanceEstimate, rotationMm: PUPIL_TO_ROTATION_MM, spreadMm: round1(spread) },
      face,
      shape,
      frame: frameFit(face, shape.shape, distanceEstimate.totalMm),
      notes,
    },
  };
}

/* ---------- Face shape (rule-based, explainable) ---------- */

export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'oblong';
export const FACE_SHAPE_TEXT: Record<FaceShape, Text> = {
  oval: { en: 'Oval', hi: 'अंडाकार' },
  round: { en: 'Round', hi: 'गोल' },
  square: { en: 'Square', hi: 'चौकोर' },
  heart: { en: 'Heart', hi: 'दिल के आकार का' },
  oblong: { en: 'Oblong (long)', hi: 'लंबा' },
};
/** English face-shape names (staff screen, stored text). */
export const FACE_SHAPE_LABEL: Record<FaceShape, string> = {
  oval: FACE_SHAPE_TEXT.oval.en, round: FACE_SHAPE_TEXT.round.en, square: FACE_SHAPE_TEXT.square.en,
  heart: FACE_SHAPE_TEXT.heart.en, oblong: FACE_SHAPE_TEXT.oblong.en,
};

/**
 * PROVISIONAL face-shape thresholds, on Face Mesh proportions. Not yet checked against an optician's judgement.
 * The face length (10–152) stops at the top of the mesh, below the hairline, so these ratios are lower than
 * hairline-to-chin rules of thumb.
 */
export const SHAPE_THRESHOLDS = {
  /** Face length / cheekbone width at or above this: oblong. */
  longMin: 1.4,
  /** Face length / cheekbone width at or below this: short (round, unless the jaw is broad). */
  shortMax: 1.15,
  /** Jaw width / cheekbone width at or above this: broad jaw (square). */
  squareJawMin: 0.85,
  /** (Forehead − jaw) / cheekbone width at or above this: tapering to the chin (heart). */
  heartTaperMin: 0.1,
  /** A ratio this close to a threshold makes the neighbouring shape "close". */
  borderline: 0.03,
} as const;

export interface FaceRatios {
  /** Face length / cheekbone width. */
  lengthToWidth: number;
  /** Jaw width / cheekbone width. */
  jawToCheek: number;
  /** Forehead width / cheekbone width. */
  foreheadToCheek: number;
}

export interface ShapeResult {
  shape: FaceShape;
  /** Ratios the decision used (rounded to 0.01; the decision uses these rounded values). */
  ratios: FaceRatios;
  /** Plain-words reasons, with the numbers and thresholds used. */
  reasons: string[];
  /** Shapes reached if any ratio moved by the borderline margin: "close to". */
  nearby: FaceShape[];
}

export function faceRatios(m: FaceMeasurements): FaceRatios {
  return {
    lengthToWidth: round2(m.faceLengthMm / m.cheekWidthMm),
    jawToCheek: round2(m.jawWidthMm / m.cheekWidthMm),
    foreheadToCheek: round2(m.foreheadWidthMm / m.cheekWidthMm),
  };
}

/** The rules, in order: the first that matches decides. */
function decideShape(r: FaceRatios): FaceShape {
  const t = SHAPE_THRESHOLDS;
  if (r.lengthToWidth >= t.longMin) return 'oblong';
  if (r.foreheadToCheek - r.jawToCheek >= t.heartTaperMin - 1e-9) return 'heart';
  if (r.jawToCheek >= t.squareJawMin) return 'square';
  if (r.lengthToWidth <= t.shortMax) return 'round';
  return 'oval';
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const times = (x: number) => `${x.toFixed(2)}×`;

/**
 * The two reasons for each shape. Placeholders: {L} length / cheekbone width ("1.25×"), {J} jaw and {F} forehead
 * as a share of the cheekbone width ("78%"); {long}, {short}, {square} and {taper} are the SHAPE_THRESHOLDS used.
 */
export const SHAPE_REASON_TEXT: Record<FaceShape, [Text, Text]> = {
  oblong: [
    {
      en: 'The face is long for its width: length {L} the cheekbone width (long from {long}×).',
      hi: 'चौड़ाई के हिसाब से चेहरा लंबा है: लंबाई, गालों की चौड़ाई की {L} है ({long}× से लंबा माना जाता है)।',
    },
    { en: 'Jaw {J} and forehead {F} of the cheekbone width.', hi: 'गालों की चौड़ाई के मुकाबले जबड़ा {J} और माथा {F} है।' },
  ],
  heart: [
    {
      en: 'The forehead is wider than the jaw: forehead {F}, jaw {J} of the cheekbone width (a gap of {taper} or more).',
      hi: 'माथा जबड़े से चौड़ा है: गालों की चौड़ाई के मुकाबले माथा {F} और जबड़ा {J} है ({taper} या ज़्यादा का फ़र्क)।',
    },
    { en: 'Face length {L} the cheekbone width.', hi: 'चेहरे की लंबाई, गालों की चौड़ाई की {L} है।' },
  ],
  square: [
    {
      en: 'The jaw is nearly as wide as the cheekbones: {J} of the cheekbone width (broad from {square}).',
      hi: 'जबड़ा लगभग गालों जितना चौड़ा है: गालों की चौड़ाई का {J} ({square} से चौड़ा माना जाता है)।',
    },
    {
      en: 'Face length {L} the cheekbone width (not long: under {long}×).',
      hi: 'चेहरे की लंबाई, गालों की चौड़ाई की {L} है (लंबा नहीं: {long}× से कम)।',
    },
  ],
  round: [
    {
      en: 'The face is short for its width: length {L} the cheekbone width (short up to {short}×).',
      hi: 'चौड़ाई के हिसाब से चेहरा छोटा है: लंबाई, गालों की चौड़ाई की {L} है ({short}× तक छोटा माना जाता है)।',
    },
    {
      en: 'The jaw is narrower than the cheekbones ({J}), so the outline is rounded rather than square.',
      hi: 'जबड़ा गालों से पतला है ({J}), इसलिए चेहरा चौकोर नहीं, गोल लगता है।',
    },
  ],
  oval: [
    {
      en: 'Balanced length: {L} the cheekbone width (between {short}× and {long}×).',
      hi: 'लंबाई संतुलित है: गालों की चौड़ाई की {L} है ({short}× और {long}× के बीच)।',
    },
    {
      en: 'Jaw {J} and forehead {F} of the cheekbone width: narrower than the cheekbones, with no strong taper.',
      hi: 'गालों की चौड़ाई के मुकाबले जबड़ा {J} और माथा {F} है: दोनों गालों से पतले, और चेहरा नीचे की ओर बहुत पतला नहीं होता।',
    },
  ],
};

/** The plain-words reasons for a shape, with the ratios and thresholds used (ShapeResult.reasons holds the English). */
export function shapeReasons(shape: FaceShape, r: FaceRatios, lang: Lang = 'en'): string[] {
  const t = SHAPE_THRESHOLDS;
  const vars = {
    L: times(r.lengthToWidth), J: pct(r.jawToCheek), F: pct(r.foreheadToCheek),
    long: t.longMin.toFixed(2), short: t.shortMax.toFixed(2), square: pct(t.squareJawMin), taper: pct(t.heartTaperMin),
  };
  return SHAPE_REASON_TEXT[shape].map((x) => fmt(x[lang], vars));
}

/** Rule-based face shape from the face measurements, with the reasons used and any close neighbouring shapes. */
export function classifyFaceShape(m: FaceMeasurements): ShapeResult {
  const ratios = faceRatios(m);
  const shape = decideShape(ratios);
  const d = SHAPE_THRESHOLDS.borderline;
  const nearby = new Set<FaceShape>();
  for (const k of Object.keys(ratios) as (keyof FaceRatios)[]) {
    for (const step of [-d, d]) {
      const alt = decideShape({ ...ratios, [k]: round2(ratios[k] + step) });
      if (alt !== shape) nearby.add(alt);
    }
  }
  return { shape, ratios, reasons: shapeReasons(shape, ratios), nearby: [...nearby] };
}

/* ---------- Frame fit (advice) ---------- */

/** PROVISIONAL frame-fit rules of thumb (mm). */
export const FRAME_FIT = {
  /** Frame front width: from this much under the cheekbone width ... */
  belowFaceMm: 6,
  /** ... to this much over it. */
  aboveFaceMm: 2,
  /** Typical bridge (DBL) range; the nose itself is not measured. */
  bridgeMm: [16, 20] as const,
  /** Rims and hinges add about this much to 2 × lens width + bridge. */
  endpiecesMm: 12,
  /** The lens width suggestion is the computed width ± this. */
  lensSpreadMm: 2,
  /** Lens width + bridge (the frame PD) up to this much over the distance PD keeps the lens centres near the pupils. */
  framePdOverMm: 8,
  /** Size bands of the front width: narrow below 130 mm, wide from 140 mm. */
  narrowBelowMm: 130,
  wideFromMm: 140,
} as const;

export type FrameSize = 'narrow' | 'medium' | 'wide';
export interface StyleTip { style: string; reason: string }

export interface FrameFit {
  /** Suggested frame front width, [min, max] mm. */
  totalWidthMm: [number, number];
  size: FrameSize;
  lensWidthMm: [number, number];
  bridgeMm: [number, number];
  /** Lens width + bridge that keeps the lens centres near the pupils, [min, max] mm. */
  framePdMm: [number, number];
  /** One line per number above, explaining it. */
  hints: string[];
  /** Styles to try for this face shape, each with a one-line reason. */
  suggest: StyleTip[];
  /** Styles that are usually less flattering, each with a one-line reason. */
  avoid: StyleTip[];
}

/** Frame size words: "(medium)" on the fit summary, "Medium frame, ..." in the lens suggestions. */
export const FRAME_SIZE_TEXT: Record<FrameSize, Text> = {
  narrow: { en: 'narrow', hi: 'कम चौड़ा' },
  medium: { en: 'medium', hi: 'मध्यम' },
  wide: { en: 'wide', hi: 'ज़्यादा चौड़ा' },
};

interface StyleTipText { style: Text; reason: Text }

/** Style advice per face shape (common optical-retail guidance: contrast the face's shape). Suggestions, not rules. */
export const STYLE_TIPS_TEXT: Record<FaceShape, { suggest: StyleTipText[]; avoid: StyleTipText[] }> = {
  oval: {
    suggest: [
      {
        style: { en: 'Most shapes, e.g. rectangular or soft square', hi: 'लगभग हर आकार, जैसे आयताकार या हल्का चौकोर' },
        reason: { en: 'Balanced proportions suit most frame shapes.', hi: 'संतुलित चेहरे पर ज़्यादातर फ़्रेम अच्छे लगते हैं।' },
      },
      {
        style: { en: 'A front as wide as the widest part of the face', hi: 'चेहरे के सबसे चौड़े हिस्से जितना चौड़ा फ़्रेम' },
        reason: { en: 'Keeps the natural balance of an oval face.', hi: 'इससे अंडाकार चेहरे का कुदरती संतुलन बना रहता है।' },
      },
    ],
    avoid: [{
      style: { en: 'Very oversized frames', hi: 'बहुत बड़े फ़्रेम' },
      reason: { en: 'They can hide the balanced proportions.', hi: 'ये चेहरे का संतुलन छिपा सकते हैं।' },
    }],
  },
  round: {
    suggest: [
      {
        style: { en: 'Rectangular or square frames', hi: 'आयताकार या चौकोर फ़्रेम' },
        reason: { en: 'Straight lines and corners add definition to soft curves.', hi: 'सीधी लाइनें और कोने गोल चेहरे को उभार देते हैं।' },
      },
      {
        style: { en: 'Upswept or browline tops', hi: 'ऊपर की ओर उठे या भौंह जैसी ऊपरी लाइन वाले फ़्रेम' },
        reason: { en: 'They draw the eye upwards, so the face looks longer.', hi: 'ये नज़र ऊपर की ओर खींचते हैं, जिससे चेहरा लंबा लगता है।' },
      },
    ],
    avoid: [{
      style: { en: 'Small round frames', hi: 'छोटे गोल फ़्रेम' },
      reason: { en: 'They repeat the roundness and can make the face look fuller.', hi: 'ये गोलाई को और बढ़ाते हैं, जिससे चेहरा भरा-भरा लग सकता है।' },
    }],
  },
  square: {
    suggest: [
      {
        style: { en: 'Round or oval frames', hi: 'गोल या अंडाकार फ़्रेम' },
        reason: { en: 'Curves soften a strong jawline.', hi: 'गोलाई मज़बूत जबड़े को नरम दिखाती है।' },
      },
      {
        style: { en: 'Thin or semi-rimless frames', hi: 'पतले या आधे रिम वाले फ़्रेम' },
        reason: { en: 'Lighter lines balance angular features.', hi: 'हल्की लाइनें तीखे नैन-नक्श को संतुलित करती हैं।' },
      },
    ],
    avoid: [{
      style: { en: 'Boxy, sharp-cornered frames', hi: 'डिब्बे जैसे, नुकीले कोनों वाले फ़्रेम' },
      reason: { en: 'They echo the angles of the jaw.', hi: 'ये जबड़े के कोनों को और उभारते हैं।' },
    }],
  },
  heart: {
    suggest: [
      {
        style: { en: 'Oval, round or aviator frames', hi: 'अंडाकार, गोल या एविएटर फ़्रेम' },
        reason: {
          en: 'Fuller low down, they balance a wider forehead and a narrower chin.',
          hi: 'नीचे से भरे होने के कारण ये चौड़े माथे और पतली ठुड्डी को संतुलित करते हैं।',
        },
      },
      {
        style: { en: 'Light or rimless frames', hi: 'हल्के या बिना रिम वाले फ़्रेम' },
        reason: { en: 'They keep attention away from the wider top of the face.', hi: 'इनसे चेहरे के चौड़े ऊपरी हिस्से पर ध्यान कम जाता है।' },
      },
    ],
    avoid: [{
      style: { en: 'Heavy browline or decorated tops', hi: 'ऊपर से भारी या सजावट वाले फ़्रेम' },
      reason: { en: 'They add more width at the top.', hi: 'ये ऊपर की चौड़ाई और बढ़ाते हैं।' },
    }],
  },
  oblong: {
    suggest: [
      {
        style: { en: 'Deep (tall) frames, round or square', hi: 'ऊँचे फ़्रेम, गोल या चौकोर' },
        reason: { en: 'Taller lenses make a long face look shorter.', hi: 'ऊँचे लेंस लंबे चेहरे को छोटा दिखाते हैं।' },
      },
      {
        style: { en: 'Frames with detail at the sides', hi: 'किनारों पर डिज़ाइन वाले फ़्रेम' },
        reason: { en: 'They add width and break up the length.', hi: 'ये चौड़ाई बढ़ाते हैं और लंबाई कम दिखाते हैं।' },
      },
    ],
    avoid: [{
      style: { en: 'Small, narrow frames', hi: 'छोटे, कम चौड़े फ़्रेम' },
      reason: { en: 'They make a long face look longer.', hi: 'इनसे लंबा चेहरा और लंबा लगता है।' },
    }],
  },
};

/** The style tips for a face shape in `lang`. */
export function styleTips(shape: FaceShape, lang: Lang = 'en'): { suggest: StyleTip[]; avoid: StyleTip[] } {
  const tip = (t: StyleTipText): StyleTip => ({ style: t.style[lang], reason: t.reason[lang] });
  return { suggest: STYLE_TIPS_TEXT[shape].suggest.map(tip), avoid: STYLE_TIPS_TEXT[shape].avoid.map(tip) };
}

/** English style tips per face shape (what FrameFit stores). */
export const STYLE_TIPS: Record<FaceShape, { suggest: StyleTip[]; avoid: StyleTip[] }> = {
  oval: styleTips('oval'), round: styleTips('round'), square: styleTips('square'), heart: styleTips('heart'), oblong: styleTips('oblong'),
};

/** The three "how the sizes were chosen" lines; all numbers in mm. */
export const FRAME_HINT_TEXT: [Text, Text, Text] = [
  {
    en: 'A frame front about {lo}–{hi} mm wide is close to your face width at the cheekbones ({w} mm), so it neither pinches nor overhangs.',
    hi: 'लगभग {lo}–{hi} mm चौड़ा फ़्रेम आपके गालों की चौड़ाई ({w} mm) के करीब है, इसलिए यह न कसेगा, न बाहर निकलेगा।',
  },
  {
    en: 'Lens width {lensLo}–{lensHi} mm with a {bridgeLo}–{bridgeHi} mm bridge adds up to about that front width. The nose is not measured: check the bridge sits comfortably.',
    hi: '{lensLo}–{lensHi} mm का लेंस और {bridgeLo}–{bridgeHi} mm का ब्रिज मिलकर लगभग इतनी ही चौड़ाई बनाते हैं। नाक नापी नहीं गई है: देख लें कि ब्रिज नाक पर आराम से बैठे।',
  },
  {
    en: 'Lens width + bridge of {pdLo}–{pdHi} mm keeps the lens centres close to your pupils (PD {pd} mm).',
    hi: 'लेंस की चौड़ाई + ब्रिज {pdLo}–{pdHi} mm रखने से लेंस का बीच का हिस्सा आपकी पुतलियों के पास रहता है (PD {pd} mm)।',
  },
];

/** The hints of a frame fit, from its sizes, the cheekbone width and the distance PD (FrameFit.hints holds the English). */
export function frameHints(
  frame: Pick<FrameFit, 'totalWidthMm' | 'lensWidthMm' | 'bridgeMm' | 'framePdMm'>, cheekWidthMm: number, distancePdMm: number, lang: Lang = 'en',
): string[] {
  const vars = {
    lo: frame.totalWidthMm[0], hi: frame.totalWidthMm[1], w: Math.round(cheekWidthMm),
    lensLo: frame.lensWidthMm[0], lensHi: frame.lensWidthMm[1], bridgeLo: frame.bridgeMm[0], bridgeHi: frame.bridgeMm[1],
    pdLo: frame.framePdMm[0], pdHi: frame.framePdMm[1], pd: Math.round(distancePdMm),
  };
  return FRAME_HINT_TEXT.map((t) => fmt(t[lang], vars));
}

/** Frame size and style suggestions from the face measurements, face shape and distance PD. Advice, never a prescription. */
export function frameFit(face: FaceMeasurements, shape: FaceShape, distancePdMm: number): FrameFit {
  const f = FRAME_FIT;
  const w = face.cheekWidthMm;
  const total: [number, number] = [Math.round(w - f.belowFaceMm), Math.round(w + f.aboveFaceMm)];
  const mid = (total[0] + total[1]) / 2;
  const size: FrameSize = mid < f.narrowBelowMm ? 'narrow' : mid >= f.wideFromMm ? 'wide' : 'medium';
  const bridge: [number, number] = [f.bridgeMm[0], f.bridgeMm[1]];
  const lens = Math.round((mid - (bridge[0] + bridge[1]) / 2 - f.endpiecesMm) / 2);
  const lensWidth: [number, number] = [lens - f.lensSpreadMm, lens + f.lensSpreadMm];
  const framePd: [number, number] = [Math.round(distancePdMm), Math.round(distancePdMm + f.framePdOverMm)];
  const sizes = { totalWidthMm: total, lensWidthMm: lensWidth, bridgeMm: bridge, framePdMm: framePd };
  return {
    totalWidthMm: total,
    size,
    lensWidthMm: lensWidth,
    bridgeMm: bridge,
    framePdMm: framePd,
    hints: frameHints(sizes, w, distancePdMm),
    suggest: STYLE_TIPS[shape].suggest,
    avoid: STYLE_TIPS[shape].avoid,
  };
}

/** The words of a capture, for one screen language. */
export interface FitText {
  shapeName: string;
  reasons: string[];
  nearby: string[];
  size: string;
  hints: string[];
  suggest: StyleTip[];
  avoid: StyleTip[];
  notes: string[];
}

/**
 * A capture's words in `lang`. English is exactly what the capture stores (so the staff screen and the stored
 * report never change); any other language is rebuilt from the stored numbers with the same rules.
 */
export function fitText(fit: FitCapture, lang: Lang = 'en'): FitText {
  const names = (shapes: FaceShape[]) => shapes.map((s) => FACE_SHAPE_TEXT[s][lang].toLowerCase());
  // A stored size outside the three bands (history entries are only checked to be strings) is shown as stored.
  const size = (FRAME_SIZE_TEXT as Partial<Record<string, Text>>)[fit.frame.size]?.[lang] ?? fit.frame.size;
  const common = { shapeName: FACE_SHAPE_TEXT[fit.shape.shape][lang], nearby: names(fit.shape.nearby), size };
  if (lang === 'en') {
    return { ...common, reasons: fit.shape.reasons, hints: fit.frame.hints, suggest: fit.frame.suggest, avoid: fit.frame.avoid, notes: fit.notes };
  }
  return { ...common, ...rebuildFitText(fit, lang) };
}

/** The stored sentences of a capture, rebuilt in `lang` from its numbers (for 'en' this equals what measureFit stored). */
export function rebuildFitText(fit: FitCapture, lang: Lang): Pick<FitText, 'reasons' | 'hints' | 'suggest' | 'avoid' | 'notes'> {
  const tips = styleTips(fit.shape.shape, lang);
  return {
    reasons: shapeReasons(fit.shape.shape, fit.shape.ratios, lang),
    hints: frameHints(fit.frame, fit.face.cheekWidthMm, fit.pd.distanceEstimate.totalMm, lang),
    suggest: tips.suggest,
    avoid: tips.avoid,
    notes: fitNotes(fit.pd.distanceEstimate, lang),
  };
}

/** A PD or size in mm for display, to the nearest 0.5 mm as on a spectacle prescription card: "62.5", "63.0". */
export function mmText(mm: number): string {
  return (Math.round(mm * 2) / 2).toFixed(1);
}

/* ---------- Demo mode ---------- */

/**
 * Demo mode (?demo=1): a fixed, plausible face in front of the camera at 500 mm, with an oval shape and a distance
 * PD of about 63 mm. Same camera as the hook's demo state (500 mm, iris 14 px, so focal length about 600 px).
 */
export const DEMO_FACE = {
  distanceMm: 500,
  focalPx: 600,
  width: 1280,
  height: 720,
  /** Measured (converged) PD at 500 mm; the distance estimate is about 63.0 mm. */
  nearPdMm: 61.7,
  rightShare: 0.502,
  cheekWidthMm: 138,
  jawWidthMm: 108,
  foreheadWidthMm: 112,
  faceLengthMm: 172,
} as const;

/** Frame `i` of the demo face: the same face with a small deterministic jitter of the iris centres (under 0.2 mm). */
export function demoFaceSample(i = 0): FaceSample {
  const d = DEMO_FACE;
  const k = d.focalPx / d.distanceMm; // image px per mm on the face
  const cx = d.width / 2, cy = d.height / 2;
  // Face-plane mm, x towards the person's left (image right in an unmirrored frame), y down.
  const at = (x: number, y: number): PointPx => ({ x: cx + x * k, y: cy + y * k, z: 0 });
  const lm: PointPx[] = Array.from({ length: LANDMARK_COUNT }, () => at(0, 0));
  const jitter = 0.15 * Math.sin(i * 1.7);
  const eyeY = -15;
  const rX = -d.nearPdMm * d.rightShare + jitter;
  const lX = d.nearPdMm * (1 - d.rightShare) - jitter;
  const iris = 11.7 / 2, lid = 4.5, eye = 14; // half sizes, mm
  lm[LM.noseBridge] = at(0, eyeY);
  lm[LM.rightIris] = at(rX, eyeY);
  lm[LM.leftIris] = at(lX, eyeY);
  lm[LM.rightIrisEdges[0]] = at(rX - iris, eyeY); lm[LM.rightIrisEdges[1]] = at(rX + iris, eyeY);
  lm[LM.leftIrisEdges[0]] = at(lX - iris, eyeY); lm[LM.leftIrisEdges[1]] = at(lX + iris, eyeY);
  lm[LM.rightLids[0]] = at(rX, eyeY - lid); lm[LM.rightLids[1]] = at(rX, eyeY + lid);
  lm[LM.leftLids[0]] = at(lX, eyeY - lid); lm[LM.leftLids[1]] = at(lX, eyeY + lid);
  lm[LM.rightCorners[0]] = at(rX - eye, eyeY); lm[LM.rightCorners[1]] = at(rX + eye, eyeY);
  lm[LM.leftCorners[0]] = at(lX - eye, eyeY); lm[LM.leftCorners[1]] = at(lX + eye, eyeY);
  lm[LM.cheeks[0]] = at(-d.cheekWidthMm / 2, -10); lm[LM.cheeks[1]] = at(d.cheekWidthMm / 2, -10);
  lm[LM.jaw[0]] = at(-d.jawWidthMm / 2, 45); lm[LM.jaw[1]] = at(d.jawWidthMm / 2, 45);
  lm[LM.forehead[0]] = at(-d.foreheadWidthMm / 2, -60); lm[LM.forehead[1]] = at(d.foreheadWidthMm / 2, -60);
  lm[LM.top] = at(0, -95);
  lm[LM.chin] = at(0, -95 + d.faceLengthMm);
  return { landmarks: lm, width: d.width, height: d.height, distanceMm: d.distanceMm, focalPx: d.focalPx };
}
