import { describe, expect, it } from 'vitest';
import { answer, DIRS, finestResolvableIdx, initAcuity, LINES, nextDir, presetChart, screenLimit, START_IDX } from './acuity';
import { strokePhysicalPx } from './optics';
import type { Dir } from './types';

const MAX = LINES.length - 1;
/** Feed a script of answers; return the final state. */
function run(script: boolean[], maxIdx = MAX) {
  let s = initAcuity(maxIdx);
  for (const ok of script) s = answer(s, ok, maxIdx);
  return s;
}
const T = true, F = false;

describe('acuity staircase', () => {
  it('starts at 6/19', () => {
    expect(initAcuity(MAX).idx).toBe(START_IDX);
  });
  it('pass at 3 correct, fail at 3 wrong', () => {
    const s = run([T, T, T]);
    expect(s.idx).toBe(START_IDX + 1);
    expect(s.mode).toBe('finer');
  });
  it('goes finer until a line fails; result is the last passed line', () => {
    // pass 0.5, pass 0.4, fail 0.3
    const s = run([T, T, T, T, T, T, F, F, F]);
    expect(s.done).toBe(true);
    expect(LINES[s.resultIdx!]).toBe(0.4);
  });
  it('goes coarser after a failed start, stops at first pass', () => {
    // fail 0.5, pass 0.6
    const s = run([F, F, F, T, T, T]);
    expect(s.done).toBe(true);
    expect(LINES[s.resultIdx!]).toBe(0.6);
  });
  it('mixed answers: 3 correct of 5 passes', () => {
    const s = run([T, F, T, F, T]); // passes on 3rd correct at 5th answer
    expect(s.mode).toBe('finer');
  });
  it('fails every line down to 6/60 -> null', () => {
    const s = run(new Array(3 * 5).fill(F));
    expect(s.done).toBe(true);
    expect(s.resultIdx).toBeNull();
  });
  it('reaches the screen limit and flags it', () => {
    const maxIdx = 5; // 0.3 is the finest drawable line
    const s = run([T, T, T, T, T, T, T, T, T], maxIdx);
    expect(s.done).toBe(true);
    expect(s.limited).toBe(true);
    expect(LINES[s.resultIdx!]).toBe(0.3);
  });
  it('ignores answers after done', () => {
    const s = run([T, T, T, T, T, T, F, F, F, T, T, T]);
    expect(LINES[s.resultIdx!]).toBe(0.4);
  });
});

describe('screen resolution limit', () => {
  it('a 460-ppi phone at 50 cm can draw every line', () => {
    const idx = finestResolvableIdx((l) => strokePhysicalPx(l, 500, 6.0, 3));
    expect(idx).toBe(MAX);
  });
  it('a 96-ppi laptop at 50 cm cannot draw 6/6', () => {
    const idx = finestResolvableIdx((l) => strokePhysicalPx(l, 500, 3.78, 1));
    expect(idx).toBeLessThan(LINES.indexOf(0.0));
  });
});

describe('screenLimit (pre-test warning)', () => {
  it('agrees with finestResolvableIdx + strokePhysicalPx', () => {
    for (const [pxPerMm, dpr] of [[3.78, 1], [5.42, 2], [6, 3], [7, 1], [0.5, 1]]) {
      expect(screenLimit(pxPerMm, dpr, 500).idx).toBe(finestResolvableIdx((l) => strokePhysicalPx(l, 500, pxPerMm, dpr)));
    }
  });
  it('a 5.42 px/mm dpr-2 phone (validation V1) reaches 6/6 but not 6/4.8: no warning', () => {
    // 6/6 stroke 0.145 mm x 10.84 = 1.58 device px; 6/4.8 = 1.25 px, under the 1.5 px minimum
    expect(screenLimit(5.42, 2, 500)).toEqual({ idx: LINES.indexOf(0.0), snellen: '6/6', reaches66: true });
  });
  it('a 460-ppi phone reaches 6/4.8', () => {
    expect(screenLimit(6, 3, 500)).toEqual({ idx: LINES.length - 1, snellen: '6/4.8', reaches66: true });
  });
  it('a coarse dpr-1 laptop stops above 6/6, so the warning shows', () => {
    expect(screenLimit(7, 1, 500)).toEqual({ idx: LINES.indexOf(0.2), snellen: '6/9.5', reaches66: false });
    expect(screenLimit(3.78, 1, 500)).toEqual({ idx: LINES.indexOf(0.5), snellen: '6/19', reaches66: false });
  });
  it('a screen that cannot draw even 6/60 gives idx -1 and no label', () => {
    expect(screenLimit(0.5, 1, 500)).toEqual({ idx: -1, snellen: null, reaches66: false });
  });
});

describe('nextDir (Tumbling E and Landolt C)', () => {
  it('has the four directions, all distinct', () => {
    expect([...DIRS].sort()).toEqual(['down', 'left', 'right', 'up']);
  });
  it('never repeats the current direction, for any random value (including 1)', () => {
    for (const cur of DIRS) {
      for (let k = 0; k <= 100; k++) {
        const n = nextDir(cur, () => k / 100);
        expect(n).not.toBe(cur);
        expect(DIRS).toContain(n);
      }
    }
  });
  it('reaches each of the other 3 directions as the random value varies', () => {
    for (const cur of DIRS) {
      const seen = new Set(Array.from({ length: 30 }, (_, k) => nextDir(cur, () => (k + 0.5) / 30)));
      expect(seen.size).toBe(3);
      expect(seen.has(cur)).toBe(false);
    }
  });
  it('with no current direction, any of the 4 can come first', () => {
    expect(new Set(Array.from({ length: 40 }, (_, k) => nextDir(null, () => (k + 0.5) / 40))).size).toBe(4);
  });
  it('a chained sequence from a seeded source covers all 4 with no immediate repeat', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let cur = nextDir(null, rand);
    const seen = new Set<Dir>([cur]);
    for (let i = 0; i < 200; i++) {
      const n = nextDir(cur, rand);
      expect(n).not.toBe(cur);
      seen.add(n);
      cur = n;
    }
    expect(seen.size).toBe(4);
  });
});

describe('presetChart', () => {
  it('gives the Landolt C to a Hindi-interview session, so the chart question is skipped', () => {
    expect(presetChart('hi')).toBe('C');
  });
  it('asks as before in English or when no language was chosen', () => {
    expect(presetChart('en')).toBeNull();
    expect(presetChart(null)).toBeNull();
  });
});
