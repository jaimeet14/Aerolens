import type { Lang } from './i18n';
import { strokePhysicalPx } from './optics';
import type { Chart, Dir } from './types';

/** Chart lines from coarse (6/60) to fine (6/4.8), as logMAR. */
export const LINES = [1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.1] as const;
export const SNELLEN = ['6/60', '6/38', '6/24', '6/19', '6/15', '6/12', '6/9.5', '6/7.5', '6/6', '6/4.8'] as const;

export const START_IDX = 3; // 6/19 (logMAR 0.5)
export const PER_LINE = 5; // optotypes per line
export const PASS_AT = 3; // correct answers needed to pass a line
/** A Tumbling E stroke thinner than this many device pixels is not drawn reliably. */
export const MIN_STROKE_PX = 1.5;

export interface AcuityState {
  idx: number;
  correct: number;
  wrong: number;
  mode: 'start' | 'finer' | 'coarser';
  bestPassed: number | null;
  done: boolean;
  /** Index of the final line, or null if even the coarsest line failed. */
  resultIdx: number | null;
  /** The screen could not draw a finer line than the one reached. */
  limited: boolean;
}

export function initAcuity(maxIdx: number): AcuityState {
  return {
    idx: Math.max(0, Math.min(START_IDX, maxIdx)),
    correct: 0,
    wrong: 0,
    mode: 'start',
    bestPassed: null,
    done: false,
    resultIdx: null,
    limited: false,
  };
}

/** Index of the finest line the screen can draw at this distance. -1 if none. */
export function finestResolvableIdx(strokePxForLine: (logMAR: number) => number): number {
  let best = -1;
  LINES.forEach((l, i) => {
    if (strokePxForLine(l) >= MIN_STROKE_PX) best = i;
  });
  return best;
}

export interface ScreenLimit {
  /** Index in LINES of the finest line the screen can draw; -1 if it cannot draw even 6/60. */
  idx: number;
  /** Snellen label of that line; null when no line can be drawn. */
  snellen: string | null;
  /** The screen can draw 6/6 (or finer). When false, acuity results will stop at a coarser line. */
  reaches66: boolean;
}

/**
 * The finest chart line this screen can draw at `distanceMm`, from the card-step scale (CSS px per mm)
 * and the devicePixelRatio. The acuity staircase stops at this line, so it is also shown as a warning
 * before the test when it is coarser than 6/6.
 */
export function screenLimit(pxPerMm: number, dpr: number, distanceMm: number): ScreenLimit {
  const idx = finestResolvableIdx((l) => strokePhysicalPx(l, distanceMm, pxPerMm, dpr));
  return { idx, snellen: idx >= 0 ? SNELLEN[idx] : null, reaches66: idx >= LINES.indexOf(0.0) };
}

/** The four answer directions of the Tumbling E (opening) and the Landolt C (gap). */
export const DIRS: readonly Dir[] = ['up', 'right', 'down', 'left'];

/**
 * Next direction for the E or the C: uniformly random, never the current one (so a repeat never looks like a stuck
 * screen); any of the four when there is none yet. `rand` returns [0, 1); inject it in tests.
 */
export function nextDir(current: Dir | null, rand: () => number = Math.random): Dir {
  const pool = current === null ? DIRS : DIRS.filter((d) => d !== current);
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

/**
 * The chart a session gets without the chart question, from the session language (chosen on the welcome screen):
 * Hindi -> Landolt C, because Sloan letters are English letters. null (English, or no language chosen) -> ask on
 * the first eye as before.
 */
export function presetChart(lang: Lang | null): Chart | null {
  return lang === 'hi' ? 'C' : null;
}

/**
 * Bracketing staircase. Start at 6/19. Pass -> go finer until a line fails.
 * Fail -> go coarser until a line passes. A line passes at 3 correct of 5, fails at 3 wrong.
 */
export function answer(s: AcuityState, ok: boolean, maxIdx: number): AcuityState {
  if (s.done) return s;
  const correct = s.correct + (ok ? 1 : 0);
  const wrong = s.wrong + (ok ? 0 : 1);
  const passed = correct >= PASS_AT;
  const failed = wrong > PER_LINE - PASS_AT;
  if (!passed && !failed) return { ...s, correct, wrong };

  const fresh = { ...s, correct: 0, wrong: 0 };
  if (passed) {
    const best = Math.max(s.bestPassed ?? -1, s.idx);
    if (s.mode === 'coarser') return { ...fresh, bestPassed: best, done: true, resultIdx: s.idx };
    if (s.idx >= maxIdx) return { ...fresh, bestPassed: best, done: true, resultIdx: s.idx, limited: true };
    return { ...fresh, mode: 'finer', bestPassed: best, idx: s.idx + 1 };
  }
  if (s.mode === 'finer') return { ...fresh, done: true, resultIdx: s.bestPassed };
  if (s.idx === 0) return { ...fresh, done: true, resultIdx: null };
  return { ...fresh, mode: 'coarser', idx: s.idx - 1 };
}
