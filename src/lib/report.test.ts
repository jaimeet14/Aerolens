import { describe, expect, it } from 'vitest';
import { pickedAnswer } from './dial';
import { demoFaceSample, FIT_FRAMES, measureFit } from './face';
import { clearFarPoint, measuredFarPoint } from './farpoint';
import { recommend, REFER_FIRST_NOTE, type Interview } from './recommend';
import { buildReport, distanceSummary } from './report';
import { triage } from './triage';
import type { EyeResult, Session } from './types';

const eye = (distances: (number | null)[]): EyeResult => ({
  logMAR: 0.2, limited: false, astigmatism: null, duochrome: null,
  acuityAnswers: distances.map((d, i) => ({ logMAR: 0.5 - i * 0.1, ok: true, distanceMm: d })), farPoint: null,
});

describe('distanceSummary', () => {
  it('summarises measured distances, ignoring missing ones', () => {
    expect(distanceSummary(eye([480, 510.4, null, 495]).acuityAnswers)).toEqual({ n: 3, medianMm: 495, minMm: 480, maxMm: 510 });
  });
  it('is null when nothing was measured', () => {
    expect(distanceSummary(eye([null, null]).acuityAnswers)).toBeNull();
    expect(distanceSummary([])).toBeNull();
  });
});

describe('buildReport', () => {
  const session: Session = {
    safetyFlags: [], correction: 'glasses', testedWith: 'none', pxPerMm: 5.85, dpr: 2, scaleSource: 'card', scaleSavedAt: null, targetMm: 500,
    focalCalibrated: true, demo: false, chart: 'letters', results: { right: eye([500, 490]), left: eye([]) }, fit: null,
    interview: null, lang: null,
  };
  const device = { userAgent: 'test', screenCss: [393, 852] as [number, number], viewportCss: [393, 760] as [number, number], dpr: 2 };
  const r = buildReport(session, { level: 'ok' }, device, '2026-11-12T00:00:00.000Z');
  it('keeps the session and adds validation fields', () => {
    expect(r.version).toBe(13);
    expect(r.correction).toBe('glasses');
    expect(r.focalCalibrated).toBe(true);
    expect(r.device.screenCss).toEqual([393, 852]);
    expect(r.results.right.acuityAnswers).toHaveLength(2);
  });
  it('records the usual wear and what the test was done with (v8), in the exported JSON', () => {
    // A glasses wearer is tested without them: correction is the usual wear, testedWith is 'none'.
    expect(JSON.parse(JSON.stringify(r))).toMatchObject({ version: 13, correction: 'glasses', testedWith: 'none' });
    // A contact lens wearer who kept them in.
    const kept = JSON.parse(JSON.stringify(buildReport({ ...session, correction: 'contacts', testedWith: 'contacts' }, null, device, '')));
    expect(kept).toMatchObject({ correction: 'contacts', testedWith: 'contacts' });
    // Not answered (e.g. stopped before the safety screen) stays null, not dropped.
    const blank = JSON.parse(JSON.stringify(buildReport({ ...session, correction: null, testedWith: null }, null, device, '')));
    expect(blank).toHaveProperty('testedWith', null);
    expect(blank).toHaveProperty('correction', null);
  });
  it('adds a per-eye distance summary', () => {
    expect(r.distance.right).toEqual({ n: 2, medianMm: 495, minMm: 490, maxMm: 500 });
    expect(r.distance.left).toBeNull();
  });
  it('records which acuity chart was used, in the exported JSON', () => {
    expect(r.chart).toBe('letters');
    expect(JSON.parse(JSON.stringify(r)).chart).toBe('letters');
    expect(buildReport({ ...session, chart: 'E' }, null, device, '').chart).toBe('E');
    expect(buildReport({ ...session, chart: null }, null, device, '').chart).toBeNull();
  });
  it('exports a Landolt C session (v12): chart C, gap directions as shown/picked, everything else as in v11', () => {
    const answers = [
      { logMAR: 0.5, ok: true, distanceMm: 500, shown: 'up' as const, picked: 'up' as const },
      { logMAR: 0.5, ok: false, distanceMm: 498, shown: 'left' as const, picked: 'right' as const },
      { logMAR: 0.4, ok: false, distanceMm: 503, shown: 'down' as const, picked: null },
    ];
    const s: Session = { ...session, chart: 'C', lang: 'hi', results: { ...session.results, right: { ...session.results.right, acuityAnswers: answers } } };
    const out = JSON.parse(JSON.stringify(buildReport(s, null, device, '')));
    expect(out.version).toBe(13);
    expect(out.chart).toBe('C');
    expect(out.lang).toBe('hi');
    expect(out.results.right.acuityAnswers).toEqual(answers);
    // The v11 fields are all still there.
    expect(out).toMatchObject({ correction: 'glasses', testedWith: 'none', scaleSource: 'card', interview: null, fit: null, recommendation: null });
    expect(out.distance.right).toEqual({ n: 3, medianMm: 500, minMm: 498, maxMm: 503 });
  });
  it('records where the screen scale came from, in the exported JSON', () => {
    expect(r.scaleSource).toBe('card');
    expect(r.scaleSavedAt).toBeNull();
    const saved = buildReport({ ...session, scaleSource: 'saved', scaleSavedAt: '2026-11-10T09:30:00.000Z' }, null, device, '');
    expect(JSON.parse(JSON.stringify(saved))).toMatchObject({ version: 13, scaleSource: 'saved', scaleSavedAt: '2026-11-10T09:30:00.000Z', pxPerMm: 5.85, dpr: 2 });
  });
  const withDial = (right: EyeResult['astigmatism'], left: EyeResult['astigmatism']): Session => ({
    ...session, results: { right: { ...session.results.right, astigmatism: right }, left: { ...session.results.left, astigmatism: left } },
  });
  it('records a "Not sure" line-dial answer distinctly, in the exported JSON', () => {
    const s = withDial({ present: false, lines: [], axisDeg: null, unsure: true }, { present: false, lines: [], axisDeg: null });
    const out = JSON.parse(JSON.stringify(buildReport(s, null, device, '')));
    expect(out.version).toBe(13);
    expect(out.results.right.astigmatism).toEqual({ present: false, lines: [], axisDeg: null, unsure: true });
    expect(out.results.left.astigmatism).toEqual({ present: false, lines: [], axisDeg: null });
  });
  it('keeps the selected dial lines and the axis estimate, in the exported JSON (v6+, no single hour)', () => {
    const s = withDial(pickedAnswer([3]), pickedAnswer([3, 2]));
    const out = JSON.parse(JSON.stringify(buildReport(s, null, device, '')));
    expect(out.version).toBe(13);
    expect(out.results.right.astigmatism).toEqual({ present: true, lines: [3], axisDeg: 90 });
    expect(out.results.left.astigmatism).toEqual({ present: true, lines: [2, 3], axisDeg: 75 });
    expect(out.results.right.astigmatism).not.toHaveProperty('hour');
    // Direction unclear survives as null, not dropped.
    const unclear = JSON.parse(JSON.stringify(buildReport(withDial(pickedAnswer([1, 4]), null), null, device, '')));
    expect(unclear.results.right.astigmatism).toEqual({ present: true, lines: [1, 4], axisDeg: null });
    expect(unclear.results.left.astigmatism).toBeNull();
  });
  it('exports the triage with its notes (v7), in the exported JSON', () => {
    // Right eye 6/6 with darker dial lines: a note, not a reason, and the level stays ok.
    const s: Session = {
      ...session,
      results: {
        right: { ...session.results.right, logMAR: 0, astigmatism: pickedAnswer([4]) },
        left: { ...session.results.left, logMAR: 0, astigmatism: { present: false, lines: [], axisDeg: null } },
      },
    };
    const out = JSON.parse(JSON.stringify(buildReport(s, triage(s.safetyFlags, s.results, s.targetMm), device, '')));
    expect(out.version).toBe(13);
    expect(out.triage).toEqual({
      level: 'ok',
      headline: 'No concern found today',
      reasons: [],
      notes: ['Right eye: some dial lines looked darker — possible mild astigmatism. Mention it at your next eye check.'],
    });
    // notes is always present, even when empty.
    const none = JSON.parse(JSON.stringify(buildReport(session, triage([], session.results), device, '')));
    expect(none.triage.notes).toEqual([]);
  });
  it('always has a fit block (v9): null when the frame-fit step was not reached', () => {
    const out = JSON.parse(JSON.stringify(r));
    expect(out).toHaveProperty('fit', null);
    // An older session object without the field still exports fit: null.
    const { fit: _omit, ...old } = session;
    void _omit;
    expect(buildReport(old as Session, null, device, '').fit).toBeNull();
  });
  it('exports a skipped frame-fit step with the last failure (v9)', () => {
    const out = JSON.parse(JSON.stringify(buildReport({ ...session, fit: { status: 'skipped', failure: 'The readings varied too much (by 4.0 mm).' } }, null, device, '')));
    expect(out.fit).toEqual({ status: 'skipped', failure: 'The readings varied too much (by 4.0 mm).' });
    expect(JSON.parse(JSON.stringify(buildReport({ ...session, fit: { status: 'skipped', failure: null } }, null, device, ''))).fit)
      .toEqual({ status: 'skipped', failure: null });
  });
  it('exports a captured frame fit: measured and distance PD labelled apart, face, shape and frame (v9)', () => {
    const m = measureFit(Array.from({ length: FIT_FRAMES }, (_, i) => demoFaceSample(i)));
    if (!m.ok) throw new Error(m.message);
    const out = JSON.parse(JSON.stringify(buildReport({ ...session, fit: m.fit }, null, device, '')));
    expect(out.version).toBe(13);
    expect(out.fit).toEqual(m.fit);
    expect(out.fit).toMatchObject({
      status: 'captured',
      frames: FIT_FRAMES,
      pd: { viewingDistanceMm: 500, measured: { totalMm: 61.7 }, distanceEstimate: { totalMm: 63 }, rotationMm: 10.5 },
      face: { cheekWidthMm: 138, jawWidthMm: 108, foreheadWidthMm: 112, faceLengthMm: 172 },
      shape: { shape: 'oval', ratios: { lengthToWidth: 1.25, jawToCheek: 0.78, foreheadToCheek: 0.81 } },
      frame: { totalWidthMm: [132, 140], size: 'medium', bridgeMm: [16, 20] },
      notes: [],
    });
    expect(out.fit.shape.reasons.length).toBeGreaterThan(0);
    expect(out.fit.frame.suggest[0]).toHaveProperty('reason');
    // The existing fields are unchanged.
    expect(out).toMatchObject({ correction: 'glasses', chart: 'letters', scaleSource: 'card', distance: { right: { n: 2 } } });
  });
  it('always has a recommendation block (v10): null when none is passed', () => {
    expect(JSON.parse(JSON.stringify(r))).toHaveProperty('recommendation', null);
    expect(buildReport(session, null, device, '', null).recommendation).toBeNull();
  });
  it('exports the recommendation with status, items and notes, after the triage (v10)', () => {
    // Both eyes 6/9.5, red clearer in the right eye, frame fit captured; no interview yet.
    const m = measureFit(Array.from({ length: FIT_FRAMES }, (_, i) => demoFaceSample(i)));
    if (!m.ok) throw new Error(m.message);
    const s: Session = {
      ...session,
      fit: m.fit,
      results: { right: { ...session.results.right, duochrome: 'red' }, left: { ...session.results.left, duochrome: 'equal' } },
    };
    const t = triage(s.safetyFlags, s.results, s.targetMm);
    const rec = recommend(s, t, null);
    const out = JSON.parse(JSON.stringify(buildReport(s, t, device, '', rec)));
    expect(out.version).toBe(13);
    expect(out.recommendation).toEqual(rec);
    expect(out.recommendation.status).toBe('suggest');
    expect(out.recommendation.items.map((i: { kind: string; category: string; zeissFamily: string | null }) => [i.kind, i.category, i.zeissFamily])).toEqual([
      ['lens', 'Single-vision lens', 'ZEISS SmartLife Single Vision'],
      ['coating', 'Anti-reflective coating', 'ZEISS DuraVision Platinum'],
      ['frame', 'Medium frame, front 132–140 mm', null],
    ]);
    expect(out.recommendation.notes).toContain('Red-green test: red looked clearer in the right eye, a possible myopic (short-sighted) tendency.');
    expect(Object.keys(out).slice(-2)).toEqual(['triage', 'recommendation']);
    // The existing fields are unchanged.
    expect(out).toMatchObject({ correction: 'glasses', chart: 'letters', triage: { level: 'advise' }, fit: { status: 'captured' } });
  });
  it('exports a red-flag recommendation with no items (v10)', () => {
    const s: Session = { ...session, safetyFlags: ['Double vision'] };
    const out = JSON.parse(JSON.stringify(buildReport(s, triage(s.safetyFlags, s.results), device, '', recommend(s, triage(s.safetyFlags, s.results), null))));
    expect(out.recommendation).toEqual({ status: 'refer-first', items: [], notes: [REFER_FIRST_NOTE] });
  });
  it('always has interview and lang (v11): null when the questions were skipped or not reached', () => {
    const out = JSON.parse(JSON.stringify(r));
    expect(out).toHaveProperty('interview', null);
    expect(out).toHaveProperty('lang', null);
    // Skipped after choosing a language: the language is kept, the interview is null.
    expect(JSON.parse(JSON.stringify(buildReport({ ...session, lang: 'hi' }, null, device, '')))).toMatchObject({ interview: null, lang: 'hi' });
    // An older session object without the fields still exports them as null.
    const { interview: _i, lang: _l, ...old } = session;
    void _i; void _l;
    const o = buildReport(old as Session, null, device, '');
    expect(o.interview).toBeNull();
    expect(o.lang).toBeNull();
  });
  it('exports the interview answers and language, and a recommendation that uses them (v11)', () => {
    const interview: Interview = { ageBand: '40-59', screenHours: 'gt6', nightDriving: true, outdoors: 'some', complaints: ['small-print'] };
    const s: Session = { ...session, interview, lang: 'hi' };
    const t = triage(s.safetyFlags, s.results, s.targetMm);
    const rec = recommend(s, t, s.interview);
    const out = JSON.parse(JSON.stringify(buildReport(s, t, device, '', rec)));
    expect(out.version).toBe(13);
    expect(out.interview).toEqual(interview);
    expect(out.lang).toBe('hi');
    expect(out.recommendation.items.map((i: { category: string }) => i.category)).toEqual([
      'Progressive lens', 'Office lens (desk and screen distance)', 'Anti-reflective coating', 'Night-driving lens', 'Blue-light filter',
    ]);
    // "None of these" exports as an empty list, not null.
    expect(JSON.parse(JSON.stringify(buildReport({ ...s, interview: { ...interview, complaints: [] } }, t, device, ''))).interview.complaints).toEqual([]);
    expect(Object.keys(out).slice(-2)).toEqual(['triage', 'recommendation']);
    expect(out).toMatchObject({ correction: 'glasses', chart: 'letters', triage: { level: 'advise' }, fit: null });
  });
  it('keeps the optional shown/picked fields of each answer', () => {
    const answers = [{ logMAR: 0.5, ok: false, distanceMm: 500, shown: 'K' as const, picked: 'R' as const }];
    const s = { ...session, results: { ...session.results, right: { ...session.results.right, acuityAnswers: answers } } };
    expect(buildReport(s, null, device, '').results.right.acuityAnswers[0]).toMatchObject({ shown: 'K', picked: 'R' });
  });
  it('exports the far point per eye (v13): the block, or null when skipped; everything else as in v12', () => {
    const right = measuredFarPoint([40, 55, 42]);
    const left = clearFarPoint(68);
    const s: Session = { ...session, testedWith: 'contacts', correction: 'contacts', results: { right: { ...session.results.right, farPoint: right }, left: session.results.left } };
    const t = triage(s.safetyFlags, s.results, s.targetMm);
    const out = JSON.parse(JSON.stringify(buildReport(s, t, device, '')));
    expect(out.version).toBe(13);
    expect(out.results.right.farPoint).toEqual({ trialsCm: [40, 55, 42], medianCm: 42, outcome: 'measured', estimateD: -2.25, rangeD: [-2.75, -1.75] });
    expect(out.results.left).toHaveProperty('farPoint', null);
    expect(JSON.parse(JSON.stringify(buildReport({ ...s, results: { ...s.results, left: { ...s.results.left, farPoint: left } } }, null, device, ''))).results.left.farPoint)
      .toEqual({ trialsCm: [68], medianCm: 68, outcome: 'beyond', estimateD: null, rangeD: null });
    // The triage reason for the measured eye is exported with the report; testedWith says it was with contact lenses in.
    expect(out.triage.reasons).toContain(
      'Right eye: the letters blurred beyond 42 cm, which suggests short sight of about −2.25 D (a rough estimate, not a prescription). The near vision (50 cm) test can miss this.',
    );
    expect(out).toMatchObject({ testedWith: 'contacts', chart: 'letters', fit: null, interview: null, recommendation: null, distance: { right: { n: 2 } } });
    expect(Object.keys(out.results.right)).toEqual(['logMAR', 'limited', 'astigmatism', 'duochrome', 'acuityAnswers', 'farPoint']);
  });
  it('always exports farPoint in each eye (v13), also for a session object from before the field', () => {
    const { farPoint: _f, ...old } = session.results.right;
    void _f;
    const s = { ...session, results: { right: old, left: old } } as unknown as Session;
    const out = JSON.parse(JSON.stringify(buildReport(s, null, device, '')));
    expect(out.results.right).toHaveProperty('farPoint', null);
    expect(out.results.left).toHaveProperty('farPoint', null);
  });
});
