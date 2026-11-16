/*
 * Far-point estimate of short sight (myopia), per eye: a PROVISIONAL range, never a prescription.
 *
 * An uncorrected short-sighted eye sees sharply only out to its far point; beyond it letters blur. The far point of a
 * −2 D eye is 1/2 m = 50 cm, so the sphere is about −100 / (far point in cm). This fixes the gap in known issue #1:
 * the acuity chart is read at 50 cm, so an eye of up to about −2 D still reads 6/6 there.
 *
 * The test (components/Tests.tsx FarPointTest), after the red-green test of each eye: the other eye covered, glasses
 * off (contact lenses may stay in), a line of the session's optotypes at a FIXED physical size (FAR_LOGMAR at
 * FAR_DESIGN_MM). The person starts with the phone close, where the letters are clear, slowly moves it away and taps
 * "Blurred now" at the first blur; the camera's iris distance at that tap is one trial. FAR_TRIALS trials, median used.
 * "Still clear at arm's length" and "Already blurred" end the step with that outcome; "Skip this step" gives null.
 *
 * PROVISIONAL: every threshold here is a first draft, to be validated against refraction (docs/validation.md).
 * Known limits: the blur judgement itself (depth of focus about ±0.25–0.5 D); the iris-distance error (11.7 mm iris
 * assumption, about ±5%); the distance is camera to eye, not to the spectacle plane; Face Mesh tracking at 15–25 cm
 * is unverified.
 *
 * Letter size (changed 16 Nov 2026 from 0.2 logMAR at 40 cm, 0.92 mm, which shrank to 6/6 size at about 63 cm, so a
 * normal 6/6 eye could call the letters blurred near 60–65 cm from size alone and get a false −1.5 D): 0.1 logMAR at
 * 65 cm (FAR_BEYOND_CM), about 1.19 mm. These letters are 6/6 in size only at about 82 cm, so a 6/6 eye still resolves
 * them beyond arm's length, and blur inside 65 cm (the 'measured' range, where FAR_ADVISE_D applies) comes from
 * defocus, not size. An eye whose best acuity is worse than about 6/7.5 may still reach its size limit inside 65 cm;
 * its 50 cm acuity then flags it in triage anyway.
 *
 * Sentences are in FARPOINT_TEXT, one entry per language; functions take `lang` (default 'en'). The report and the
 * staff screen use English.
 */
import { fmt, type Lang, type Text } from './i18n';
import { median, optotypeHeightMm } from './optics';

/**
 * PROVISIONAL: the letters are 0.1 logMAR (6/7.5) as seen from 65 cm, a fixed physical size whatever the distance
 * (about 1.19 mm; 6/6 size at about 82 cm).
 */
export const FAR_LOGMAR = 0.1;
export const FAR_DESIGN_MM = 650;
/** Trials per eye ("Blurred now" taps). */
export const FAR_TRIALS = 3;
/** Distances (cm) outside this range are tracking errors, not trials. */
export const FAR_MIN_CM = 10;
export const FAR_MAX_CM = 150;
/** PROVISIONAL: a median at or beyond this (about arm's length) is 'beyond': any short sight is weaker than about −1.5 D. */
export const FAR_BEYOND_CM = 65;
/** PROVISIONAL: the closest usable distance; "Already blurred" there means stronger than about −5 D (−100 / 20). */
export const FAR_NEAREST_CM = 20;
/** Estimates are in quarter dioptres, shown as a range of ± FAR_RANGE_D. */
export const FAR_STEP_D = 0.25;
export const FAR_RANGE_D = 0.5;
/** PROVISIONAL: a 'measured' estimate this strong or stronger (≤ −1.5 D) raises triage 'ok' to 'advise' (lib/triage.ts). */
export const FAR_ADVISE_D = -1.5;

export type FarPointOutcome = 'measured' | 'beyond' | 'already-blurred';

