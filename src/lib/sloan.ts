/**
 * Sloan letters (Sloan 1959; NAS-NRC 1980; the ETDRS chart set): ten sans-serif letters of roughly equal legibility.
 * Each is drawn on a 5x5 unit grid (width = height = 5 units, stroke = 1 unit), the same design rule as the Tumbling E,
 * so optotypeHeightMm, strokePhysicalPx and MIN_STROKE_PX apply unchanged.
 */
export const SLOAN_LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] as const;
export type Letter = (typeof SLOAN_LETTERS)[number];

/** The letter box is 5 x 5 units; SVG viewBox "0 0 5 5". */
export const SLOAN_GRID = 5;

// Irrational coordinates are computed, not rounded, so the outlines close exactly.
const SQ2 = Math.SQRT2;
/** C: x where the ring meets the gap edges y = 2 and y = 3 (outer r 2.5, inner r 1.5, centre 2.5,2.5). */
const C_OUT = 2.5 + Math.sqrt(6);
const C_IN = 2.5 + SQ2;
/** V: strokes run (0,0)->(2,5); horizontal width for a perpendicular width of 1 is sqrt(29)/5. */
const V_W = Math.sqrt(29) / 5;
const V_Y = (5 * (2.5 - V_W)) / 2; // where the inner edges meet
/** K: the leg's lower edge (y = x + sqrt2) meets the arm's lower edge ((5,0) -> (1,3)) at t = (5 + sqrt2) / 7. */
const K_T = (5 + SQ2) / 7;

/**
 * Filled outlines in viewBox 0 0 5 5, absolute M/L/H/V/A/Z only. Each letter is one non-overlapping outline,
 * plus holes wound the opposite way, so evenodd and nonzero fill agree.
 *
 * C  ring (outer d 5, inner d 3), 1-unit gap on the right (y 2..3)
 * D  stem x 0..1, bars to x 2.5, semicircular bowl centred (2.5, 2.5)
 * H  stems x 0..1 and 4..5, crossbar y 2..3
 * K  stem; arm from (5,0) at slope 3:4 (horizontal width 5/3); leg at 45 deg (horizontal width sqrt2) from the arm to (5,5)
 * N  stems; diagonal of horizontal width 1.25 at slope 4:3 (perpendicular width 1)
 * O  ring, outer d 5, inner d 3
 * R  stem; bowl y 0..3 (bars y 0..1 and 2..3, semicircle centred (3.5, 1.5)); leg at 45 deg to (5,5)
 * S  bars y 0..1, 2..3, 4..5 joined by semicircles (outer r 1.5) on the left at the top and on the right at the bottom
 * V  two strokes of perpendicular width 1, flat 1-unit base (x 2..3)
 * Z  bars y 0..1 and 4..5; diagonal of horizontal width 1.25 at slope 4:3
 */
export const SLOAN_PATHS: Record<Letter, string> = {
  C: `M${C_OUT} 2 A2.5 2.5 0 1 0 ${C_OUT} 3 H${C_IN} A1.5 1.5 0 1 1 ${C_IN} 2 Z`,
  D: 'M0 0 H2.5 A2.5 2.5 0 0 1 2.5 5 H0 Z M1 1 V4 H2.5 A1.5 1.5 0 0 0 2.5 1 Z',
  H: 'M0 0 H1 V2 H4 V0 H5 V5 H4 V3 H1 V5 H0 Z',
  K: `M0 0 H1 V1.75 L${10 / 3} 0 H5 L${15 / 7} ${15 / 7} L5 5 H${5 - SQ2} L${5 - 4 * K_T} ${3 * K_T} L1 3 V5 H0 Z`,
  N: `M0 0 H1.25 L4 ${11 / 3} V0 H5 V5 H3.75 L1 ${4 / 3} V5 H0 Z`,
  O: 'M2.5 0 A2.5 2.5 0 0 1 2.5 5 A2.5 2.5 0 0 1 2.5 0 Z M2.5 1 A1.5 1.5 0 0 0 2.5 4 A1.5 1.5 0 0 0 2.5 1 Z',
  R: `M0 0 H3.5 A1.5 1.5 0 0 1 3.5 3 H3 L5 5 H${5 - SQ2} L${3 - SQ2} 3 H1 V5 H0 Z M1 1 V2 H3.5 A0.5 0.5 0 0 0 3.5 1 Z`,
  S: 'M5 0 H1.5 A1.5 1.5 0 0 0 1.5 3 H3.5 A0.5 0.5 0 0 1 3.5 4 H0 V5 H3.5 A1.5 1.5 0 0 0 3.5 2 H1.5 A0.5 0.5 0 0 1 1.5 1 H5 Z',
  V: `M0 0 H${V_W} L2.5 ${V_Y} L${5 - V_W} 0 H5 L3 5 H2 Z`,
  Z: 'M0 0 H5 V1 H4.25 L2 4 H5 V5 H0 V4 H0.75 L3 1 H0 Z',
};

/**
 * Next letter to show: uniformly random, never the current one (so a repeat never looks like a stuck screen).
 * `rand` returns [0, 1); inject it in tests.
 */
export function nextLetter(current: Letter | null, rand: () => number = Math.random): Letter {
  const pool = current === null ? SLOAN_LETTERS : SLOAN_LETTERS.filter((l) => l !== current);
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}
