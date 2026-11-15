/*
 * Phase 3 step 3: recent sessions on this phone, for the staff screen (components/Staff.tsx).
 *
 * Each finished session's export report (report v12, lib/report.ts buildReport; v11 reports saved before the
 * Landolt C chart are still read, see HISTORY_REPORT_VERSIONS) is kept in localStorage
 * `aerolens.history`, newest first, at most HISTORY_MAX entries. The report itself is unchanged: the session id and
 * start time live in the history entry around it, because the report has neither and only the history needs them.
 * No customer names are stored (the app never asks for one). Demo sessions are kept too; report.demo marks them.
 *
 * Reading is strict: anything that is not a valid entry (corrupt JSON, wrong version, missing fields) is dropped,
 * never thrown. All storage goes through lib/storage.ts, so a blocked or full store just means "nothing saved".
 */
import { buildInterview, QUESTIONS, type Lang } from './interview';
import { recommend, type RecKind, type RecStatus } from './recommend';
import { buildReport, type Device } from './report';
import { safeGet, safeRemove, safeSet, type StoreLike } from './storage';
import { triage, type Triage, type TriageLevel } from './triage';
import type { Chart, Duochrome, Session } from './types';

export const HISTORY_KEY = 'aerolens.history';
export const HISTORY_MAX = 20;
/**
 * Report versions the history accepts: v12 (the current buildReport output) and v11, so sessions saved before the
 * Landolt C chart are kept. The two differ only in the charts a report may name (v12 added 'C').
 */
export const HISTORY_REPORT_VERSIONS = [11, 12] as const;
type HistoryVersion = (typeof HISTORY_REPORT_VERSIONS)[number];
const CHARTS: Record<HistoryVersion, readonly (Chart | null)[]> = { 11: [null, 'E', 'letters'], 12: [null, 'E', 'letters', 'C'] };

export type StoredReport = ReturnType<typeof buildReport<Triage>>;

export interface HistoryEntry {
  /** Random id made when the session started; used to save each session once. */
  id: string;
  /** ISO time the session started (Start on the welcome screen). */
  startedAt: string;
  /** ISO time the results screen was reached (also report.at). */
  savedAt: string;
  report: StoredReport;
}

/** The session's identity, kept by the app next to the Session (not inside it, so the report is unchanged). */
export interface SessionMeta { id: string; startedAt: string }

/** A random session id. crypto.randomUUID needs a secure context, so plain-HTTP LAN testing falls back to Math.random. */
export function newSessionId(rand: () => number = Math.random): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  } catch { /* fall through */ }
  const part = () => Math.floor(rand() * 0x100000000).toString(16).padStart(8, '0');
  return `${part()}-${part()}-${part()}-${part()}`;
}

/**
 * The history entry for a finished session: the same triage, recommendation (with the interview) and report the
 * results screen shows and exports.
 */
export function sessionEntry(session: Session, meta: SessionMeta, device: Device, at: string): HistoryEntry {
  const t = triage(session.safetyFlags, session.results, session.targetMm);
  const rec = recommend(session, t, session.interview);
  return { id: meta.id, startedAt: meta.startedAt, savedAt: at, report: buildReport(session, t, device, at, rec) };
}

/* ---------- strict parsing ---------- */

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every(isStr);
const isNumArr = (x: unknown): x is number[] => Array.isArray(x) && x.every(isNum);
const isTime = (x: unknown): x is string => isStr(x) && Number.isFinite(Date.parse(x));
const oneOf = <T>(xs: readonly T[], x: unknown): x is T => (xs as readonly unknown[]).includes(x);
const isPair = (x: unknown) => isNumArr(x) && x.length === 2;
const isMono = (x: unknown) => isObj(x) && isNum(x.totalMm) && isNum(x.rightMm) && isNum(x.leftMm);
const isTips = (x: unknown) => Array.isArray(x) && x.every((t) => isObj(t) && isStr(t.style) && isStr(t.reason));

