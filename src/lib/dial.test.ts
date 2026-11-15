import { describe, expect, it } from 'vitest';
import { MIN_STROKE_PX } from './acuity';
import {
  axisEstimate, DIAL_LINES, DIAL_MAX_LINE_MM, dialLineWidthMm, dialText, lineLabel, lineOfHour, linePair, MAX_DIAL_LINES,
  pickedAnswer, toggleLine,
} from './dial';
import { optotypeHeightMm } from './optics';

// Validation V1 phone: 5.4 CSS px per mm, dpr 2 (10.8 device px per mm), test at 50 cm.
const PHONE = { pxPerMm: 5.4, dpr: 2 };
const width = (logMAR: number | null, p = PHONE) => dialLineWidthMm(logMAR, 500, p.pxPerMm, p.dpr);

describe('dialLineWidthMm', () => {
  it('6/6 eye: stroke of the 6/9.5 optotype, 0.23 mm (about 2.5 device px)', () => {
    expect(width(0)).toBeCloseTo(0.2305, 4);
    expect(width(0)).toBeCloseTo(optotypeHeightMm(0.2, 500) / 5, 9);
    expect(width(0) * PHONE.pxPerMm * PHONE.dpr).toBeCloseTo(2.49, 2);
  });
  it('6/9.5 eye: stroke of the 6/15 optotype, 0.37 mm (about 3.9 device px)', () => {
    expect(width(0.2)).toBeCloseTo(0.3653, 4);
    expect(width(0.2) * PHONE.pxPerMm * PHONE.dpr).toBeCloseTo(3.946, 3);
  });
  it('is never wider than the old 0.7 mm line (6/19 or worse)', () => {
    expect(width(0.5)).toBe(DIAL_MAX_LINE_MM);
    expect(width(1.0)).toBe(DIAL_MAX_LINE_MM);
  });
  it('unknown acuity (null) keeps 0.7 mm', () => {
    expect(width(null)).toBe(DIAL_MAX_LINE_MM);
  });
  it('is never thinner than the screen can draw: MIN_STROKE_PX device px', () => {
    const laptop = { pxPerMm: 5.4, dpr: 1 }; // 6/6 -> 0.23 mm = 1.24 device px, under the 1.5 px minimum
    expect(width(0, laptop)).toBeCloseTo(MIN_STROKE_PX / 5.4, 9);
    expect(width(0, laptop) * laptop.pxPerMm * laptop.dpr).toBeCloseTo(MIN_STROKE_PX, 9);
  });
  it('a very coarse screen still gets 0.7 mm, never thicker', () => {
    expect(width(0, { pxPerMm: 1, dpr: 1 })).toBe(DIAL_MAX_LINE_MM);
  });
  it('gets wider (or stays) as acuity gets worse', () => {
    const lines = [-0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0].map((l) => width(l));
    lines.slice(1).forEach((w, i) => expect(w).toBeGreaterThanOrEqual(lines[i]));
  });
});

describe('lineOfHour', () => {
  it('maps both clock numbers of a line to its lower hour', () => {
    const lines = Array.from({ length: 12 }, (_, i) => lineOfHour(i + 1));
    expect(lines).toEqual([1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6]);
    expect(lineOfHour(9)).toBe(3);
    expect(lineOfHour(12)).toBe(6);
    expect(lineOfHour(7)).toBe(1);
  });
  it('validation V1 run 3: "9" (right eye) and "3" (left eye) are the same 3–9 line', () => {
    expect(lineOfHour(9)).toBe(lineOfHour(3));
    expect(lineLabel(lineOfHour(9))).toBe('3–9 (horizontal)');
  });
  it('rejects anything that is not a clock hour', () => {
    [0, 13, 2.5, -3, NaN].forEach((h) => expect(() => lineOfHour(h)).toThrow(RangeError));
  });
});

describe('lineLabel / linePair', () => {
  it('names each line by its two end numbers', () => {
    expect(DIAL_LINES.map(lineLabel)).toEqual(['1–7', '2–8', '3–9 (horizontal)', '4–10', '5–11', '6–12 (vertical)']);
    expect(DIAL_LINES.map(linePair)).toEqual(['1–7', '2–8', '3–9', '4–10', '5–11', '6–12']);
  });
  it('rejects anything that is not a line 1..6', () => {
    [0, 7, 12, 1.5].forEach((l) => {
      expect(() => lineLabel(l)).toThrow(RangeError);
      expect(() => linePair(l)).toThrow(RangeError);
    });
  });
});

