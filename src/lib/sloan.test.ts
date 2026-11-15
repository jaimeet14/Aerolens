import { describe, expect, it } from 'vitest';
import { nextLetter, SLOAN_GRID, SLOAN_LETTERS, SLOAN_PATHS, type Letter } from './sloan';
import { expectRuns, polygons, runs, winding, type Pt } from './svgPath.testutil';

const P = Object.fromEntries(SLOAN_LETTERS.map((l) => [l, polygons(SLOAN_PATHS[l])])) as Record<Letter, Pt[][]>;

describe('Sloan letter set', () => {
  it('has the 10 standard letters, all distinct', () => {
    expect(SLOAN_LETTERS).toHaveLength(10);
    expect(new Set(SLOAN_LETTERS).size).toBe(10);
    expect([...SLOAN_LETTERS].sort().join('')).toBe('CDHKNORSVZ');
  });
  it('has a path for every letter, using only absolute M L H V A Z', () => {
    for (const l of SLOAN_LETTERS) expect(SLOAN_PATHS[l]).toMatch(/^[MLHVAZ\d.\s-]+$/);
    expect(Object.keys(SLOAN_PATHS).sort()).toEqual([...SLOAN_LETTERS].sort());
  });
});

describe('Sloan geometry (5 x 5 box, 1-unit strokes)', () => {
  // The C's rightmost point falls in its gap, so its right edge is the gap terminals at 2.5 + sqrt6 (as in a Landolt C).
  const right = (l: Letter) => (l === 'C' ? 2.5 + Math.sqrt(6) : SLOAN_GRID);
  it.each(SLOAN_LETTERS)('%s stays inside the 5 x 5 box and fills it', (l) => {
    const pts = P[l].flat();
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    for (const c of [...xs, ...ys]) {
      expect(c).toBeGreaterThanOrEqual(-1e-9);
      expect(c).toBeLessThanOrEqual(SLOAN_GRID + 1e-9);
    }
    expect(Math.min(...xs)).toBeCloseTo(0, 3);
    expect(Math.max(...xs)).toBeCloseTo(right(l), 3);
    expect(Math.min(...ys)).toBeCloseTo(0, 3);
    expect(Math.max(...ys)).toBeCloseTo(SLOAN_GRID, 3);
  });

  it.each(SLOAN_LETTERS)('%s has an unambiguous fill (evenodd and nonzero agree)', (l) => {
    for (let i = 0; i < 50; i++) for (let j = 0; j < 50; j++) {
      const w = winding(P[l], [0.1 * i + 0.0123, 0.1 * j + 0.0371]);
      expect(Math.abs(w)).toBeLessThanOrEqual(1);
    }
  });

  // Cross-sections through each letter: straight strokes are 1 wide; diagonals show their horizontal width
  // (perpendicular width 1 -> 1.25 at slope 4:3, 5/3 at 3:4, sqrt2 at 45 deg, sqrt29/5 for the V).
  const r2 = 5 - Math.SQRT2 - 0.5; // 45-degree leg at y = 4.5
  it('C: ring of width 1 with a 1-unit gap on the right', () => {
    expectRuns(runs(P.C, 'y', 2.5), [[0, 1]]);
    expectRuns(runs(P.C, 'x', 4.5), [[1, 2], [3, 4]]);
    expectRuns(runs(P.C, 'x', 2.5), [[0, 1], [4, 5]]);
  });
  it('D: stem, bars and bowl are 1 wide', () => {
    expectRuns(runs(P.D, 'y', 2.5), [[0, 1], [4, 5]]);
    expectRuns(runs(P.D, 'x', 2), [[0, 1], [4, 5]]);
  });
  it('H: stems and crossbar are 1 wide', () => {
    expectRuns(runs(P.H, 'y', 1), [[0, 1], [4, 5]]);
    expectRuns(runs(P.H, 'x', 2.5), [[2, 3]]);
  });
  it('K: stem, arm and leg', () => {
    expectRuns(runs(P.K, 'y', 0.5), [[0, 1], [10 / 3 - 2 / 3, 5 - 2 / 3]]);
    expectRuns(runs(P.K, 'y', 4.5), [[0, 1], [r2, 4.5]]);
  });
  it('N: stems and a diagonal of perpendicular width 1', () => {
    expectRuns(runs(P.N, 'y', 2.5), [[0, 1], [1.875, 3.125], [4, 5]]);
  });
  it('O: ring of width 1, outer diameter 5', () => {
    expectRuns(runs(P.O, 'y', 2.5), [[0, 1], [4, 5]]);
    expectRuns(runs(P.O, 'x', 2.5), [[0, 1], [4, 5]]);
  });
  it('R: stem, bowl of width 1, 45-degree leg', () => {
    expectRuns(runs(P.R, 'y', 1.5), [[0, 1], [4, 5]]);
    expectRuns(runs(P.R, 'x', 1.5), [[0, 1], [2, 3]]);
    expectRuns(runs(P.R, 'y', 4.5), [[0, 1], [r2, 4.5]]);
  });
  it('S: three bars, open top-right and bottom-left', () => {
    expectRuns(runs(P.S, 'x', 2.5), [[0, 1], [2, 3], [4, 5]]);
    expectRuns(runs(P.S, 'y', 1.5), [[0, 1]]);
    expectRuns(runs(P.S, 'y', 3.5), [[4, 5]]);
  });
  it('V: two strokes of perpendicular width 1 meeting on a 1-unit base', () => {
    const w = Math.sqrt(29) / 5;
    expectRuns(runs(P.V, 'y', 1), [[0.4, 0.4 + w], [4.6 - w, 4.6]]);
    expectRuns(runs(P.V, 'y', 5 - 1e-9), [[2, 3]]);
  });
  it('Z: bars and a diagonal of perpendicular width 1', () => {
    expectRuns(runs(P.Z, 'x', 2.5), [[0, 1], [5 / 3, 10 / 3], [4, 5]]);
    expectRuns(runs(P.Z, 'y', 2.5), [[1.875, 3.125]]);
  });
});

describe('nextLetter', () => {
  it('never repeats the current letter, for any random value (including 1)', () => {
    for (const cur of SLOAN_LETTERS) {
      for (let k = 0; k <= 100; k++) {
        const n = nextLetter(cur, () => k / 100);
        expect(n).not.toBe(cur);
        expect(SLOAN_LETTERS).toContain(n);
      }
    }
  });
  it('reaches each of the other 9 letters as the random value varies', () => {
    for (const cur of SLOAN_LETTERS) {
      const seen = new Set(Array.from({ length: 90 }, (_, k) => nextLetter(cur, () => (k + 0.5) / 90)));
      expect(seen.size).toBe(9);
      expect(seen.has(cur)).toBe(false);
    }
  });
  it('with no current letter, any of the 10 can come first', () => {
    const seen = new Set(Array.from({ length: 100 }, (_, k) => nextLetter(null, () => (k + 0.5) / 100)));
    expect(seen.size).toBe(10);
  });
  it('a chained sequence from a seeded source covers all 10 letters with no immediate repeat', () => {
    let seed = 42;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let cur = nextLetter(null, rand);
    const seen = new Set<Letter>([cur]);
    for (let i = 0; i < 300; i++) {
      const n = nextLetter(cur, rand);
      expect(n).not.toBe(cur);
      seen.add(n);
      cur = n;
    }
    expect(seen.size).toBe(10);
  });
});
