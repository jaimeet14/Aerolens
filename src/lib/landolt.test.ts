import { describe, expect, it } from 'vitest';
import { LINES } from './acuity';
import { GAP_AXIS, LANDOLT_GAP, LANDOLT_GRID, LANDOLT_STROKE, landoltDiameterMm, landoltGapMm, landoltPath } from './landolt';
import { ARCMIN, optotypeHeightMm, strokePhysicalPx } from './optics';
import { expectRuns, polygons, runs, winding, type Pt } from './svgPath.testutil';
import type { Dir } from './types';

const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
const P = Object.fromEntries(DIRS.map((d) => [d, polygons(landoltPath(d))])) as Record<Dir, Pt[][]>;
const ink = (d: Dir, p: Pt) => winding(P[d], p) !== 0;
const MID = 2.5;
const SQ6 = Math.sqrt(6); // where the gap edges meet the outer circle, from the centre along the gap axis

/** A point in the middle of the ring band (radius 2) on the side the gap should be, written out per direction. */
const GAP_POINT: Record<Dir, Pt> = { up: [2.5, 0.5], right: [4.5, 2.5], down: [2.5, 4.5], left: [0.5, 2.5] };

describe('Landolt C path', () => {
  it('uses only absolute M A L Z, as one closed outline', () => {
    for (const d of DIRS) {
      expect(landoltPath(d)).toMatch(/^[MALZ\d.\s-]+$/);
      expect(P[d]).toHaveLength(1);
    }
  });
  it.each(DIRS)('gap %s: unambiguous fill (evenodd and nonzero agree)', (d) => {
    for (let i = 0; i < 50; i++) for (let j = 0; j < 50; j++) {
      expect(Math.abs(winding(P[d], [0.1 * i + 0.0123, 0.1 * j + 0.0371]))).toBeLessThanOrEqual(1);
    }
  });
});

describe('Landolt C dimensions (ISO 8596)', () => {
  it('stroke = gap = outer diameter / 5', () => {
    expect(LANDOLT_GRID).toBe(5);
    expect(LANDOLT_STROKE).toBe(LANDOLT_GRID / 5);
    expect(LANDOLT_GAP).toBe(LANDOLT_STROKE);
  });
  it.each(DIRS)('gap %s: outer diameter 5 across the gap, inside the 5 x 5 box', (d) => {
    const pts = P[d].flat();
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    for (const c of [...xs, ...ys]) {
      expect(c).toBeGreaterThanOrEqual(-1e-9);
      expect(c).toBeLessThanOrEqual(LANDOLT_GRID + 1e-9);
    }
    // Across the gap the ring spans the full 5 units; along the gap axis the gap side stops at the gap corners.
    const [across, along] = GAP_AXIS[d][0] === 0 ? [xs, ys] : [ys, xs];
    expect(Math.min(...across)).toBeCloseTo(0, 3);
    expect(Math.max(...across)).toBeCloseTo(5, 3);
    const gapSide = { up: MID - SQ6, left: MID - SQ6, right: MID + SQ6, down: MID + SQ6 }[d];
    const farSide = { up: 5, left: 5, right: 0, down: 0 }[d];
    expect(gapSide < MID ? Math.min(...along) : Math.max(...along)).toBeCloseTo(gapSide, 6);
    expect(gapSide < MID ? Math.max(...along) : Math.min(...along)).toBeCloseTo(farSide, 3);
  });
  it.each(DIRS)('gap %s: ring 1 unit wide (inner diameter 3), closed opposite the gap', (d) => {
    const vertical = GAP_AXIS[d][0] === 0; // gap up or down
    // Through the centre, across the gap axis: both sides of the ring, each 1 wide.
    expectRuns(runs(P[d], vertical ? 'y' : 'x', MID), [[0, 1], [4, 5]]);
    // Through the centre, along the gap axis: only the side opposite the gap.
    const far: [number, number] = { up: [4, 5], left: [4, 5], right: [0, 1], down: [0, 1] }[d] as [number, number];
    expectRuns(runs(P[d], vertical ? 'x' : 'y', MID), [far]);
  });
  it.each(DIRS)('gap %s: gap exactly 1 unit (= stroke) wide all the way through the ring: parallel-sided, not a wedge', (d) => {
    const [ax, ay] = GAP_AXIS[d];
    // Lines across the gap axis at several distances from the centre, from just outside the inner corners
    // (sqrt2 = 1.414) to just inside the outer corners (sqrt6 = 2.449). A wedge would widen outwards.
    for (const t of [1.42, 1.45, 1.5, 1.75, 2, 2.25, 2.44]) {
      const r = ax !== 0 ? runs(P[d], 'x', MID + t * ax) : runs(P[d], 'y', MID + t * ay);
      expect(r).toHaveLength(2);
      expect(r[0][1]).toBeCloseTo(MID - LANDOLT_GAP / 2, 9);
      expect(r[1][0]).toBeCloseTo(MID + LANDOLT_GAP / 2, 9);
      expect(r[1][0] - r[0][1]).toBeCloseTo(LANDOLT_STROKE, 9);
    }
  });
});