/** One eye's far-point result; EyeResult.farPoint is null when the step was skipped. */
export interface FarPoint {
  /**
   * Eye-to-phone distances in whole cm (iris distance): one per "Blurred now" tap (1 to FAR_TRIALS), or the single
   * distance of a "Still clear at arm's length" / "Already blurred" tap.
   */
  trialsCm: number[];
  /** Median of trialsCm. */
  medianCm: number;
  /**
   * 'measured': a far point closer than FAR_BEYOND_CM. 'beyond': still clear at arm's length, or a median at or beyond
   * FAR_BEYOND_CM. 'already-blurred': blurred even at the closest distance tried (medianCm).
   */
  outcome: FarPointOutcome;
  /** Sphere estimate in dioptres (negative), to FAR_STEP_D; 'measured' only, else null. */
  estimateD: number | null;
  /** [estimateD − FAR_RANGE_D, estimateD + FAR_RANGE_D], e.g. [−2.75, −1.75]; 'measured' only, else null. */
  rangeD: [number, number] | null;
}

/** The letter height (mm, = Tumbling E height and Landolt C diameter): 0.1 logMAR at 65 cm, about 1.19 mm. */
export function farPointLetterMm(): number {
  return optotypeHeightMm(FAR_LOGMAR, FAR_DESIGN_MM);
}

/** A measured face distance (mm) as a trial in whole cm, or null when there is none or it is out of range. */
export function trialCm(distanceMm: number | null): number | null {
  if (distanceMm === null || !Number.isFinite(distanceMm)) return null;
  const cm = Math.round(distanceMm / 10);
  return cm >= FAR_MIN_CM && cm <= FAR_MAX_CM ? cm : null;
}

const validCm = (cm: number) => Number.isFinite(cm) && cm >= FAR_MIN_CM && cm <= FAR_MAX_CM;

/**
 * The far-point power at `cm`: −100 / cm, in quarter dioptres rounded toward the weaker power (the usual rule: never
 * over-minus). 42 cm -> −2.38 -> −2.25; 40 cm -> −2.5; 65 cm -> −1.5; 20 cm -> −5.
 */
export function sphereD(cm: number): number {
  const q = Math.ceil(-100 / cm / FAR_STEP_D - 1e-9) * FAR_STEP_D;
  return q === 0 ? 0 : q; // no −0
}

/** The result of 1 to FAR_TRIALS "Blurred now" distances (cm); invalid ones are dropped; null when none is valid. */
export function measuredFarPoint(trials: number[]): FarPoint | null {
  const trialsCm = trials.filter(validCm);
  if (trialsCm.length === 0) return null;
  const medianCm = median(trialsCm);
  if (medianCm >= FAR_BEYOND_CM) return { trialsCm, medianCm, outcome: 'beyond', estimateD: null, rangeD: null };
  const estimateD = sphereD(medianCm);
  return { trialsCm, medianCm, outcome: 'measured', estimateD, rangeD: [estimateD - FAR_RANGE_D, estimateD + FAR_RANGE_D] };
}

/** "Still clear at arm's length", tapped at `cm`. Earlier "Blurred now" trials of the eye are not kept. */
export function clearFarPoint(cm: number): FarPoint | null {
  return validCm(cm) ? { trialsCm: [cm], medianCm: cm, outcome: 'beyond', estimateD: null, rangeD: null } : null;
}

/** "Already blurred", tapped at `cm` (the closest distance tried). Earlier "Blurred now" trials are not kept. */
export function blurredFarPoint(cm: number): FarPoint | null {
  return validCm(cm) ? { trialsCm: [cm], medianCm: cm, outcome: 'already-blurred', estimateD: null, rangeD: null } : null;
}

/**
 * The bound a non-measured outcome supports, in dioptres. 'beyond': short sight, if any, is weaker than this
 * (the far-point power at medianCm, but never claimed weaker than at FAR_BEYOND_CM: −1.5 D). 'already-blurred':
 * possibly stronger than this (the power at medianCm, at most that of FAR_NEAREST_CM: −5 D). 'measured': null.
 */
export function farPointBoundD(fp: FarPoint): number | null {
  if (fp.outcome === 'beyond') return sphereD(Math.min(fp.medianCm, FAR_BEYOND_CM));
  if (fp.outcome === 'already-blurred') return sphereD(Math.max(fp.medianCm, FAR_NEAREST_CM));
  return null;
}

