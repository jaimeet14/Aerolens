import { describe, expect, it } from 'vitest';
import { pickedAnswer } from './dial';
import { demoFaceSample, FIT_FRAMES, measureFit, type FitCapture } from './face';
import {
  AFTER_CHECK_NOTE, ASTIGMATISM_NOTE, belowSixSix, CATEGORY, duochromeTendency, EYE_STRAIN_NOTE, HEADACHE_NOTE,
  MYOPIA_MANAGEMENT_NOTE, NO_INTERVIEW_NOTE, NONE_WITH_OPTIONS_NOTE, recommend, REFER_FIRST_NOTE, STATUS_TEXT,
  ZEISS_FAMILY, type Interview, type Recommendation,
} from './recommend';
import { triage } from './triage';
import type { Duochrome, EyeResult, Session } from './types';

const eye = (logMAR: number | null, extra: Partial<EyeResult> = {}): EyeResult => ({
  logMAR, limited: false, astigmatism: { present: false, lines: [], axisDeg: null }, duochrome: 'equal', acuityAnswers: [], ...extra,
});
const base: Session = {
  safetyFlags: [], correction: 'none', testedWith: 'none', pxPerMm: 5.85, dpr: 2, scaleSource: 'card', scaleSavedAt: null,
  targetMm: 500, focalCalibrated: true, demo: false, chart: 'letters', results: { right: eye(0), left: eye(0) }, fit: null,
  interview: null, lang: null,
};
const sess = (right: EyeResult, left: EyeResult, extra: Partial<Session> = {}): Session => ({ ...base, results: { right, left }, ...extra });
const ask = (x: Partial<Interview> = {}): Interview => ({
  ageBand: '18-39', screenHours: '2to6', nightDriving: false, outdoors: 'some', complaints: [], ...x,
});
/** recommend() with the triage the results screen computes. */
const rec = (s: Session, i: Interview | null = null) => recommend(s, triage(s.safetyFlags, s.results, s.targetMm), i);
const cats = (r: Recommendation) => r.items.map((i) => i.category);
const find = (r: Recommendation, category: string) => r.items.find((i) => i.category === category);
const duo = (right: Duochrome | null, left: Duochrome | null, logMAR = 0) => sess(eye(logMAR, { duochrome: right }), eye(logMAR, { duochrome: left }));
const capture = (): FitCapture => {
  const m = measureFit(Array.from({ length: FIT_FRAMES }, (_, i) => demoFaceSample(i)));
  if (!m.ok) throw new Error(m.message);
  return m.fit;
};

const SV = CATEGORY.singleVision, PAL = CATEGORY.progressive, OFFICE = CATEGORY.office, AR = CATEGORY.antiReflective;
const NIGHT = CATEGORY.nightDriving, BLUE = CATEGORY.blueLight, PHOTO = CATEGORY.photochromic;

describe('ZEISS family table', () => {
  it('has one name per option, all ZEISS', () => {
    expect(ZEISS_FAMILY).toEqual({
      progressive: 'ZEISS SmartLife Progressive',
      singleVision: 'ZEISS SmartLife Single Vision',
      office: 'ZEISS Officelens',
      nightDriving: 'ZEISS DriveSafe',
      blueLight: 'ZEISS BlueGuard',
      photochromic: 'ZEISS PhotoFusion X',
      antiReflective: 'ZEISS DuraVision Platinum',
      myopiaManagement: 'ZEISS MyoCare',
    });
    expect(Object.keys(CATEGORY).sort()).toEqual(Object.keys(ZEISS_FAMILY).sort());
  });
  it('every lens and option item takes its family from the table; a frame has none', () => {
    const r = rec({ ...sess(eye(0.2), eye(0.2)), fit: capture() }, ask({ ageBand: '40-59', screenHours: 'gt6', nightDriving: true, outdoors: 'lots' }));
    const names = Object.values(ZEISS_FAMILY) as string[];
    for (const i of r.items) {
      if (i.kind === 'frame') expect(i.zeissFamily).toBeNull();
      else expect(names).toContain(i.zeissFamily);
    }
    expect(find(r, PAL)?.zeissFamily).toBe(ZEISS_FAMILY.progressive);
    expect(find(r, OFFICE)?.zeissFamily).toBe(ZEISS_FAMILY.office);
  });
  it('has a line of text for every status', () => {
    expect(Object.keys(STATUS_TEXT).sort()).toEqual(['after-check', 'none', 'refer-first', 'suggest']);
  });
});

