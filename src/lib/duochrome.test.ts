import { describe, expect, it } from 'vitest';
import {
  contrastRatio, DUO_GREEN, DUO_GREEN_CSS, DUO_INK, DUO_INK_CSS, DUO_RED, DUO_RED_CSS, relativeLuminance, rgbCss, type Rgb,
} from './duochrome';

const lum = ({ r, g, b }: Rgb) => relativeLuminance(r, g, b);
/** Relative difference of two luminances, against the smaller one. */
const relDiff = (a: number, b: number) => Math.abs(a - b) / Math.min(a, b);
/** Hue in degrees (0-360) of an sRGB colour. */
const hue = ({ r, g, b }: Rgb) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

describe('relativeLuminance (WCAG / sRGB)', () => {
  it('gives the known values for white, black and the primaries', () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 10);
    expect(relativeLuminance(0, 0, 0)).toBe(0);
    expect(relativeLuminance(255, 0, 0)).toBeCloseTo(0.2126, 10);
    expect(relativeLuminance(0, 255, 0)).toBeCloseTo(0.7152, 10);
    expect(relativeLuminance(0, 0, 255)).toBeCloseTo(0.0722, 10);
  });
  it('linearises the channels (mid grey and the dark linear segment)', () => {
    expect(relativeLuminance(128, 128, 128)).toBeCloseTo(0.2158605, 6);
    // 10/255 is below the 0.04045 knee, so it is divided by 12.92.
    expect(relativeLuminance(10, 10, 10)).toBeCloseTo(10 / 255 / 12.92, 10);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for white on black, 1:1 for equal colours, and order-free', () => {
    expect(contrastRatio(1, 0)).toBeCloseTo(21, 10);
    expect(contrastRatio(0, 1)).toBeCloseTo(21, 10);
    expect(contrastRatio(0.3, 0.3)).toBe(1);
  });
});

describe('duochrome stimulus colours', () => {
  it('has luminance-matched red and green halves (within 2% relative)', () => {
    expect(lum(DUO_RED)).toBeCloseTo(0.2126, 4);
    expect(lum(DUO_GREEN)).toBeCloseTo(0.2133, 4);
    expect(relDiff(lum(DUO_RED), lum(DUO_GREEN))).toBeLessThan(0.02);
  });
  it('would have caught the old, unmatched colours (green 1.9x brighter)', () => {
    const oldRed = relativeLuminance(255, 45, 45), oldGreen = relativeLuminance(0, 205, 90);
    expect(oldRed).toBeCloseTo(0.233, 3);
    expect(oldGreen).toBeCloseTo(0.444, 3);
    expect(relDiff(oldRed, oldGreen)).toBeGreaterThan(0.02);
    // ... so the black E's had 5.7:1 contrast on red against 9.9:1 on green.
    expect(contrastRatio(oldRed, 0)).toBeCloseTo(5.7, 1);
    expect(contrastRatio(oldGreen, 0)).toBeCloseTo(9.9, 1);
  });
  it('keeps black letters and button text readable on both halves (at least 4.5:1)', () => {
    expect(DUO_INK).toEqual({ r: 0, g: 0, b: 0 });
    for (const c of [DUO_RED, DUO_GREEN]) expect(contrastRatio(lum(c), lum(DUO_INK))).toBeGreaterThanOrEqual(4.5);
    // ... and the same contrast on both, within 2%, so neither side's letters look blacker.
    expect(relDiff(contrastRatio(lum(DUO_RED), 0), contrastRatio(lum(DUO_GREEN), 0))).toBeLessThan(0.02);
  });
  it('uses a clear red and a clear green (not yellowish or teal)', () => {
    expect(hue(DUO_RED)).toBe(0);
    const h = hue(DUO_GREEN);
    expect(h).toBeGreaterThanOrEqual(120);
    expect(h).toBeLessThanOrEqual(150);
    expect(DUO_GREEN.r).toBe(0);
  });
  it('uses whole 0-255 channels and matching CSS strings', () => {
    for (const c of [DUO_RED, DUO_GREEN, DUO_INK]) {
      for (const v of [c.r, c.g, c.b]) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    }
    expect(DUO_RED_CSS).toBe('rgb(255,0,0)');
    expect(DUO_GREEN_CSS).toBe('rgb(0,148,40)');
    expect(DUO_INK_CSS).toBe('rgb(0,0,0)');
    expect(rgbCss({ r: 1, g: 2, b: 3 })).toBe('rgb(1,2,3)');
  });
});
