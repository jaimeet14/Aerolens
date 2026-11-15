import { SLOAN_GRID, SLOAN_PATHS, type Letter } from '../lib/sloan';

/** Draws one Sloan letter on its 5x5 grid. sizeCss is the physical height (= width) in CSS px, like TumblingE. */
export function SloanLetter({ letter, sizeCss, color = '#000' }: { letter: Letter; sizeCss: number; color?: string }) {
  return (
    <svg width={sizeCss} height={sizeCss} viewBox={`0 0 ${SLOAN_GRID} ${SLOAN_GRID}`} role="img" aria-label={`Letter ${letter}`}
      shapeRendering="geometricPrecision" style={{ display: 'block', flexShrink: 0 }}>
      <path d={SLOAN_PATHS[letter]} fill={color} fillRule="evenodd" />
    </svg>
  );
}
