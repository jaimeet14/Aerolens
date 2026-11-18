import { describe, expect, it } from 'vitest';
import { pickedAnswer } from './dial';
import { demoFaceSample, FIT_FRAMES, measureFit } from './face';
import { blurredFarPoint, clearFarPoint, measuredFarPoint } from './farpoint';
import {
  addToHistory, CHART_TEXT, clearHistory, deleteFromHistory, HISTORY_KEY, HISTORY_MAX, HISTORY_REPORT_VERSIONS, historyTime, interviewRows,
  isHistoryEntry, loadHistory, newSessionId, parseHistory, sessionEntry, type HistoryEntry,
} from './history';
import { EYE_TEST_FIRST_NOTE, recommend, type Interview } from './recommend';
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
  acuityAnswers: [{ logMAR: 0.3, ok: true, distanceMm: 500 }], farPoint: null, ...extra,
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
  it('wraps the v13 report with the id and times, and reuses triage and the recommendation', () => {
    const s = session({ interview, lang: 'hi' });
    const e = sessionEntry(s, { id: 'a', startedAt: iso(0) }, device, iso(5));
    expect(e.id).toBe('a');
    expect(e.startedAt).toBe(iso(0));
    expect(e.savedAt).toBe(iso(5));
    expect(e.report.version).toBe(13);
    expect(e.report.at).toBe(iso(5));
    expect(e.report.triage).toEqual(triage(s.safetyFlags, s.results, s.targetMm));
    expect(e.report.recommendation).toEqual(recommend(s, e.report.triage, interview));
    expect(e.report.interview).toEqual(interview);
    expect(isHistoryEntry(e)).toBe(true);
  });
  it('passes the usual-wear answers to triage (18 Nov 2026): a glasses wearer at 6/6 without them is stored as advise', () => {
    // V6-like: both eyes 6/6, "Still clear" at 46 / 45 cm, glasses usually, tested without; interview age 18–39.
    const v6: Interview = { ageBand: '18-39', screenHours: '2to6', nightDriving: false, outdoors: 'little', complaints: ['headache'] };
    const results = { right: eye(0, { farPoint: clearFarPoint(46) }), left: eye(0, { farPoint: clearFarPoint(45) }) };
    const s = session({ correction: 'glasses', testedWith: 'none', results, interview: v6 });
    const e = sessionEntry(s, { id: 'v6', startedAt: iso(0) }, device, iso(5));
    expect(e.report.triage).toEqual(triage(s.safetyFlags, s.results, s.targetMm, 'en', s));
    expect(e.report.triage.level).toBe('advise');
    expect(e.report.triage.reasons).toEqual([
      'You usually wear glasses but read well without them at 50 cm. This is common with glasses for long sight, reading or mild astigmatism, which this screening cannot measure: take your glasses to an eye test.',
    ]);
    expect(e.report.triage.notes).toHaveLength(2);
    // The recommendation follows the level: a single-vision lens to discuss, after an eye test.
    expect(e.report.recommendation?.status).toBe('suggest');
    expect(e.report.recommendation?.items.map((i) => i.category)).toEqual(['Single-vision lens', 'Anti-reflective coating']);
    expect(e.report.recommendation?.notes).toContain(EYE_TEST_FIRST_NOTE);
    expect(isHistoryEntry(e)).toBe(true);
    // The same results with no usual wear stay ok.
    expect(sessionEntry({ ...s, correction: 'none' }, { id: 'n', startedAt: iso(0) }, device, iso(5)).report.triage.level).toBe('ok');
    // Tested with contact lenses in: no wear reason.
    expect(sessionEntry({ ...s, correction: 'contacts', testedWith: 'contacts' }, { id: 'c', startedAt: iso(0) }, device, iso(5)).report.triage.level).toBe('ok');
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

describe('report versions v11, v12 and v13', () => {
  /** A report saved before the far-point step (v12) or also before the Landolt C (v11): no farPoint in either eye. */
  const old = (version: 11 | 12) => (id: string, minutes = 0, chart: Session['chart'] = 'letters'): HistoryEntry => {
    const e = entry(id, minutes, { chart });
    const strip = ({ farPoint: _f, ...rest }: EyeResult) => { void _f; return rest; };
    const results = { right: strip(e.report.results.right), left: strip(e.report.results.left) } as unknown as Session['results'];
    return { ...e, report: { ...e.report, version, results } };
  };
  const v11 = old(11);
  const v12 = old(12);
  const cAnswers = [
    { logMAR: 0.5, ok: true, distanceMm: 500, shown: 'up' as const, picked: 'up' as const },
    { logMAR: 0.5, ok: false, distanceMm: 501, shown: 'left' as const, picked: null },
  ];
  const landolt = (id: string, minutes = 0) =>
    entry(id, minutes, {
      chart: 'C', lang: 'hi',
      results: { right: eye(0.2, { acuityAnswers: cAnswers, farPoint: measuredFarPoint([40, 55, 42]) }), left: eye(0, { farPoint: blurredFarPoint(18) }) },
    });
  const withFar = (e: HistoryEntry, farPoint: unknown): HistoryEntry =>
    ({ ...e, report: { ...e.report, results: { ...e.report.results, left: { ...e.report.results.left, farPoint } } } }) as HistoryEntry;

  it('accepts exactly v11, v12 and v13', () => {
    expect([...HISTORY_REPORT_VERSIONS]).toEqual([11, 12, 13]);
  });
  it('saves a v13 Landolt C session with far points and reads it back unchanged', () => {
    const s = memoryStore();
    const e = landolt('c');
    expect(e.report.version).toBe(13);
    expect(e.report.chart).toBe('C');
    expect(addToHistory(s, e).ok).toBe(true);
    const [back] = loadHistory(s);
    expect(back).toEqual(e);
    expect(back.report.results.right.acuityAnswers).toEqual(cAnswers);
    expect(back.report.results.right.farPoint).toMatchObject({ outcome: 'measured', medianCm: 42, estimateD: -2.25 });
    expect(back.report.results.left.farPoint).toMatchObject({ outcome: 'already-blurred', trialsCm: [18] });
    // A skipped far point (null) is valid too.
    expect(isHistoryEntry(entry('skip'))).toBe(true);
    expect(entry('skip').report.results.right.farPoint).toBeNull();
  });
  it('keeps v11 and v12 sessions saved before the update (no far point), next to new v13 ones', () => {
    for (const chart of ['E', 'letters', null] as const) expect(isHistoryEntry(v11('old', 0, chart))).toBe(true);
    for (const chart of ['E', 'letters', 'C', null] as const) expect(isHistoryEntry(v12('old', 0, chart))).toBe(true);
    const s = memoryStore();
    s.map.set(HISTORY_KEY, JSON.stringify([v12('mid', 0, 'C'), v11('old', -5), v11('older', -10, 'E')]));
    expect(addToHistory(s, landolt('new', 10)).ok).toBe(true);
    const list = loadHistory(s);
    expect(list.map((e) => [e.id, e.report.version, e.report.chart])).toEqual([['new', 13, 'C'], ['mid', 12, 'C'], ['old', 11, 'letters'], ['older', 11, 'E']]);
    expect('farPoint' in list[1].report.results.right).toBe(false);
  });
  it('drops a v11 report naming the Landolt C (v11 never had it), unknown charts, and other versions', () => {
    const cInV11 = v11('x', 0, 'C');
    const badChart = { ...entry('y'), report: { ...entry('y').report, chart: 'Snellen' } };
    const v10 = { ...entry('z'), report: { ...entry('z').report, version: 10 } };
    const v14 = { ...entry('w'), report: { ...entry('w').report, version: 14 } };
    const noVersion = { ...entry('n'), report: { ...entry('n').report, version: '13' } };
    expect(isHistoryEntry(cInV11)).toBe(false);
    expect(isHistoryEntry(badChart)).toBe(false);
    expect(parseHistory(JSON.stringify([cInV11, badChart, v10, v14, noVersion, landolt('ok')])).map((e) => e.id)).toEqual(['ok']);
  });
  it('drops a v12 report with a far point, a v13 report without one, and a malformed far-point block', () => {
    const v12Far = { ...landolt('a'), report: { ...landolt('a').report, version: 12 } };
    const v13NoFar = { ...v12('b'), report: { ...v12('b').report, version: 13 } };
    const bad = [
      v12Far, v13NoFar, withFar(entry('c'), undefined), withFar(entry('d'), { outcome: 'measured' }),
      withFar(entry('e'), { trialsCm: [42], medianCm: 42, outcome: 'measured', estimateD: -2.25, rangeD: null }),
      withFar(entry('f'), { trialsCm: [42], medianCm: 40, outcome: 'beyond', estimateD: null, rangeD: null }),
      withFar(entry('g'), { trialsCm: [18, 19], medianCm: 18.5, outcome: 'already-blurred', estimateD: null, rangeD: null }),
      withFar(entry('h'), { ...clearFarPoint(68), outcome: 'clear' }),
    ];
    for (const e of bad) expect(isHistoryEntry(e), e.id).toBe(false);
    expect(parseHistory(JSON.stringify([...bad, landolt('ok'), withFar(entry('ok2'), clearFarPoint(68))])).map((e) => e.id).sort()).toEqual(['ok', 'ok2']);
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
