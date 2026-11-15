/*
 * Version label on the welcome screen: the build time, injected by vite `define` as __BUILD_TIME__ (an ISO string;
 * no git hash, since the Vercel CLI builds without .git).
 */

/**
 * "15 Nov 2026, 18:40" in the phone's local time (or `timeZone`, for tests). English month names and Latin digits in
 * both languages, so staff can read it whatever the session language. null for a missing or invalid time.
 */
export function formatBuildTime(iso: string, timeZone?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    numberingSystem: 'latn', timeZone,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')}`;
}
