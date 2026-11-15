import { describe, expect, it } from 'vitest';
import { pickedAnswer } from './dial';
import { demoFaceSample, FIT_FRAMES, measureFit } from './face';
import {
  addToHistory, CHART_TEXT, clearHistory, deleteFromHistory, HISTORY_KEY, HISTORY_MAX, HISTORY_REPORT_VERSIONS, historyTime, interviewRows,
  isHistoryEntry, loadHistory, newSessionId, parseHistory, sessionEntry, type HistoryEntry,
} from './history';
import { recommend, type Interview } from './recommend';
import type { StoreLike } from './storage';
import { triage } from './triage';
import type { EyeResult, Session } from './types';

function memoryStore(): StoreLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}
const blocked = () => { throw new DOMException('blocked', 'SecurityError'); };
const throwingStore: StoreLike = { getItem: blocked, setItem: blocked, removeItem: blocked };
/** Reads work; a write longer than `limit` characters fails like a full localStorage. */
function quotaStore(limit: number): StoreLike & { map: Map<string, string> } {
  const s = memoryStore();
  return {
    ...s,
    setItem: (k, v) => {
      if (String(v).length > limit) throw new DOMException('full', 'QuotaExceededError');
      s.map.set(k, String(v));
    },
  };
}

const eye = (logMAR: number | null, extra: Partial<EyeResult> = {}): EyeResult => ({
  logMAR, limited: false, astigmatism: null, duochrome: 'equal',
  acuityAnswers: [{ logMAR: 0.3, ok: true, distanceMm: 500 }], ...extra,
});
const session = (p: Partial<Session> = {}): Session => ({
  safetyFlags: [], correction: 'none', testedWith: 'none', pxPerMm: 5.85, dpr: 2, scaleSource: 'card', scaleSavedAt: null, targetMm: 500,
  focalCalibrated: true, demo: false, chart: 'E', results: { right: eye(0.2), left: eye(0) }, fit: null,
  interview: null, lang: null, ...p,
});
const device = { userAgent: 'test', screenCss: [393, 852] as [number, number], viewportCss: [393, 760] as [number, number], dpr: 2 };
const iso = (minutes: number) => new Date(Date.UTC(2026, 10, 15, 10, minutes)).toISOString();
const entry = (id: string, minutes = 0, p: Partial<Session> = {}): HistoryEntry =>
  sessionEntry(session(p), { id, startedAt: iso(minutes) }, device, iso(minutes + 5));

const interview: Interview = { ageBand: '40-59', screenHours: 'gt6', nightDriving: true, outdoors: 'some', complaints: ['glare', 'headache'] };

describe('sessionEntry', () => {
  it('wraps the v12 report with the id and times, and reuses triage and the recommendation', () => {
    const s = session({ interview, lang: 'hi' });
    const e = sessionEntry(s, { id: 'a', startedAt: iso(0) }, device, iso(5));
    expect(e.id).toBe('a');
    expect(e.startedAt).toBe(iso(0));
    expect(e.savedAt).toBe(iso(5));
    expect(e.report.version).toBe(12);
    expect(e.report.at).toBe(iso(5));
    expect(e.report.triage).toEqual(triage(s.safetyFlags, s.results, s.targetMm));
    expect(e.report.recommendation).toEqual(recommend(s, e.report.triage, interview));
    expect(e.report.interview).toEqual(interview);
    expect(isHistoryEntry(e)).toBe(true);
  });
  it('keeps the demo flag of a demo session', () => {
    expect(entry('d', 0, { demo: true }).report.demo).toBe(true);
  });
  it('stores no name: the report has no name-like field', () => {
    const json = JSON.stringify(entry('x'));
    expect(json).not.toMatch(/"(name|customer|patient)"/i);
  });
  it('accepts a captured fit and a skipped one', () => {
    const out = measureFit(Array.from({ length: FIT_FRAMES }, (_, i) => demoFaceSample(i)));
    if (!out.ok) throw new Error(out.message);
    expect(isHistoryEntry(entry('f', 0, { fit: out.fit }))).toBe(true);
    expect(isHistoryEntry(entry('g', 0, { fit: { status: 'skipped', failure: null } }))).toBe(true);
  });
  it('accepts red flags and a dial answer', () => {
    const e = entry('r', 0, { safetyFlags: ['Double vision'], results: { right: eye(0.1, { astigmatism: pickedAnswer([3]) }), left: eye(null) } });
    expect(e.report.triage.level).toBe('refer');
    expect(isHistoryEntry(e)).toBe(true);
  });
});