describe('duochromeTendency', () => {
  it('red clearer is a myopic tendency, green a hyperopic one, same or unanswered nothing', () => {
    expect(duochromeTendency('red')).toBe('myopic');
    expect(duochromeTendency('green')).toBe('hyperopic');
    expect(duochromeTendency('equal')).toBeNull();
    expect(duochromeTendency(null)).toBeNull();
  });
});

describe('belowSixSix (same rule as triage)', () => {
  it('counts worse than 6/6 and "could not read", not 6/6 or a screen-limited result', () => {
    expect(belowSixSix(eye(0.1))).toBe(true);
    expect(belowSixSix(eye(null))).toBe(true);
    expect(belowSixSix(eye(0))).toBe(false);
    expect(belowSixSix(eye(-0.1))).toBe(false);
    expect(belowSixSix(eye(0.2, { limited: true }))).toBe(false);
  });
});

describe('red flags override everything', () => {
  it('refers first, with no items and only the see-a-doctor note', () => {
    const s: Session = {
      ...sess(eye(0.6, { duochrome: 'red', astigmatism: pickedAnswer([3]) }), eye(0.2, { duochrome: 'red' })),
      safetyFlags: ['Double vision'], fit: capture(),
    };
    const i = ask({ ageBand: 'under18', screenHours: 'gt6', nightDriving: true, outdoors: 'lots', complaints: ['glare', 'eye-strain', 'headache', 'small-print'] });
    for (const r of [rec(s, i), rec(s, null)]) {
      expect(r).toEqual({ status: 'refer-first', items: [], notes: [REFER_FIRST_NOTE] });
    }
    expect(REFER_FIRST_NOTE).toMatch(/eye doctor/);
  });
  it('uses session.safetyFlags even if the triage passed in were not a referral', () => {
    const s = { ...sess(eye(0), eye(0)), safetyFlags: ['Eye pain or a red eye'] };
    expect(recommend(s, { level: 'ok', headline: '', reasons: [], notes: [] }, null).status).toBe('refer-first');
  });
});

describe('after-check: triage refers for other reasons', () => {
  it('keeps the items and frames them as to discuss after the eye check', () => {
    const r = rec(sess(eye(0.6), eye(0)));
    expect(r.status).toBe('after-check');
    expect(cats(r)).toEqual([SV, AR]);
    expect(r.notes[0]).toBe(AFTER_CHECK_NOTE);
    expect(AFTER_CHECK_NOTE).toMatch(/after the check/);
  });
  it('also for a two-line difference between the eyes, and with an interview', () => {
    const s = sess(eye(0.2), eye(0));
    expect(triage([], s.results).level).toBe('refer');
    const r = rec(s, ask({ ageBand: '40-59' }));
    expect(r.status).toBe('after-check');
    expect(cats(r)).toEqual([PAL, AR]);
  });
});

describe('no interview yet', () => {
  it('suggests single vision only when triage advises a lens, plus the age-question note', () => {
    const r = rec(sess(eye(0.2), eye(0.2)));
    expect(r.status).toBe('suggest');
    expect(cats(r)).toEqual([SV, AR]);
    expect(find(r, SV)?.reasons[0]).toBe(
      "Because your near vision at 50 cm is below 6/6 in both eyes (right 6/9.5, left 6/9.5): a single-vision lens made to the optometrist's prescription can sharpen it.",
    );
    expect(r.notes).toContain(NO_INTERVIEW_NOTE);
    expect(NO_INTERVIEW_NOTE).toMatch(/age question/);
  });
  it('gives nothing when triage finds no concern, still with the age-question note', () => {
    expect(rec(sess(eye(0), eye(0)))).toEqual({ status: 'none', items: [], notes: [NO_INTERVIEW_NOTE] });
  });
  it('drops the age-question note once there is an interview', () => {
    expect(rec(sess(eye(0), eye(0)), ask()).notes).not.toContain(NO_INTERVIEW_NOTE);
  });
});

