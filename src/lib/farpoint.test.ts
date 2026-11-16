import { describe, expect, it } from 'vitest';
import hindiReview from '../../docs/hindi-review.md?raw';
import { FAR, RESULTS } from './i18n';
import { TRIAGE_TEXT } from './triage';
import {
  blurredFarPoint, clearFarPoint, cmText, dioptreText, FAR_ADVISE_D, FAR_BEYOND_CM, FAR_NEAREST_CM, FAR_TRIALS, farPointAdvises, farPointBoundD,
  farPointLetterMm, farPointText, FARPOINT_TEXT, isFarPoint, measuredFarPoint, sphereD, trialCm, type FarPoint,
} from './farpoint';
import { ARCMIN, optotypeHeightMm } from './optics';

describe('sphereD: −100 / cm in quarter dioptres, toward the weaker power', () => {
  it('matches the worked example and exact quarters', () => {
    expect(sphereD(42)).toBe(-2.25); // −2.38
    expect(sphereD(40)).toBe(-2.5);
    expect(sphereD(50)).toBe(-2);
    expect(sphereD(25)).toBe(-4);
    expect(sphereD(20)).toBe(-5);
    expect(sphereD(65)).toBe(-1.5); // −1.54
    expect(sphereD(80)).toBe(-1.25);
  });
  it('never rounds toward the stronger power, and gives no −0', () => {
    for (let cm = 10; cm <= 150; cm += 0.5) {
      const d = sphereD(cm);
      expect(d).toBeGreaterThanOrEqual(-100 / cm - 1e-9);
      expect(d - -100 / cm).toBeLessThan(0.25);
      expect(Math.round(d * 4)).toBeCloseTo(d * 4, 9);
    }
    expect(Object.is(sphereD(1e9), 0)).toBe(true);
  });
});

describe('measuredFarPoint', () => {
  it('42 cm: about −2.25 D, range −2.75 to −1.75', () => {
    expect(measuredFarPoint([42])).toEqual({ trialsCm: [42], medianCm: 42, outcome: 'measured', estimateD: -2.25, rangeD: [-2.75, -1.75] });
  });
  it('uses the median of 1 to 3 trials', () => {
    expect(measuredFarPoint([40, 55, 42])).toMatchObject({ trialsCm: [40, 55, 42], medianCm: 42, estimateD: -2.25 });
    expect(measuredFarPoint([40, 45])).toMatchObject({ medianCm: 42.5, estimateD: -2.25, rangeD: [-2.75, -1.75] });
    expect(measuredFarPoint([25, 24, 26])).toMatchObject({ medianCm: 25, estimateD: -4, rangeD: [-4.5, -3.5] });
  });
  it(`a median at or beyond ${FAR_BEYOND_CM} cm is 'beyond', with no estimate`, () => {
    expect(measuredFarPoint([66, 70, 64])).toEqual({ trialsCm: [66, 70, 64], medianCm: 66, outcome: 'beyond', estimateD: null, rangeD: null });
    expect(measuredFarPoint([FAR_BEYOND_CM])?.outcome).toBe('beyond');
    expect(measuredFarPoint([FAR_BEYOND_CM - 1])?.outcome).toBe('measured');
  });
  it('drops out-of-range or non-finite trials; null when none is left', () => {
    expect(measuredFarPoint([5, 42, NaN, 400])).toMatchObject({ trialsCm: [42], medianCm: 42 });
    expect(measuredFarPoint([])).toBeNull();
    expect(measuredFarPoint([3, Infinity])).toBeNull();
  });
});