describe('parseHistory', () => {
  it('returns [] for nothing, corrupt JSON or a non-array', () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory('{not json')).toEqual([]);
    expect(parseHistory('{"a":1}')).toEqual([]);
    expect(parseHistory('"text"')).toEqual([]);
  });
  it('drops malformed entries and keeps the valid ones', () => {
    const good = entry('good');
    const wrongVersion = { ...entry('v'), report: { ...entry('v').report, version: 10 } };
    const badLevel = { ...entry('l'), report: { ...entry('l').report, triage: { level: 'maybe', headline: 'x', reasons: [], notes: [] } } };
    const badTime = { ...entry('t'), savedAt: 'yesterday' };
    const noId = { ...entry(''), id: '' };
    const badInterview = { ...entry('i'), report: { ...entry('i').report, interview: { ageBand: '99' } } };
    const badFit = { ...entry('f'), report: { ...entry('f').report, fit: { status: 'captured', pd: {} } } };
    const raw = JSON.stringify([null, 3, 'x', {}, good, wrongVersion, badLevel, badTime, noId, badInterview, badFit]);
    expect(parseHistory(raw).map((e) => e.id)).toEqual(['good']);
  });
  it('sorts newest first, keeps one entry per id and caps the list', () => {
    const list = [entry('a', 0), entry('c', 20), entry('b', 10), { ...entry('c', 30) }];
    expect(parseHistory(JSON.stringify(list)).map((e) => [e.id, e.savedAt])).toEqual([['c', iso(35)], ['b', iso(15)], ['a', iso(5)]]);
    expect(parseHistory(JSON.stringify(list), 2).map((e) => e.id)).toEqual(['c', 'b']);
  });
});

describe('report versions v11 and v12', () => {
  /** A session saved before the Landolt C: the v11 report had the same fields, only the version and charts differ. */
  const v11 = (id: string, minutes = 0, chart: Session['chart'] = 'letters'): HistoryEntry => {
    const e = entry(id, minutes, { chart });
    return { ...e, report: { ...e.report, version: 11 } };
  };
  const cAnswers = [
    { logMAR: 0.5, ok: true, distanceMm: 500, shown: 'up' as const, picked: 'up' as const },
    { logMAR: 0.5, ok: false, distanceMm: 501, shown: 'left' as const, picked: null },
  ];
  const landolt = (id: string, minutes = 0) =>
    entry(id, minutes, { chart: 'C', lang: 'hi', results: { right: eye(0.2, { acuityAnswers: cAnswers }), left: eye(0) } });

  it('accepts exactly v11 and v12', () => {
    expect([...HISTORY_REPORT_VERSIONS]).toEqual([11, 12]);
  });
  it('saves a v12 Landolt C session and reads it back unchanged', () => {
    const s = memoryStore();
    const e = landolt('c');
    expect(e.report.version).toBe(12);
    expect(e.report.chart).toBe('C');
    expect(addToHistory(s, e).ok).toBe(true);
    const [back] = loadHistory(s);
    expect(back).toEqual(e);
    expect(back.report.results.right.acuityAnswers).toEqual(cAnswers);
  });
  it('keeps v11 sessions saved before the update (E, letters or no chart), next to new v12 ones', () => {
    for (const chart of ['E', 'letters', null] as const) expect(isHistoryEntry(v11('old', 0, chart))).toBe(true);
    const s = memoryStore();
    s.map.set(HISTORY_KEY, JSON.stringify([v11('old', 0), v11('older', -10, 'E')]));
    expect(addToHistory(s, landolt('new', 10)).ok).toBe(true);
    const list = loadHistory(s);
    expect(list.map((e) => [e.id, e.report.version, e.report.chart])).toEqual([['new', 12, 'C'], ['old', 11, 'letters'], ['older', 11, 'E']]);
  });
  it('drops a v11 report naming the Landolt C (v11 never had it), unknown charts, and other versions', () => {
    const cInV11 = v11('x', 0, 'C');
    const badChart = { ...entry('y'), report: { ...entry('y').report, chart: 'Snellen' } };
    const v10 = { ...entry('z'), report: { ...entry('z').report, version: 10 } };
    const v13 = { ...entry('w'), report: { ...entry('w').report, version: 13 } };
    const noVersion = { ...entry('n'), report: { ...entry('n').report, version: '12' } };
    expect(isHistoryEntry(cInV11)).toBe(false);
    expect(isHistoryEntry(badChart)).toBe(false);
    expect(parseHistory(JSON.stringify([cInV11, badChart, v10, v13, noVersion, landolt('ok')])).map((e) => e.id)).toEqual(['ok']);
  });
  it('labels every chart for the staff screen', () => {
    expect(CHART_TEXT).toEqual({ E: 'Tumbling E', letters: 'Letters (Sloan)', C: 'Landolt C' });
  });
});