const LEVELS: readonly TriageLevel[] = ['ok', 'advise', 'refer'];
const STATUSES: readonly RecStatus[] = ['refer-first', 'after-check', 'suggest', 'none'];
const KINDS: readonly RecKind[] = ['lens', 'coating', 'frame'];
const SHAPES = ['oval', 'round', 'square', 'heart', 'oblong'] as const;

function isTriage(x: unknown): boolean {
  return isObj(x) && oneOf(LEVELS, x.level) && isStr(x.headline) && isStrArr(x.reasons) && isStrArr(x.notes);
}

function isEyeResult(x: unknown): boolean {
  if (!isObj(x)) return false;
  const a = x.astigmatism;
  const dialOk = a === null || (isObj(a) && typeof a.present === 'boolean' && isNumArr(a.lines)
    && (a.axisDeg === null || isNum(a.axisDeg)) && (a.unsure === undefined || a.unsure === true));
  return (x.logMAR === null || isNum(x.logMAR)) && typeof x.limited === 'boolean' && dialOk
    && (x.duochrome === null || oneOf(['red', 'green', 'equal'], x.duochrome)) && Array.isArray(x.acuityAnswers);
}

function isRecommendation(x: unknown): boolean {
  if (x === null) return true;
  return isObj(x) && oneOf(STATUSES, x.status) && isStrArr(x.notes) && Array.isArray(x.items)
    && x.items.every((it) => isObj(it) && oneOf(KINDS, it.kind) && isStr(it.category)
      && (it.zeissFamily === null || isStr(it.zeissFamily)) && isStrArr(it.reasons));
}

function isFit(x: unknown): boolean {
  if (x === null) return true;
  if (!isObj(x)) return false;
  if (x.status === 'skipped') return x.failure === null || isStr(x.failure);
  if (x.status !== 'captured') return false;
  const { pd, shape, frame } = x;
  return isNum(x.frames) && isStrArr(x.notes)
    && isObj(pd) && isNum(pd.viewingDistanceMm) && isMono(pd.measured) && isMono(pd.distanceEstimate)
    && isObj(shape) && oneOf(SHAPES, shape.shape) && isStrArr(shape.reasons)
    && Array.isArray(shape.nearby) && shape.nearby.every((s) => oneOf(SHAPES, s))
    && isObj(frame) && isPair(frame.totalWidthMm) && isStr(frame.size) && isPair(frame.lensWidthMm) && isPair(frame.bridgeMm)
    && isStrArr(frame.hints) && isTips(frame.suggest) && isTips(frame.avoid);
}

/** True for a report v11 or v12 with every field the staff screen reads (chart 'C' only from v12). */
export function isStoredReport(x: unknown): x is StoredReport {
  if (!isObj(x)) return false;
  const v = x.version;
  if (!oneOf(HISTORY_REPORT_VERSIONS, v) || !isTime(x.at)) return false;
  const r = x.results;
  return typeof x.demo === 'boolean' && isNum(x.targetMm) && x.targetMm > 0 && isStrArr(x.safetyFlags)
    && oneOf([null, 'none', 'glasses', 'contacts'], x.correction)
    && oneOf([null, 'none', 'contacts'], x.testedWith)
    && oneOf(CHARTS[v], x.chart)
    && isObj(r) && isEyeResult(r.right) && isEyeResult(r.left)
    && isTriage(x.triage)
    && (x.interview === null || buildInterview(x.interview as Parameters<typeof buildInterview>[0]) !== null)
    && oneOf([null, 'en', 'hi'], x.lang)
    && isRecommendation(x.recommendation)
    && isFit(x.fit);
}

export function isHistoryEntry(x: unknown): x is HistoryEntry {
  return isObj(x) && isStr(x.id) && x.id.length > 0 && isTime(x.startedAt) && isTime(x.savedAt) && isStoredReport(x.report);
}

/**
 * The stored history: valid entries only, newest first (by savedAt), one per id, at most `max`.
 * Corrupt JSON or a non-array gives []; never throws.
 */
export function parseHistory(raw: string | null, max = HISTORY_MAX): HistoryEntry[] {
  if (raw === null) return [];
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(data)) return [];
  const valid = data.filter(isHistoryEntry);
  valid.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  const seen = new Set<string>();
  const out: HistoryEntry[] = [];
  for (const e of valid) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
    if (out.length >= max) break;
  }
  return out;
}