describe('"Still clear" and "Already blurred"', () => {
  it('record the one distance of the tap', () => {
    expect(clearFarPoint(68)).toEqual({ trialsCm: [68], medianCm: 68, outcome: 'beyond', estimateD: null, rangeD: null });
    expect(blurredFarPoint(18)).toEqual({ trialsCm: [18], medianCm: 18, outcome: 'already-blurred', estimateD: null, rangeD: null });
    expect(clearFarPoint(4)).toBeNull();
    expect(blurredFarPoint(NaN)).toBeNull();
  });
  it('bounds: beyond is weaker than about −1.5 D at arm\'s length (less certain when tapped closer)', () => {
    expect(farPointBoundD(clearFarPoint(70)!)).toBe(-1.5);
    expect(farPointBoundD(clearFarPoint(FAR_BEYOND_CM)!)).toBe(-1.5);
    expect(farPointBoundD(clearFarPoint(50)!)).toBe(-2);
    expect(farPointBoundD(measuredFarPoint([80, 90])!)).toBe(-1.5);
  });
  it('bounds: already blurred is stronger than about −5 D at the closest distance (weaker claim further away)', () => {
    expect(farPointBoundD(blurredFarPoint(FAR_NEAREST_CM)!)).toBe(-5);
    expect(farPointBoundD(blurredFarPoint(15)!)).toBe(-5);
    expect(farPointBoundD(blurredFarPoint(30)!)).toBe(-3.25);
    expect(farPointBoundD(measuredFarPoint([42])!)).toBeNull();
  });
});

describe('triage threshold', () => {
  it(`a measured ${FAR_ADVISE_D} D or stronger advises; weaker, beyond, blurred or skipped does not`, () => {
    expect(farPointAdvises(measuredFarPoint([42]))).toBe(true);
    expect(farPointAdvises(measuredFarPoint([64]))).toBe(true); // −1.56 -> −1.5
    expect(farPointAdvises(measuredFarPoint([FAR_BEYOND_CM]))).toBe(false); // beyond
    expect(farPointAdvises({ trialsCm: [70], medianCm: 70, outcome: 'measured', estimateD: -1.25, rangeD: [-1.75, -0.75] })).toBe(false);
    expect(farPointAdvises(clearFarPoint(70))).toBe(false);
    expect(farPointAdvises(blurredFarPoint(18))).toBe(false);
    expect(farPointAdvises(null)).toBe(false);
    expect(farPointAdvises(undefined)).toBe(false);
  });
});

describe('letter size and distances', () => {
  it('the letters are 0.1 logMAR at 65 cm, about 1.19 mm, the same at every distance', () => {
    expect(farPointLetterMm()).toBeCloseTo(optotypeHeightMm(0.1, 650), 12);
    expect(farPointLetterMm()).toBeCloseTo(1.19, 2);
  });
  it('a 6/6 eye resolves them well beyond arm\'s length (about 82 cm), so blur inside 65 cm is defocus, not size', () => {
    // Distance at which the letters subtend 5 arc-minutes (6/6 size).
    const sixSixMm = farPointLetterMm() / (2 * Math.tan((5 * ARCMIN) / 2));
    expect(sixSixMm / 10).toBeCloseTo(81.8, 1);
    expect(sixSixMm / 10).toBeGreaterThan(FAR_BEYOND_CM + 15);
    // At the 'beyond' limit they are still 6/7.5 in size, and larger at every 'measured' distance.
    expect(optotypeHeightMm(0.1, FAR_BEYOND_CM * 10)).toBeCloseTo(farPointLetterMm(), 12);
  });
  it('trialCm rounds the iris distance to whole cm and rejects missing or out-of-range ones', () => {
    expect(trialCm(423)).toBe(42);
    expect(trialCm(427.4)).toBe(43);
    expect(trialCm(null)).toBeNull();
    expect(trialCm(NaN)).toBeNull();
    expect(trialCm(60)).toBeNull();
    expect(trialCm(2000)).toBeNull();
    expect(trialCm(500)).toBe(50); // demo mode's fixed distance
  });
});

