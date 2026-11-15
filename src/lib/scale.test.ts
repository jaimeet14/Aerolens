import { describe, expect, it } from 'vitest';
import { makeSavedScale, matchesScreen, parseSavedScale, sameDpr, screenSignature } from './scale';

const AT = '2026-11-14T10:00:00.000Z';
const phone = screenSignature(393, 852, 3);
const saved = makeSavedScale(6.1, phone, AT);
const json = (o: unknown) => JSON.stringify(o);

describe('screenSignature', () => {
  it('sorts the dimensions so portrait and landscape give the same signature', () => {
    expect(screenSignature(852, 393, 3)).toEqual(phone);
    expect(phone).toEqual({ dims: [393, 852], dpr: 3 });
  });
  it('rounds fractional CSS sizes', () => {
    expect(screenSignature(392.7, 851.6, 2.75).dims).toEqual([393, 852]);
  });
});

describe('matchesScreen', () => {
  it('matches the same screen in the other orientation', () => {
    expect(matchesScreen(saved, screenSignature(852, 393, 3))).toBe(true);
  });
  it('rejects a dpr change (page zoom or display size)', () => {
    expect(matchesScreen(saved, screenSignature(393, 852, 3.3))).toBe(false);
    expect(matchesScreen(saved, screenSignature(393, 852, 2.75))).toBe(false);
  });
  it('allows dpr float noise up to 0.01', () => {
    expect(matchesScreen(saved, screenSignature(393, 852, 3.005))).toBe(true);
    expect(matchesScreen(saved, screenSignature(393, 852, 3.02))).toBe(false);
  });
  it('rejects a different screen size, even by one pixel', () => {
    expect(matchesScreen(saved, screenSignature(390, 844, 3))).toBe(false);
    expect(matchesScreen(saved, screenSignature(393, 851, 3))).toBe(false);
  });
  it('rejects a broken current signature', () => {
    expect(matchesScreen(saved, screenSignature(NaN, 852, 3))).toBe(false);
    expect(matchesScreen(saved, screenSignature(393, 852, NaN))).toBe(false);
  });
});

describe('sameDpr', () => {
  it('uses the same 0.01 tolerance as the zoom guard', () => {
    expect(sameDpr(2, 2.01)).toBe(true);
    expect(sameDpr(2, 2.011)).toBe(false);
    expect(sameDpr(2, 2.2)).toBe(false);
  });
});

describe('parseSavedScale', () => {
  it('round-trips a valid record', () => {
    expect(parseSavedScale(json(saved))).toEqual(saved);
    expect(matchesScreen(parseSavedScale(json(saved))!, phone)).toBe(true);
  });
  it('drops unknown extra fields', () => {
    expect(parseSavedScale(json({ ...saved, extra: 1 }))).toEqual(saved);
  });
  it('returns null for missing or unparseable JSON', () => {
    expect(parseSavedScale(null)).toBeNull();
    expect(parseSavedScale('')).toBeNull();
    expect(parseSavedScale('{not json')).toBeNull();
    expect(parseSavedScale('null')).toBeNull();
    expect(parseSavedScale('6.1')).toBeNull();
    expect(parseSavedScale('[]')).toBeNull();
  });
  it('returns null for a wrong or missing version', () => {
    expect(parseSavedScale(json({ ...saved, v: 2 }))).toBeNull();
    expect(parseSavedScale(json({ ...saved, v: '1' }))).toBeNull();
    const { v: _v, ...noVersion } = saved;
    expect(parseSavedScale(json(noVersion))).toBeNull();
  });
  it('returns null for an implausible or non-numeric pxPerMm', () => {
    for (const pxPerMm of [0, -5, 1.99, 12.01, 1e9, '6.1', null]) {
      expect(parseSavedScale(json({ ...saved, pxPerMm }))).toBeNull();
    }
    // JSON has no Infinity/NaN; they serialise to null and are rejected above.
    expect(parseSavedScale('{"v":1,"pxPerMm":1e999,"signature":{"dims":[393,852],"dpr":3},"savedAt":"2026-11-14"}')).toBeNull();
  });
  it('accepts the edges of the plausible range', () => {
    expect(parseSavedScale(json({ ...saved, pxPerMm: 2 }))?.pxPerMm).toBe(2);
    expect(parseSavedScale(json({ ...saved, pxPerMm: 12 }))?.pxPerMm).toBe(12);
  });
  it('returns null for a malformed signature', () => {
    for (const signature of [
      null, {}, { dims: [393, 852] }, { dims: [393], dpr: 3 }, { dims: [393, 852, 1], dpr: 3 },
      { dims: [852, 393], dpr: 3 }, { dims: [0, 852], dpr: 3 }, { dims: [393.5, 852], dpr: 3 },
      { dims: ['393', 852], dpr: 3 }, { dims: [393, 852], dpr: 0 }, { dims: [393, 852], dpr: '3' },
    ]) {
      expect(parseSavedScale(json({ ...saved, signature }))).toBeNull();
    }
  });
  it('returns null for a missing or invalid date', () => {
    expect(parseSavedScale(json({ ...saved, savedAt: 'yesterday' }))).toBeNull();
    expect(parseSavedScale(json({ ...saved, savedAt: 0 }))).toBeNull();
    const { savedAt: _s, ...noDate } = saved;
    expect(parseSavedScale(json(noDate))).toBeNull();
  });
});
