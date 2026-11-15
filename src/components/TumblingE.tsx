import { useEffect, useRef } from 'react';
import type { Dir } from '../lib/types';

const ANGLE: Record<Dir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: (3 * Math.PI) / 2 };

/** Draws a Tumbling E on a 5x5 grid. The open side (prongs) points in `dir`. sizeCss is the physical height in CSS px. */
export function TumblingE({ dir, sizeCss, color = '#000', label }: { dir: Dir; sizeCss: number; color?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.max(5, Math.round(sizeCss * dpr));
    c.width = px;
    c.height = px;
    c.style.width = `${px / dpr}px`;
    c.style.height = `${px / dpr}px`;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, px, px);
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(px / 2, px / 2);
    ctx.rotate(ANGLE[dir]);
    ctx.translate(-px / 2, -px / 2);
    const u = px / 5;
    ctx.fillRect(0, 0, u, px); // spine
    for (const r of [0, 2, 4]) ctx.fillRect(0, r * u, px, u); // three prongs
    ctx.restore();
  }, [dir, sizeCss, color]);
  return <canvas ref={ref} aria-label={label ?? `E opening ${dir}`} />;
}