describe('addToHistory', () => {
  it('saves newest first under aerolens.history', () => {
    const s = memoryStore();
    expect(addToHistory(s, entry('a', 0)).ok).toBe(true);
    expect(addToHistory(s, entry('b', 10)).ok).toBe(true);
    expect(loadHistory(s).map((e) => e.id)).toEqual(['b', 'a']);
    expect(s.map.has(HISTORY_KEY)).toBe(true);
  });
  it('does not save the same session twice', () => {
    const s = memoryStore();
    const e = entry('a');
    addToHistory(s, e);
    const again = addToHistory(s, { ...e, savedAt: iso(50) });
    expect(again.ok).toBe(true);
    expect(loadHistory(s)).toHaveLength(1);
    expect(loadHistory(s)[0].savedAt).toBe(e.savedAt);
  });
  it(`keeps at most ${HISTORY_MAX} sessions, dropping the oldest`, () => {
    const s = memoryStore();
    for (let i = 0; i < HISTORY_MAX + 5; i++) addToHistory(s, entry(`s${i}`, i));
    const ids = loadHistory(s).map((e) => e.id);
    expect(ids).toHaveLength(HISTORY_MAX);
    expect(ids[0]).toBe(`s${HISTORY_MAX + 4}`);
    expect(ids).not.toContain('s4');
    expect(ids).toContain('s5');
  });
  it('replaces a corrupt stored value instead of failing', () => {
    const s = memoryStore();
    s.map.set(HISTORY_KEY, '[[[oops');
    expect(addToHistory(s, entry('a')).ok).toBe(true);
    expect(loadHistory(s).map((e) => e.id)).toEqual(['a']);
  });
  it('refuses an invalid entry', () => {
    const s = memoryStore();
    expect(addToHistory(s, { ...entry('a'), id: '' }).ok).toBe(false);
    expect(s.map.has(HISTORY_KEY)).toBe(false);
  });
  it('drops the oldest entries when the store is full, keeping the new one', () => {
    const one = JSON.stringify([entry('a')]).length;
    const s = quotaStore(one * 2 + 10);
    addToHistory(s, entry('a', 0));
    addToHistory(s, entry('b', 10));
    const r = addToHistory(s, entry('c', 20));
    expect(r.ok).toBe(true);
    expect(loadHistory(s).map((e) => e.id)).toEqual(['c', 'b']);
  });
  it('reports failure without throwing when nothing fits or the store throws', () => {
    expect(addToHistory(quotaStore(10), entry('a'))).toEqual({ ok: false, entries: [] });
    expect(addToHistory(throwingStore, entry('a'))).toEqual({ ok: false, entries: [] });
    expect(addToHistory(null, entry('a')).ok).toBe(false);
  });
});

describe('deleteFromHistory and clearHistory', () => {
  it('deletes one session by id', () => {
    const s = memoryStore();
    addToHistory(s, entry('a', 0));
    addToHistory(s, entry('b', 10));
    const r = deleteFromHistory(s, 'a');
    expect(r.ok).toBe(true);
    expect(r.entries.map((e) => e.id)).toEqual(['b']);
    expect(loadHistory(s).map((e) => e.id)).toEqual(['b']);
  });
  it('deleting the last one removes the key; an unknown id changes nothing', () => {
    const s = memoryStore();
    addToHistory(s, entry('a'));
    expect(deleteFromHistory(s, 'zzz').entries).toHaveLength(1);
    expect(deleteFromHistory(s, 'a').entries).toEqual([]);
    expect(s.map.has(HISTORY_KEY)).toBe(false);
  });
  it('clears all', () => {
    const s = memoryStore();
    addToHistory(s, entry('a'));
    addToHistory(s, entry('b', 10));
    expect(clearHistory(s)).toEqual({ ok: true, entries: [] });
    expect(loadHistory(s)).toEqual([]);
  });
  it('never throws with a throwing or missing store', () => {
    expect(loadHistory(throwingStore)).toEqual([]);
    expect(deleteFromHistory(throwingStore, 'a').ok).toBe(true);
    expect(clearHistory(throwingStore).ok).toBe(false);
    expect(clearHistory(null).ok).toBe(false);
  });
});

describe('newSessionId', () => {
  it('makes distinct non-empty ids', () => {
    const a = newSessionId();
    const b = newSessionId();
    expect(a.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });
});

describe('interviewRows', () => {
  it('gives English question and answer labels in question order', () => {
    const rows = interviewRows(interview);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ question: 'How old are you?', answer: '40 to 59' });
    expect(rows[2].answer).toBe('Yes');
    // Complaints in option order, not tap order.
    expect(rows[4].answer).toBe('Headaches, Glare from lights (headlights, sun)');
  });
  it('shows "None of these" for no complaints, and nothing for a skipped interview', () => {
    expect(interviewRows({ ...interview, complaints: [] })[4].answer).toBe('None of these');
    expect(interviewRows(null)).toEqual([]);
  });
});

describe('historyTime', () => {
  const now = new Date(2026, 10, 15, 18, 0);
  it('says today, yesterday, or the date, in local time', () => {
    expect(historyTime(new Date(2026, 10, 15, 14, 5).toISOString(), now)).toBe('Today, 14:05');
    expect(historyTime(new Date(2026, 10, 14, 9, 30).toISOString(), now)).toBe('Yesterday, 09:30');
    expect(historyTime(new Date(2026, 10, 12, 8, 0).toISOString(), now)).toBe('12 Nov 2026, 08:00');
    expect(historyTime('nonsense', now)).toBe('Unknown time');
  });
});
