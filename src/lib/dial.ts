import { MIN_STROKE_PX } from './acuity';
import { fmt, type Lang, type Text } from './i18n';
import { optotypeHeightMm } from './optics';
import type { DialAnswer, EyeResult } from './types';

/** Dial line width (mm) used before export v5; now the widest line the dial draws. */
export const DIAL_MAX_LINE_MM = 0.7;
/** The dial line is sized from the optotype this many logMAR coarser than the eye's acuity (two chart lines). */
export const DIAL_LINE_OFFSET_LOGMAR = 0.2;

/**
 * Width (mm) of the astigmatism dial lines for one eye. The SVG is drawn in mm, so this is the
 * strokeWidth; on screen it is mm x pxPerMm CSS px, x dpr device px.
 *
 * Why thinner lines: with astigmatism, lines along one meridian are blurred less than the others and
 * look darker. Blur takes far more contrast from fine detail than from coarse detail, so the old 0.7 mm
 * line (4.8 arc-min at 50 cm, the stroke of a ~6/29 letter) stays black in every direction and about
 * 1 D of astigmatism can go unnoticed (validation V1: left eye -1.00 D cyl read "Even").
 * A line closer to the eye's own resolution limit makes the difference between directions easier to see.
 *
 * Rule (a heuristic, provisional until reviewed with an optometrist): the stroke width of the optotype two
 * lines coarser than the eye's measured acuity at the test distance, optotypeHeightMm(logMAR + 0.2) / 5,
 * the same two-line margin the duochrome letters use, so the lines stay clearly visible when in focus.
 * Clamped to [the thinnest line the screen draws reliably (MIN_STROKE_PX device px), 0.7 mm].
 * Unknown acuity (null, which includes "worse than 6/60") keeps the old 0.7 mm.
 * This does not replace fogging: at 50 cm accommodation can still hide low astigmatism.
 */
export function dialLineWidthMm(logMAR: number | null, targetMm: number, pxPerMm: number, dpr: number): number {
  if (logMAR === null) return DIAL_MAX_LINE_MM;
  const minMm = MIN_STROKE_PX / (pxPerMm * dpr);
  const mm = optotypeHeightMm(logMAR + DIAL_LINE_OFFSET_LOGMAR, targetMm) / 5;
  // min() last, so a screen too coarse for even a 0.7 mm line still never gets a thicker one.
  return Math.min(DIAL_MAX_LINE_MM, Math.max(minMm, mm));
}

/*
 * Dial lines. The dial has 6 lines, each with a clock number at both ends, so one darker line shows two
 * numbers (validation V1 run 3: "3" and "9" are the same horizontal line). A line is named by its lower
 * hour: 1 = 1–7, 2 = 2–8, 3 = 3–9 (horizontal), 4 = 4–10, 5 = 5–11, 6 = 6–12 (vertical).
 */
export const DIAL_LINES = [1, 2, 3, 4, 5, 6] as const;
/** At most 5 lines can be picked: if all 6 look darker, none is darker ("All look the same"). */
export const MAX_DIAL_LINES = 5;

const isLine = (n: number) => Number.isInteger(n) && n >= 1 && n <= 6;

/** The line that a clock number (1..12) sits on: 9 -> 3 (3–9), 12 -> 6 (6–12), 7 -> 1 (1–7). */
export function lineOfHour(hour: number): number {
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) throw new RangeError(`Not a clock hour: ${hour}`);
  return ((hour - 1) % 6) + 1;
}

/** "3–9": the two clock numbers at the ends of a line. */
export function linePair(line: number): string {
  if (!isLine(line)) throw new RangeError(`Not a dial line: ${line}`);
  return `${line}–${line + 6}`;
}

/** Dial words on the test and results screens. {pair} is a line such as 3–9; {axis} is in degrees. */
export const DIAL_TEXT = {
  horizontal: { en: '{pair} (horizontal)', hi: '{pair} (आड़ी)' },
  vertical: { en: '{pair} (vertical)', hi: '{pair} (खड़ी)' },
  unsure: { en: 'Not sure', hi: 'पक्का नहीं' },
  even: { en: 'Even', hi: 'सब बराबर' },
  someDarker: { en: 'Some lines darker', hi: 'कुछ लाइनें ज़्यादा गहरी' },
  oneLine: { en: 'Darker: {pair} line (axis ≈ {axis}°)', hi: 'गहरी: {pair} लाइन (दिशा ≈ {axis}°)' },
  twoLines: { en: '{a} & {b}', hi: '{a} और {b}' },
  several: { en: 'several lines', hi: 'कई लाइनें' },
  lines: { en: 'Darker: {pairs} ({axis})', hi: 'गहरी: {pairs} ({axis})' },
  axis: { en: 'axis ≈ {axis}°', hi: 'दिशा ≈ {axis}°' },
  unclear: { en: 'direction unclear', hi: 'दिशा साफ़ नहीं' },
} satisfies Record<string, Text>;