describe('text', () => {
  it('dioptres and centimetres', () => {
    expect(dioptreText(-2.25)).toBe('−2.25');
    expect(dioptreText(-1.5)).toBe('−1.50');
    expect(dioptreText(0)).toBe('0.00');
    expect(dioptreText(-0)).toBe('0.00');
    expect(dioptreText(0.5)).toBe('0.50');
    expect(cmText(42)).toBe('42');
    expect(cmText(42.5)).toBe('42.5');
  });
  it('English sentences', () => {
    expect(farPointText(measuredFarPoint([42]))).toBe('42 cm → estimated about −2.25 D (−2.75 to −1.75), not a prescription');
    expect(farPointText(clearFarPoint(68))).toBe('Still clear at 68 cm: any short sight is weaker than about −1.50 D, not a prescription');
    expect(farPointText(measuredFarPoint([70, 66]))).toBe('Still clear at 68 cm: any short sight is weaker than about −1.50 D, not a prescription');
    expect(farPointText(blurredFarPoint(18)))
      .toBe('Blurred even at 18 cm: possibly stronger than about −5.00 D, or the phone was too close to focus; not a prescription');
    expect(farPointText(null)).toBe('Skipped');
  });
  it('Hindi sentences keep the numbers', () => {
    expect(farPointText(measuredFarPoint([42]), 'hi')).toBe('42 cm → अंदाज़न लगभग −2.25 D (−2.75 से −1.75), चश्मे का नंबर नहीं');
    expect(farPointText(null, 'hi')).toBe(FARPOINT_TEXT.skipped.hi);
    expect(farPointText(blurredFarPoint(18), 'hi')).toContain('−5.00 D');
  });
});

describe('isFarPoint (strict, for the saved history)', () => {
  const good: FarPoint[] = [measuredFarPoint([40, 55, 42])!, measuredFarPoint([40, 45])!, measuredFarPoint([66, 70, 64])!, clearFarPoint(68)!, blurredFarPoint(18)!];
  it('accepts null and every block the functions make, also after JSON', () => {
    expect(isFarPoint(null)).toBe(true);
    for (const fp of good) {
      expect(isFarPoint(fp)).toBe(true);
      expect(isFarPoint(JSON.parse(JSON.stringify(fp)))).toBe(true);
    }
  });
  it('rejects malformed blocks', () => {
    const m = good[0];
    const bad: unknown[] = [
      undefined, 3, 'measured', [], {},
      { ...m, trialsCm: [] }, { ...m, trialsCm: Array(FAR_TRIALS + 1).fill(42), medianCm: 42 }, { ...m, trialsCm: [42.5], medianCm: 42.5 },
      { ...m, trialsCm: [5], medianCm: 5 }, { ...m, medianCm: 41 }, { ...m, outcome: 'maybe' }, { ...m, estimateD: null },
      { ...m, rangeD: null }, { ...m, rangeD: [-3, -1.75] }, { ...m, rangeD: [-2.75] },
      { ...good[3], estimateD: -1.5 }, { ...good[3], rangeD: [-2, -1] }, { ...good[4], trialsCm: [18, 19], medianCm: 18.5 },
    ];
    for (const x of bad) expect(isFarPoint(x), JSON.stringify(x)).toBe(false);
  });
});

describe('docs/hindi-review.md', () => {
  it('lists every far-point string, English and Hindi, under its key', () => {
    const rows: [string, { en: string; hi: string }][] = [
      ...Object.entries(FAR).map(([k, t]) => [`FAR.${k}`, t] as [string, { en: string; hi: string }]),
      ['RESULTS.farPoint', RESULTS.farPoint], ['RESULTS.farPointContacts', RESULTS.farPointContacts],
      ...Object.entries(FARPOINT_TEXT).map(([k, t]) => [`FARPOINT_TEXT.${k}`, t] as [string, { en: string; hi: string }]),
      ['TRIAGE_TEXT.farPoint', TRIAGE_TEXT.farPoint],
    ];
    const doc = hindiReview.replace(/\r\n/g, '\n');
    for (const [key, t] of rows) expect(doc, key).toContain(`| ${key} | ${t.en} | ${t.hi} |`);
  });
});
