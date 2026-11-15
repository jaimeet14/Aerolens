import { describe, expect, it } from 'vitest';
import { formatBuildTime } from './version';

describe('formatBuildTime', () => {
  it('formats day, short English month, year and 24-hour time', () => {
    expect(formatBuildTime('2026-11-15T18:40:12.345Z', 'UTC')).toBe('15 Nov 2026, 18:40');
  });

  it('uses the given time zone (the phone local time in the app)', () => {
    // India is UTC+5:30.
    expect(formatBuildTime('2026-11-15T13:10:00.000Z', 'Asia/Kolkata')).toBe('15 Nov 2026, 18:40');
    expect(formatBuildTime('2026-11-15T20:00:00.000Z', 'Asia/Kolkata')).toBe('16 Nov 2026, 01:30');
  });

  it('pads hours and minutes, never shows 24:00', () => {
    expect(formatBuildTime('2026-01-05T00:05:00.000Z', 'UTC')).toBe('5 Jan 2026, 00:05');
  });

  it('keeps Latin digits', () => {
    expect(formatBuildTime('2026-11-15T18:40:00.000Z', 'UTC')).toMatch(/^[0-9A-Za-z :,]+$/);
  });

  it('returns null for a missing or invalid time', () => {
    expect(formatBuildTime('')).toBeNull();
    expect(formatBuildTime('not a date')).toBeNull();
  });

  it('formats in local time without a time zone', () => {
    expect(formatBuildTime('2026-11-15T18:40:00.000Z')).toMatch(/^\d{1,2} [A-Z][a-z]{2,3} 2026, \d{2}:\d{2}$/);
  });
});