describe('lens type', () => {
  it('40+ with a small-print complaint: progressive, even at 6/6', () => {
    const r = rec(sess(eye(0), eye(0)), ask({ ageBand: '40-59', complaints: ['small-print'] }));
    expect(r.status).toBe('suggest');
    expect(cats(r)).toEqual([PAL, AR]);
    expect(find(r, PAL)?.reasons[0]).toMatch(/^Because you are 40 or over and find small print hard to read: /);
  });
  it('60+ with near acuity below 6/6 in one eye: progressive, naming the eye', () => {
    const r = rec(sess(eye(0.1), eye(0)), ask({ ageBand: '60+' }));
    expect(cats(r)).toEqual([PAL, AR]);
    expect(find(r, PAL)?.reasons[0]).toMatch(/^Because you are 60 or over and your near vision at 50 cm is below 6\/6 in the right eye \(6\/7\.5\): /);
  });
  it('40+ at 6/6 with no complaint and normal screen time: no lens', () => {
    expect(rec(sess(eye(0), eye(0)), ask({ ageBand: '40-59' }))).toMatchObject({ status: 'none', items: [] });
  });
  it('a screen-limited 40+ eye does not count as below 6/6', () => {
    const r = rec(sess(eye(0.2, { limited: true }), eye(0.2, { limited: true })), ask({ ageBand: '40-59' }));
    expect(cats(r)).toEqual([]);
  });
  it('40+ with more than 6 h of screens: office lens', () => {
    const r = rec(sess(eye(0), eye(0)), ask({ ageBand: '40-59', screenHours: 'gt6' }));
    expect(r.status).toBe('suggest');
    expect(cats(r)).toEqual([OFFICE, AR, BLUE]);
    expect(find(r, OFFICE)?.reasons).toHaveLength(1);
  });
  it('40+ with small print and more than 6 h of screens: progressive plus an office lens as a second pair', () => {
    const r = rec(sess(eye(0), eye(0)), ask({ ageBand: '60+', screenHours: 'gt6', complaints: ['small-print'] }));
    expect(cats(r)).toEqual([PAL, OFFICE, AR, BLUE]);
    expect(find(r, OFFICE)?.reasons[1]).toMatch(/second pair/);
  });
  it('under 40 with more than 6 h of screens: no office lens', () => {
    const r = rec(sess(eye(0), eye(0)), ask({ ageBand: '18-39', screenHours: 'gt6' }));
    expect(cats(r)).not.toContain(OFFICE);
    expect(r.status).toBe('none');
  });
  it('under 40 when triage advises a lens: single vision, also with a small-print complaint', () => {
    for (const ageBand of ['under18', '18-39'] as const) {
      expect(cats(rec(sess(eye(0.2), eye(0.2)), ask({ ageBand, complaints: ['small-print'] })))).toEqual([SV, AR]);
    }
  });
  it('a dial-only advice gives single vision with the dial as the reason', () => {
    const coarse = { limited: true };
    const s = sess(eye(0.2, { ...coarse, astigmatism: pickedAnswer([3]) }), eye(0.2, coarse));
    expect(triage([], s.results).level).toBe('advise');
    const r = rec(s);
    expect(find(r, SV)?.reasons).toEqual(['Because the line dial hinted at astigmatism in the right eye, which a lens can correct.']);
  });
});

describe('duochrome notes (backlog #3)', () => {
  it('red clearer in one eye: a cautious myopic-tendency note with the 50 cm caveat', () => {
    const r = rec(duo('red', 'equal'));
    expect(r.notes).toContain('Red-green test: red looked clearer in the right eye, a possible myopic (short-sighted) tendency.');
    expect(r.notes.some((n) => /done at 50 cm \(near\).*hints only/.test(n))).toBe(true);
    expect(r.status).toBe('none'); // a tendency alone does not indicate a lens
  });
  it('green clearer in both eyes: one hyperopic-tendency note for both eyes', () => {
    const r = rec(duo('green', 'green'));
    expect(r.notes).toContain('Red-green test: green looked clearer in both eyes, a possible hyperopic (long-sighted) tendency.');
    expect(r.notes.filter((n) => n.startsWith('Red-green test:'))).toHaveLength(1);
  });
  it('mixed eyes get a note each', () => {
    const r = rec(duo('red', 'green'));
    expect(r.notes.filter((n) => n.startsWith('Red-green test:'))).toEqual([
      'Red-green test: red looked clearer in the right eye, a possible myopic (short-sighted) tendency.',
      'Red-green test: green looked clearer in the left eye, a possible hyperopic (long-sighted) tendency.',
    ]);
  });
  it('same or unanswered: no red-green notes and no caveat', () => {
    for (const s of [duo('equal', 'equal'), duo(null, null), duo('equal', null)]) {
      expect(rec(s).notes.some((n) => /red-green/i.test(n))).toBe(false);
    }
  });
  it('the caveat follows the test distance', () => {
    const s = { ...duo('red', null), targetMm: 400 };
    expect(rec(s).notes.some((n) => n.includes('done at 40 cm (near)'))).toBe(true);
  });
  it('a tendency is a reason on the suggested lens', () => {
    const r = rec(duo('red', 'red', 0.2));
    expect(find(r, SV)?.reasons).toContain(
      "Because the red-green test hinted at a myopic (short-sighted) tendency in both eyes: only the optometrist's refraction can confirm it and set the lens strength.",
    );
    const p = rec(duo(null, 'green'), ask({ ageBand: '40-59', complaints: ['small-print'] }));
    expect(find(p, PAL)?.reasons[1]).toMatch(/hyperopic \(long-sighted\) tendency in the left eye/);
  });
});