/** True when the far point raises triage 'ok' to 'advise': a 'measured' estimate of FAR_ADVISE_D or stronger. */
export function farPointAdvises(fp: FarPoint | null | undefined): fp is FarPoint & { estimateD: number } {
  return !!fp && fp.outcome === 'measured' && fp.estimateD !== null && fp.estimateD <= FAR_ADVISE_D + 1e-9;
}

/** Dioptres with two decimals and a real minus sign: −2.25, −1.50, 0.00. */
export function dioptreText(d: number): string {
  const t = Math.abs(d).toFixed(2);
  return d < 0 && t !== '0.00' ? `−${t}` : t;
}

/** A distance in cm: whole numbers as they are, a two-trial median such as 42.5 with one decimal. */
export function cmText(cm: number): string {
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1);
}

/** Results and staff-screen sentences. {cm} is cmText, {d}/{lo}/{hi} are dioptreText. */
export const FARPOINT_TEXT = {
  measured: {
    en: '{cm} cm → estimated about {d} D ({lo} to {hi}), not a prescription',
    hi: '{cm} cm → अंदाज़न लगभग {d} D ({lo} से {hi}), चश्मे का नंबर नहीं',
  },
  beyond: {
    en: 'Still clear at {cm} cm: any short sight is weaker than about {d} D, not a prescription',
    hi: '{cm} cm पर भी साफ़: दूर का कम दिखना (मायोपिया) हो भी, तो लगभग {d} D से कम है; चश्मे का नंबर नहीं',
  },
  blurred: {
    en: 'Blurred even at {cm} cm: possibly stronger than about {d} D, or the phone was too close to focus; not a prescription',
    hi: '{cm} cm पर भी धुंधला: शायद लगभग {d} D से ज़्यादा, या फ़ोन फ़ोकस के लिए बहुत पास था; चश्मे का नंबर नहीं',
  },
  skipped: { en: 'Skipped', hi: 'छोड़ दिया गया' },
} satisfies Record<string, Text>;

/** One eye's far point for the results and staff screens; null (skipped) -> "Skipped". */
export function farPointText(fp: FarPoint | null, lang: Lang = 'en'): string {
  const T = FARPOINT_TEXT;
  if (!fp) return T.skipped[lang];
  const cm = cmText(fp.medianCm);
  if (fp.outcome === 'measured' && fp.estimateD !== null && fp.rangeD) {
    return fmt(T.measured[lang], { cm, d: dioptreText(fp.estimateD), lo: dioptreText(fp.rangeD[0]), hi: dioptreText(fp.rangeD[1]) });
  }
  const d = dioptreText(farPointBoundD(fp) ?? 0);
  return fmt((fp.outcome === 'beyond' ? T.beyond : T.blurred)[lang], { cm, d });
}

/* ---------- strict check, for reading the saved history (lib/history.ts) ---------- */

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/**
 * True for null (skipped) or a well-formed FarPoint: 1 to FAR_TRIALS whole-cm trials in range, medianCm their median,
 * estimateD and a ± FAR_RANGE_D rangeD for 'measured' only (null otherwise).
 */
export function isFarPoint(x: unknown): x is FarPoint | null {
  if (x === null) return true;
  if (typeof x !== 'object' || Array.isArray(x)) return false;
  const f = x as Record<string, unknown>;
  const t = f.trialsCm;
  if (!Array.isArray(t) || t.length < 1 || t.length > FAR_TRIALS || !t.every((c) => isNum(c) && Number.isInteger(c) && validCm(c))) return false;
  if (!isNum(f.medianCm) || Math.abs(f.medianCm - median(t as number[])) > 1e-9) return false;
  if (f.outcome === 'measured') {
    const r = f.rangeD;
    return isNum(f.estimateD) && Array.isArray(r) && r.length === 2 && r.every(isNum)
      && Math.abs((r[0] as number) - (f.estimateD - FAR_RANGE_D)) < 1e-9 && Math.abs((r[1] as number) - (f.estimateD + FAR_RANGE_D)) < 1e-9;
  }
  if (f.outcome === 'beyond' || f.outcome === 'already-blurred') {
    // A "Still clear" / "Already blurred" tap records one distance; a 'beyond' from trials may record up to FAR_TRIALS.
    return f.estimateD === null && f.rangeD === null && (f.outcome === 'beyond' || t.length === 1);
  }
  return false;
}
