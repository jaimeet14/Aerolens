/**
 * Landolt C (ISO 8596), the reference optotype for acuity: a ring whose outer diameter is 5 strokes, inner diameter
 * 3 strokes, with one gap as wide as the stroke. The gap is parallel-sided: its two edges are parallel to the
 * direction it points (a rectangular cut, not a wedge towards the centre), so it is exactly 1 stroke wide all the way
 * through the ring.
 *
 * Drawn on the same 5 x 5 unit box as the Tumbling E and the Sloan letters (stroke = gap = 1 unit), so the size rule
 * (optotypeHeightMm), the stroke in device pixels (strokePhysicalPx), MIN_STROKE_PX and screenLimit apply unchanged:
 * the gap subtends 1 arc-minute x 10^logMAR, like the E's stroke.
 */
import { optotypeHeightMm } from './optics';
import type { Dir } from './types';

/** The ring's box is 5 x 5 units; SVG viewBox "0 0 5 5". */
export const LANDOLT_GRID = 5;
/** Ring thickness = outer diameter / 5. */
export const LANDOLT_STROKE = LANDOLT_GRID / 5;
/** Gap width = stroke (ISO 8596). */
export const LANDOLT_GAP = LANDOLT_STROKE;

const MID = LANDOLT_GRID / 2; // centre of the box (both axes)
const R_OUT = LANDOLT_GRID / 2; // 2.5
const R_IN = R_OUT - LANDOLT_STROKE; // 1.5
const HALF_GAP = LANDOLT_GAP / 2;
// Along the gap's direction, where its straight edges (HALF_GAP either side of the axis) meet each circle.
// Computed, not rounded, so the outline closes exactly: sqrt(6) and sqrt(2) for the 5-unit ring.
const OUT_AT = Math.sqrt(R_OUT ** 2 - HALF_GAP ** 2);
const IN_AT = Math.sqrt(R_IN ** 2 - HALF_GAP ** 2);

/** Unit vector from the centre towards the gap, in SVG coordinates (y grows downwards). */
export const GAP_AXIS: Record<Dir, readonly [number, number]> = { right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] };

/**
 * Filled outline of the C with its gap pointing `dir`, in viewBox 0 0 5 5 (absolute M/A/L/Z only, one closed
 * outline, so evenodd and nonzero fill agree). Each orientation is the gap-right C turned about the centre by a
 * multiple of 90 degrees: a point at u along the gap axis and v across it maps to centre + u * axis + v * across,
 * where `across` is the axis turned +90 degrees on screen. That is a rotation, so the arc sweep flags stay valid.
 *
 * Gap right: from the top gap corner on the outer circle, the large outer arc runs anticlockwise round the left to
 * the bottom gap corner, a straight gap edge runs in to the inner circle, the large inner arc runs back, and the
 * other straight gap edge closes the outline. Both gap edges are parallel to the axis.
 */
export function landoltPath(dir: Dir): string {
  const [ax, ay] = GAP_AXIS[dir];
  const [bx, by] = [-ay, ax]; // across the gap
  const pt = (u: number, v: number) => `${MID + u * ax + v * bx} ${MID + u * ay + v * by}`;
  return `M${pt(OUT_AT, -HALF_GAP)} A${R_OUT} ${R_OUT} 0 1 0 ${pt(OUT_AT, HALF_GAP)} `
    + `L${pt(IN_AT, HALF_GAP)} A${R_IN} ${R_IN} 0 1 1 ${pt(IN_AT, -HALF_GAP)} Z`;
}

/**
 * Outer diameter (mm) of the C at this logMAR and viewing distance: exactly the Tumbling E's height
 * (optics.optotypeHeightMm, 5 arc-minutes x 10^logMAR), so both charts show the same size on every line.
 */
export function landoltDiameterMm(logMAR: number, distanceMm: number): number {
  return optotypeHeightMm(logMAR, distanceMm);
}

/** Gap width (mm) = stroke = diameter / 5, the detail the eye has to resolve. */
export function landoltGapMm(logMAR: number, distanceMm: number): number {
  return (landoltDiameterMm(logMAR, distanceMm) * LANDOLT_GAP) / LANDOLT_GRID;
}
