import { LANDOLT_GRID, landoltPath } from '../lib/landolt';
import type { Dir } from '../lib/types';

/**
 * Draws a Landolt C (lib/landolt.ts) on its 5x5 grid, gap pointing `dir`. sizeCss is the outer diameter in CSS px,
 * like TumblingE's height. The stimulus colour is fixed (black by default), never a theme token.
 */
export function LandoltC({ dir, sizeCss, color = '#000', label }: { dir: Dir; sizeCss: number; color?: string; label?: string }) {
  return (
    <svg width={sizeCss} height={sizeCss} viewBox={`0 0 ${LANDOLT_GRID} ${LANDOLT_GRID}`} role="img" aria-label={label ?? `Ring with the gap ${dir}`}
      shapeRendering="geometricPrecision" style={{ display: 'block', flexShrink: 0 }}>
      <path d={landoltPath(dir)} fill={color} fillRule="evenodd" />
    </svg>
  );
}
