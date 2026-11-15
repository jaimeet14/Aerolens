import { describe, expect, it } from 'vitest';
import {
  ARCMIN, focalPxFromDiagFov, focalPxFromKnownDistance, inRange, irisDistanceMm, median,
  optotypeHeightMm, scaleBoxMaxPx, strokePhysicalPx, CARD_SHORT_MM,
} from './optics';

describe('optotype sizing', () => {
  it('6/6 letter is 5 arc-minutes tall: 8.73 mm at 6 m', () => {
    expect(optotypeHeightMm(0, 6000)).toBeCloseTo(8.727, 2);
  });
  it('6/6 letter at 50 cm is 0.727 mm', () => {
    expect(optotypeHeightMm(0, 500)).toBeCloseTo(0.7272, 3);
  });
  it('6/6 letter at 50 cm is under 1 mm, as the card-scale screen explains', () => {
    expect(optotypeHeightMm(0, 500)).toBeLessThan(1);
  });
  it('size scales by 10^logMAR (6/60 is ten times 6/6)', () => {
    expect(optotypeHeightMm(1, 500) / optotypeHeightMm(0, 500)).toBeCloseTo(10, 1);
  });
  it('subtends the right angle', () => {
    const h = optotypeHeightMm(0, 500);
    expect((2 * Math.atan(h / 1000)) / ARCMIN).toBeCloseTo(5, 6);
  });
  it('stroke in device pixels uses CSS px/mm and DPR', () => {
    // 6/6 at 50 cm: stroke = 0.1454 mm; 6 css px/mm, dpr 3 -> 2.62 device px
    expect(strokePhysicalPx(0, 500, 6, 3)).toBeCloseTo(2.617, 2);
  });
});

describe('iris distance', () => {
  it('round-trips with the pinhole model', () => {
    const f = 1000;
    const irisPx = (f * 11.7) / 500;
    expect(irisDistanceMm(irisPx, f)).toBeCloseTo(500, 6);
  });
  it('tape-measure calibration recovers the focal length', () => {
    const f = 957;
    const irisPx = (f * 11.7) / 450;
    expect(focalPxFromKnownDistance(irisPx, 450)).toBeCloseTo(f, 6);
  });
  it('focal from 75 deg diagonal FOV at 1280x720', () => {
    expect(focalPxFromDiagFov(1280, 720, 75)).toBeCloseTo(956.9, 0);
  });
});

describe('helpers', () => {
  it('median', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('inRange uses a relative tolerance', () => {
    expect(inRange(540, 500)).toBe(true);
    expect(inRange(560, 500)).toBe(false);
    expect(inRange(null, 500)).toBe(false);
  });
});

describe('card-scale box width', () => {
  it('uses the full viewport minus the gutter', () => {
    expect(scaleBoxMaxPx(360)).toBe(344);
    expect(scaleBoxMaxPx(412)).toBe(396);
  });
  it('is clamped to [160, 480]', () => {
    expect(scaleBoxMaxPx(100)).toBe(160);
    expect(scaleBoxMaxPx(1200)).toBe(480);
  });
  it('can reach the card edge on a 360-px phone with a 60 mm wide screen', () => {
    const needed = (360 / 60) * CARD_SHORT_MM; // CSS px the 53.98 mm edge spans
    expect(needed).toBeGreaterThan(304); // the old limit could not reach it
    expect(scaleBoxMaxPx(360)).toBeGreaterThanOrEqual(needed);
  });
});