describe('myopia management', () => {
  it('under 18 with a myopic tendency: a note to ask the optometrist, naming the ZEISS family, no product item', () => {
    const r = rec(duo('equal', 'red'), ask({ ageBand: 'under18' }));
    expect(r.notes).toContain(MYOPIA_MANAGEMENT_NOTE);
    expect(MYOPIA_MANAGEMENT_NOTE).toMatch(/Ask the optometrist/);
    expect(MYOPIA_MANAGEMENT_NOTE).toContain(ZEISS_FAMILY.myopiaManagement);
    expect(cats(r)).not.toContain(CATEGORY.myopiaManagement);
  });
  it('not for a hyperopic tendency, not for adults and not without an interview', () => {
    expect(rec(duo('green', 'green'), ask({ ageBand: 'under18' })).notes).not.toContain(MYOPIA_MANAGEMENT_NOTE);
    expect(rec(duo('red', 'red'), ask({ ageBand: '18-39' })).notes).not.toContain(MYOPIA_MANAGEMENT_NOTE);
    expect(rec(duo('red', 'red')).notes).not.toContain(MYOPIA_MANAGEMENT_NOTE);
  });
});

describe('astigmatism (line dial)', () => {
  it('darker lines: a note that lenses can correct it and the optometrist measures it; no product', () => {
    const r = rec(sess(eye(0, { astigmatism: pickedAnswer([3]) }), eye(0, { astigmatism: pickedAnswer([2, 3]) })));
    expect(r.notes).toContain(ASTIGMATISM_NOTE(['right', 'left']));
    expect(ASTIGMATISM_NOTE(['right', 'left'])).toBe(
      'The line dial hinted at astigmatism in both eyes. Spectacle lenses can correct astigmatism; the optometrist measures how much and at which angle.',
    );
    expect(r.items).toEqual([]);
  });
  it('"All look the same" and "Not sure" give no note', () => {
    const r = rec(sess(eye(0), eye(0, { astigmatism: { present: false, lines: [], axisDeg: null, unsure: true } })));
    expect(r.notes.some((n) => /astigmatism/.test(n))).toBe(false);
  });
});

describe('lens options', () => {
  it('anti-reflective whenever a lens is suggested, never without one', () => {
    expect(cats(rec(sess(eye(0.2), eye(0.2))))).toContain(AR);
    expect(cats(rec(sess(eye(0), eye(0)), ask({ nightDriving: true })))).not.toContain(AR);
  });
  it('night driving or glare: a night-driving lens, one item with both reasons', () => {
    for (const i of [ask({ nightDriving: true }), ask({ complaints: ['glare'] })]) {
      expect(cats(rec(sess(eye(0), eye(0)), i))).toEqual([NIGHT]);
    }
    const both = find(rec(sess(eye(0), eye(0)), ask({ nightDriving: true, complaints: ['glare'] })), NIGHT);
    expect(both?.reasons).toEqual([
      'Because you drive at night and glare from lights bothers you: a night-driving lens is designed to reduce glare from headlights and street lights.',
    ]);
  });
  it('more than 6 h of screens or eye strain: a blue-light filter; eye strain adds a note', () => {
    expect(cats(rec(sess(eye(0), eye(0)), ask({ screenHours: 'gt6' })))).toEqual([BLUE]);
    const strain = rec(sess(eye(0), eye(0)), ask({ complaints: ['eye-strain'] }));
    expect(cats(strain)).toEqual([BLUE]);
    expect(strain.notes).toContain(EYE_STRAIN_NOTE);
    expect(cats(rec(sess(eye(0), eye(0)), ask({ screenHours: '2to6' })))).toEqual([]);
  });
  it('lots of time outdoors: photochromic; some or little: none', () => {
    expect(cats(rec(sess(eye(0), eye(0)), ask({ outdoors: 'lots' })))).toEqual([PHOTO]);
    expect(cats(rec(sess(eye(0), eye(0)), ask({ outdoors: 'little' })))).toEqual([]);
  });
  it('options can appear with status none, with a note that no lens is indicated', () => {
    const r = rec(sess(eye(0), eye(0)), ask({ nightDriving: true, outdoors: 'lots' }));
    expect(r.status).toBe('none');
    expect(cats(r)).toEqual([NIGHT, PHOTO]);
    expect(r.notes[0]).toBe(NONE_WITH_OPTIONS_NOTE);
    expect(rec(sess(eye(0), eye(0)), ask()).notes).not.toContain(NONE_WITH_OPTIONS_NOTE);
  });
  it('no interview: no interview-driven options', () => {
    expect(cats(rec(sess(eye(0.2), eye(0.2))))).toEqual([SV, AR]);
  });
  it('a headache complaint adds a note only', () => {
    const r = rec(sess(eye(0), eye(0)), ask({ complaints: ['headache'] }));
    expect(r).toMatchObject({ status: 'none', items: [] });
    expect(r.notes).toContain(HEADACHE_NOTE);
  });
});