describe('Landolt C orientations', () => {
  it.each(DIRS)('gap %s: the gap is on that side and the other three sides are inked', (d) => {
    expect(ink(d, GAP_POINT[d])).toBe(false);
    for (const o of DIRS.filter((x) => x !== d)) expect(ink(d, GAP_POINT[o])).toBe(true);
  });
  it('up is the top of the screen (smaller y), right is larger x', () => {
    expect(GAP_POINT.up[1]).toBeLessThan(MID);
    expect(ink('up', [2.5, 0.5])).toBe(false);
    expect(ink('up', [2.5, 4.5])).toBe(true);
    expect(ink('right', [4.5, 2.5])).toBe(false);
    expect(ink('right', [0.5, 2.5])).toBe(true);
  });
  it.each(DIRS)('gap %s is the gap-right C turned about the centre (same shape, only rotated)', (d) => {
    const [ax, ay] = GAP_AXIS[d];
    const [bx, by] = [-ay, ax];
    for (let i = 0; i < 50; i++) for (let j = 0; j < 50; j++) {
      const p: Pt = [0.1 * i + 0.0123, 0.1 * j + 0.0371];
      const u = (p[0] - MID) * ax + (p[1] - MID) * ay;
      const v = (p[0] - MID) * bx + (p[1] - MID) * by;
      expect(ink(d, p)).toBe(ink('right', [MID + u, MID + v]));
    }
  });
});

describe('Landolt C size', () => {
  it('outer diameter equals the Tumbling E height on every chart line, at any distance', () => {
    for (const l of LINES) for (const mm of [300, 500, 6000]) {
      expect(landoltDiameterMm(l, mm)).toBe(optotypeHeightMm(l, mm));
    }
  });
  it('gap = diameter / 5 = the E stroke, so the screen limit (strokePhysicalPx) is the same', () => {
    for (const l of LINES) {
      expect(landoltGapMm(l, 500)).toBeCloseTo(optotypeHeightMm(l, 500) / 5, 12);
      for (const [pxPerMm, dpr] of [[5.42, 2], [6, 3], [3.78, 1]]) {
        expect(landoltGapMm(l, 500) * pxPerMm * dpr).toBeCloseTo(strokePhysicalPx(l, 500, pxPerMm, dpr), 9);
      }
    }
  });
  it('6/6 at 50 cm: diameter 0.727 mm, gap 0.145 mm, and the gap subtends 1 arc-minute x 10^logMAR', () => {
    expect(landoltDiameterMm(0, 500)).toBeCloseTo(0.72722, 4);
    expect(landoltGapMm(0, 500)).toBeCloseTo(0.14544, 4);
    for (const l of LINES) {
      const gapArcmin = (2 * Math.atan(landoltGapMm(l, 500) / 2 / 500)) / ARCMIN;
      expect(gapArcmin / Math.pow(10, l)).toBeCloseTo(1, 4);
    }
  });
});