/* ---------- store operations (never throw) ---------- */

export function loadHistory(store: StoreLike | null): HistoryEntry[] {
  return parseHistory(safeGet(store, HISTORY_KEY));
}

/** Writes the list; when the store is full, drops the oldest entries until it fits. The entries actually stored, or null. */
function write(store: StoreLike | null, list: HistoryEntry[]): HistoryEntry[] | null {
  if (list.length === 0) return safeRemove(store, HISTORY_KEY) ? [] : null;
  for (let n = list.length; n >= 1; n--) {
    const kept = list.slice(0, n);
    if (safeSet(store, HISTORY_KEY, JSON.stringify(kept))) return kept;
  }
  return null;
}

export interface HistoryWrite {
  /** True when the history now holds the entry (or, for delete and clear, no longer does). */
  ok: boolean;
  /** The history after the call (unchanged when nothing could be written). */
  entries: HistoryEntry[];
}

/**
 * Adds a finished session, newest first, capped at `max`. An id already in the history is not added again
 * (a re-render or a repeated call saves nothing new). Invalid entries are refused.
 */
export function addToHistory(store: StoreLike | null, entry: HistoryEntry, max = HISTORY_MAX): HistoryWrite {
  const list = loadHistory(store);
  if (!isHistoryEntry(entry)) return { ok: false, entries: list };
  if (list.some((e) => e.id === entry.id)) return { ok: true, entries: list };
  const kept = write(store, [entry, ...list].slice(0, max));
  return kept ? { ok: true, entries: kept } : { ok: false, entries: list };
}

export function deleteFromHistory(store: StoreLike | null, id: string): HistoryWrite {
  const list = loadHistory(store);
  const next = list.filter((e) => e.id !== id);
  if (next.length === list.length) return { ok: true, entries: list };
  const kept = write(store, next);
  return kept ? { ok: true, entries: kept } : { ok: false, entries: list };
}

export function clearHistory(store: StoreLike | null): HistoryWrite {
  return safeRemove(store, HISTORY_KEY) ? { ok: true, entries: [] } : { ok: false, entries: loadHistory(store) };
}

/* ---------- staff-screen text (English only: the staff screen is for the optician) ---------- */

export const LEVEL_TEXT: Record<TriageLevel, string> = { ok: 'No concern', advise: 'Lens likely to help', refer: 'Refer' };
export const LANG_TEXT: Record<Lang, string> = { en: 'English', hi: 'Hindi' };
export const DUO_TEXT: Record<Duochrome, string> = { red: 'Red clearer', green: 'Green clearer', equal: 'Same' };
export const CHART_TEXT: Record<Chart, string> = { E: 'Tumbling E', letters: 'Letters (Sloan)', C: 'Landolt C' };
export const KIND_TEXT: Record<RecKind, string> = { lens: 'Lens', coating: 'Lens option', frame: 'Frame' };

/** The interview answers as English question/answer rows, in question order (labels from lib/interview.ts). */
export function interviewRows(iv: StoredReport['interview']): { question: string; answer: string }[] {
  if (!iv) return [];
  return QUESTIONS.map((q) => {
    if (q.kind === 'multi') {
      const picked = q.options.filter((o) => (iv.complaints as unknown[]).includes(o.value)).map((o) => o.text.en);
      const none = q.options.find((o) => o.value === 'none')?.text.en ?? 'None';
      return { question: q.text.en, answer: picked.length ? picked.join(', ') : none };
    }
    const value = iv[q.field];
    const opt = (q.options as { value: unknown; text: { en: string } }[]).find((o) => o.value === value);
    return { question: q.text.en, answer: opt ? opt.text.en : String(value) };
  });
}

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Local time for the list: "Today, 14:05", "Yesterday, 09:30" or "12 Nov 2026, 14:05". */
export function historyTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return 'Unknown time';
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay(d, now)) return `Today, ${hm}`;
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(d, y)) return `Yesterday, ${hm}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hm}`;
}