describe('frame', () => {
  it('a captured fit gives one frame item from the existing frameFit result', () => {
    const fit = capture();
    const r = rec({ ...sess(eye(0.2), eye(0.2)), fit });
    const frames = r.items.filter((i) => i.kind === 'frame');
    expect(frames).toHaveLength(1);
    const [f] = frames;
    expect(r.items[r.items.length - 1]).toBe(f); // after the lenses and options
    expect(f.zeissFamily).toBeNull();
    expect(f.category).toBe(`Medium frame, front ${fit.frame.totalWidthMm[0]}–${fit.frame.totalWidthMm[1]} mm`);
    expect(fit.frame.size).toBe('medium');
    expect(f.reasons[0]).toBe('Because your face is about 138 mm wide at the cheekbones: a frame front of 132–140 mm neither pinches nor overhangs.');
    expect(f.reasons.slice(1)).toEqual(fit.frame.suggest.map((t) => expect.stringContaining(t.reason)));
    expect(f.reasons[1]).toMatch(/^Because your face shape looks oval: try most shapes/);
  });
  it('also listed when no lens is indicated; not when skipped or not reached', () => {
    expect(rec({ ...sess(eye(0), eye(0)), fit: capture() })).toMatchObject({ status: 'none', items: [{ kind: 'frame' }] });
    expect(rec({ ...sess(eye(0.2), eye(0.2)), fit: { status: 'skipped', failure: null } }).items.some((i) => i.kind === 'frame')).toBe(false);
    expect(rec({ ...sess(eye(0.2), eye(0.2)), fit: null }).items.some((i) => i.kind === 'frame')).toBe(false);
  });
});

describe('screening aid, never a prescription', () => {
  const scenarios: [Session, Interview | null][] = [
    [sess(eye(0.2, { duochrome: 'red', astigmatism: pickedAnswer([1]) }), eye(0.6, { duochrome: 'green' })), null],
    [{ ...sess(eye(null), eye(0.1)), fit: capture() }, ask({ ageBand: '60+', screenHours: 'gt6', nightDriving: true, outdoors: 'lots', complaints: ['glare', 'small-print', 'eye-strain', 'headache'] })],
    [duo('red', 'red', 0.3), ask({ ageBand: 'under18', screenHours: 'gt6' })],
    [sess(eye(0), eye(0)), ask({ ageBand: '40-59', complaints: ['small-print'] })],
  ];
  it('never outputs a lens power', () => {
    for (const [s, i] of scenarios) {
      const text = JSON.stringify(rec(s, i));
      expect(text).not.toMatch(/[+\-−]\s?\d+(\.\d+)?\s?D\b/);
      expect(text).not.toMatch(/dioptr|diopter|\bsph\b|\bcyl\b/i);
    }
  });
  it('every reason is a plain "Because …" sentence, and every item has one', () => {
    for (const [s, i] of scenarios) {
      for (const it of rec(s, i).items) {
        expect(it.reasons.length).toBeGreaterThan(0);
        for (const r of it.reasons) expect(r).toMatch(/^Because .+\.$/);
      }
    }
  });
  it('lists the lens first, then the lens options, then the frame', () => {
    const order = rec(scenarios[1][0], scenarios[1][1]).items.map((i) => i.kind);
    expect(order).toEqual(['lens', 'lens', 'coating', 'coating', 'coating', 'coating', 'frame']);
  });
});
