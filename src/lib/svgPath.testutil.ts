/*
 * Test-only helpers shared by sloan.test.ts and landolt.test.ts: flatten optotype path data into polygons, then
 * measure it (winding number, ink runs along a line). Not imported by the app, and not a *.test.ts file, so Vitest
 * does not run it on its own.
 */
import { expect } from 'vitest';

export type Pt = [number, number];

/** Flattens absolute M/L/H/V/A/Z path data (circular arcs, no rotation) into closed polygons. */
export function polygons(d: string): Pt[][] {
  const tok = d.match(/[MLHVAZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const polys: Pt[][] = [];
  let cur: Pt[] = [];
  let p: Pt = [0, 0];
  let cmd = '';
  let i = 0;
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/^[MLHVAZ]$/.test(tok[i])) cmd = tok[i++];
    if (cmd === 'M') { if (cur.length) polys.push(cur); p = [num(), num()]; cur = [p]; }
    else if (cmd === 'L') { p = [num(), num()]; cur.push(p); }
    else if (cmd === 'H') { p = [num(), p[1]]; cur.push(p); }
    else if (cmd === 'V') { p = [p[0], num()]; cur.push(p); }
    else if (cmd === 'A') {
      const rx = num(), ry = num(), rot = num(), large = num(), sweep = num();
      const q: Pt = [num(), num()];
      if (rx !== ry || rot !== 0) throw new Error('only circular, unrotated arcs are supported');
      cur.push(...arc(p, q, rx, large, sweep));
      p = q;
    } else if (cmd === 'Z') { polys.push(cur); cur = []; cmd = ''; }
    else throw new Error(`unsupported token ${tok[i]}`);
  }
  if (cur.length) polys.push(cur);
  return polys;
}

/** SVG endpoint arc -> centre parameterisation (SVG 1.1 F.6.5), sampled at n points after the start. */
function arc([x1, y1]: Pt, [x2, y2]: Pt, r: number, large: number, sweep: number, n = 360): Pt[] {
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const d2 = dx * dx + dy * dy;
  const rr = Math.max(r, Math.sqrt(d2));
  const k = (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, (rr * rr - d2) / d2));
  const cx = k * dy + (x1 + x2) / 2, cy = -k * dx + (y1 + y2) / 2;
  const a1 = Math.atan2(y1 - cy, x1 - cx);
  let da = Math.atan2(y2 - cy, x2 - cx) - a1;
  if (sweep && da < 0) da += 2 * Math.PI;
  if (!sweep && da > 0) da -= 2 * Math.PI;
  return Array.from({ length: n }, (_, j) => {
    const a = a1 + (da * (j + 1)) / n;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)] as Pt;
  });
}

const edges = (polys: Pt[][]) => polys.flatMap((poly) => poly.map((a, i) => [a, poly[(i + 1) % poly.length]] as const));

/** Winding number of a point (sign depends on direction; |w| > 1 means overlapping or same-direction holes). */
export function winding(polys: Pt[][], [x, y]: Pt): number {
  let w = 0;
  for (const [[x1, y1], [x2, y2]] of edges(polys)) {
    const left = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1);
    if (y1 <= y && y2 > y && left > 0) w++;
    else if (y1 > y && y2 <= y && left < 0) w--;
  }
  return w;
}

/** Ink runs along the line y = c (axis 'y') or x = c (axis 'x'). */
export function runs(polys: Pt[][], axis: 'x' | 'y', c: number): [number, number][] {
  const [u, v] = axis === 'y' ? [0, 1] : [1, 0]; // u: coordinate along the line, v: fixed coordinate
  const xs: number[] = [];
  for (const [a, b] of edges(polys)) {
    if ((a[v] <= c) !== (b[v] <= c)) xs.push(a[u] + ((c - a[v]) * (b[u] - a[u])) / (b[v] - a[v]));
  }
  xs.sort((m, n) => m - n);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}

export function expectRuns(actual: [number, number][], expected: [number, number][]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach(([a, b], i) => {
    expect(a).toBeCloseTo(expected[i][0], 3);
    expect(b).toBeCloseTo(expected[i][1], 3);
  });
}