describe('axisEstimate (rule of 30)', () => {
  it('one line: lower hour x 30, the 6–12 line is 180', () => {
    expect(DIAL_LINES.map((l) => axisEstimate([l]))).toEqual([30, 60, 90, 120, 150, 180]);
  });
  it('two adjacent lines: halfway between them, in any order', () => {
    expect(axisEstimate([2, 3])).toBe(75);
    expect(axisEstimate([3, 2])).toBe(75);
    expect(axisEstimate([1, 2])).toBe(45);
    expect(axisEstimate([5, 6])).toBe(165);
  });
  it('6–12 & 1–7 wrap across 180/0: 15, not 105', () => {
    expect(axisEstimate([6, 1])).toBe(15);
    expect(axisEstimate([1, 6])).toBe(15);
  });
  it('every adjacent pair lands halfway between two single-line axes, within 15..180', () => {
    const pairs = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]];
    expect(pairs.map((p) => axisEstimate(p))).toEqual([45, 75, 105, 135, 165, 15]);
  });
  it('anything else is unclear: none, non-adjacent, three or more, invalid lines', () => {
    expect(axisEstimate([])).toBeNull();
    expect(axisEstimate([1, 3])).toBeNull();
    expect(axisEstimate([1, 4])).toBeNull(); // perpendicular lines
    expect(axisEstimate([2, 3, 4])).toBeNull();
    expect(axisEstimate([1, 2, 3, 4, 5])).toBeNull();
    expect(axisEstimate([0])).toBeNull();
    expect(axisEstimate([7])).toBeNull();
    expect(axisEstimate([3, 9])).toBeNull(); // a clock hour, not a line
  });
  it('a repeated line counts once', () => {
    expect(axisEstimate([3, 3])).toBe(90);
  });
});

describe('toggleLine', () => {
  it('selects, keeps ascending order, and unselects on a second tap', () => {
    let s = toggleLine([], 3);
    expect(s).toEqual({ lines: [3], blocked: false });
    s = toggleLine(s.lines, 2);
    expect(s).toEqual({ lines: [2, 3], blocked: false });
    s = toggleLine(s.lines, 3);
    expect(s).toEqual({ lines: [2], blocked: false });
    expect(toggleLine(s.lines, 2)).toEqual({ lines: [], blocked: false });
  });
  it('allows up to 5 lines and refuses the 6th, leaving the selection unchanged', () => {
    let lines: number[] = [];
    for (const l of [1, 2, 3, 4, 5]) lines = toggleLine(lines, l).lines;
    expect(lines).toEqual([1, 2, 3, 4, 5]);
    expect(MAX_DIAL_LINES).toBe(5);
    expect(toggleLine(lines, 6)).toEqual({ lines: [1, 2, 3, 4, 5], blocked: true });
    // Unselecting still works when full, and then another line can be added.
    const fewer = toggleLine(lines, 1);
    expect(fewer).toEqual({ lines: [2, 3, 4, 5], blocked: false });
    expect(toggleLine(fewer.lines, 6)).toEqual({ lines: [2, 3, 4, 5, 6], blocked: false });
  });
  it('does not change the array it is given', () => {
    const before = [2, 3];
    toggleLine(before, 4);
    toggleLine(before, 2);
    expect(before).toEqual([2, 3]);
  });
  it('rejects anything that is not a line 1..6', () => {
    expect(() => toggleLine([], 9)).toThrow(RangeError);
  });
});

describe('pickedAnswer', () => {
  it('records the lines (ascending) and the axis estimate', () => {
    expect(pickedAnswer([3])).toEqual({ present: true, lines: [3], axisDeg: 90 });
    expect(pickedAnswer([3, 2])).toEqual({ present: true, lines: [2, 3], axisDeg: 75 });
    expect(pickedAnswer([1, 6])).toEqual({ present: true, lines: [1, 6], axisDeg: 15 });
    expect(pickedAnswer([1, 3, 5])).toEqual({ present: true, lines: [1, 3, 5], axisDeg: null });
  });
});

describe('dialText', () => {
  it('shows each answer', () => {
    expect(dialText({ present: false, lines: [], axisDeg: null })).toBe('Even');
    expect(dialText({ present: false, lines: [], axisDeg: null, unsure: true })).toBe('Not sure');
    expect(dialText(null)).toBe('—');
  });
  it('one line, with its axis', () => {
    expect(dialText(pickedAnswer([3]))).toBe('Darker: 3–9 line (axis ≈ 90°)');
    expect(dialText(pickedAnswer([6]))).toBe('Darker: 6–12 line (axis ≈ 180°)');
  });
  it('two adjacent lines, with the axis between them', () => {
    expect(dialText(pickedAnswer([2, 3]))).toBe('Darker: 2–8 & 3–9 (axis ≈ 75°)');
    expect(dialText(pickedAnswer([6, 1]))).toBe('Darker: 1–7 & 6–12 (axis ≈ 15°)');
  });
  it('direction unclear: two lines that are not neighbours, or three or more', () => {
    expect(dialText(pickedAnswer([1, 4]))).toBe('Darker: 1–7 & 4–10 (direction unclear)');
    expect(dialText(pickedAnswer([2, 3, 4]))).toBe('Darker: several lines (direction unclear)');
    expect(dialText(pickedAnswer([1, 2, 3, 4, 5]))).toBe('Darker: several lines (direction unclear)');
  });
  it('a darker answer without valid lines still reads as darker', () => {
    expect(dialText({ present: true, lines: [], axisDeg: null })).toBe('Some lines darker');
  });
});