/** "1–7", and "3–9 (horizontal)" / "6–12 (vertical)" for the two lines people name most easily, in `lang`. */
export function lineLabelIn(line: number, lang: Lang): string {
  const pair = linePair(line);
  return line === 3 ? fmt(DIAL_TEXT.horizontal[lang], { pair }) : line === 6 ? fmt(DIAL_TEXT.vertical[lang], { pair }) : pair;
}

/** English lineLabelIn. One parameter only, so `lines.map(lineLabel)` keeps working (map passes an index second). */
export function lineLabel(line: number): string {
  return lineLabelIn(line, 'en');
}

/** Distinct lines in ascending order. */
const normalise = (lines: readonly number[]) => [...new Set(lines)].sort((a, b) => a - b);

/**
 * Provisional axis estimate (degrees, 15..180) from the darker line(s), by the clock-dial "rule of 30":
 * axis = lower clock hour x 30 (3–9 -> 90, 6–12 -> 180), read as the minus-cylinder axis.
 * - 1 line: lower hour x 30.
 * - 2 adjacent lines (including 6–12 with 1–7): halfway between them, e.g. 2–8 & 3–9 -> 75.
 *   Axes repeat every 180 degrees, so 6–12 (180, the same as 0) & 1–7 (30) -> 15, not (180 + 30) / 2 = 105.
 * - Anything else (none, 2 lines that are not neighbours, 3 or more, or an invalid line): null, "direction unclear".
 * The dial resolves only 30 degrees (15 with two lines), and at 50 cm without fogging accommodation can
 * shift what looks darker. Provisional: a screening hint, never a prescription; to be reviewed with an optometrist.
 */
export function axisEstimate(lines: readonly number[]): number | null {
  if (!lines.every(isLine)) return null;
  const l = normalise(lines);
  if (l.length === 1) return l[0] * 30;
  if (l.length !== 2) return null;
  const [lo, hi] = l;
  if (hi - lo === 1) return ((lo + hi) * 30) / 2;
  if (lo === 1 && hi === 6) return 15; // across the 180/0 wrap: midway between 0 (= 180) and 30
  return null;
}

/**
 * Tap on a line: unselects it if selected, otherwise selects it, keeping the list ascending.
 * Selecting a 6th line is refused (blocked: true, selection unchanged), see MAX_DIAL_LINES.
 */
export function toggleLine(selected: readonly number[], line: number): { lines: number[]; blocked: boolean } {
  if (!isLine(line)) throw new RangeError(`Not a dial line: ${line}`);
  if (selected.includes(line)) return { lines: selected.filter((l) => l !== line), blocked: false };
  if (selected.length >= MAX_DIAL_LINES) return { lines: [...selected], blocked: true };
  return { lines: normalise([...selected, line]), blocked: false };
}

/** The answer recorded for "Some are darker" with these lines (the UI allows 1 to MAX_DIAL_LINES). */
export function pickedAnswer(lines: readonly number[]): DialAnswer {
  const l = normalise(lines);
  return { present: true, lines: l, axisDeg: axisEstimate(l) };
}

/** The line-dial answer as shown on the results screen. */
export function dialText(a: EyeResult['astigmatism'], lang: Lang = 'en'): string {
  const T = DIAL_TEXT;
  if (!a) return '—';
  if (a.unsure) return T.unsure[lang];
  if (!a.present) return T.even[lang];
  const lines = normalise(a.lines.filter(isLine));
  if (lines.length === 0) return T.someDarker[lang];
  const axis = axisEstimate(lines);
  if (lines.length === 1) return fmt(T.oneLine[lang], { pair: linePair(lines[0]), axis: String(axis) });
  const pairs = lines.length === 2 ? fmt(T.twoLines[lang], { a: linePair(lines[0]), b: linePair(lines[1]) }) : T.several[lang];
  return fmt(T.lines[lang], { pairs, axis: axis === null ? T.unclear[lang] : fmt(T.axis[lang], { axis }) });
}
