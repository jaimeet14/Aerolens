import { describe, expect, it } from 'vitest';
import { presetChart } from './acuity';
import { BLOCKER_TEXT, startBlocker } from './calibration';
import { CORRECTION_TEXT, testedWithText, USUAL_TEXT, usualWearText } from './correction';
import { DIAL_TEXT, dialText, lineLabel, lineLabelIn } from './dial';
import {
  demoFaceSample, FACE_SHAPE_TEXT, FIT_FRAMES, FIT_PROBLEM_TEXT, fitProblemText, fitText, FRAME_HINT_TEXT, FRAME_ISSUE_TEXT, FRAME_SIZE_TEXT,
  frameIssueText, measureFit, MONO_DIFF_TEXT, rebuildFitText, SHAPE_REASON_TEXT, STYLE_TIPS_TEXT, type FitCapture, type FitProblem,
} from './face';
import { sessionEntry } from './history';
import { fmt, inLang, LANG_NAME, LANGS, listText, richParts, SCREENS, splitTemplate, tr, type Lang, type Text } from './i18n';
import * as interview from './interview';
import { CATEGORY, CATEGORY_TEXT, EYES_TEXT, recommend, REC_TEXT, STATUS_TEXT, STATUS_TEXTS, ZEISS_FAMILY, type Interview } from './recommend';
import { acuityText, RED_FLAG_TEXT, RED_FLAGS, redFlagText, snellenOf, triage, TRIAGE_TEXT } from './triage';
import type { DialAnswer, EyeResult, Session } from './types';

const DEVANAGARI = /[ऀ-ॿ]/;
/** Latin-script words a Hindi screen may keep: units and test terms, chart names, file and light abbreviations. */
const LATIN_OK = new Set(['PD', 'cm', 'mm', 'logMAR', 'E', 'C', 'Landolt', 'Sloan', 'JSON', 'LED', 'UV']);
/** ...plus the ZEISS family names, which are never translated. */
const ZEISS_WORDS = new Set(Object.values(ZEISS_FAMILY).flatMap((n) => n.split(' ')));
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const numbers = (s: string) => (s.replace(/\{\w+\}/g, '').match(/\d+(\.\d+)?/g) ?? []).sort();
const latinWords = (s: string) => s.replace(/\{\w+\}/g, '').match(/[A-Za-z]+/g) ?? [];
const englishLeft = (s: string) => latinWords(s).filter((w) => !LATIN_OK.has(w) && !ZEISS_WORDS.has(w));

/** Every Text in a nested table, with its path. */
function texts(x: unknown, path: string, out: [string, Text][] = []): [string, Text][] {
  if (x && typeof x === 'object' && !Array.isArray(x) && LANGS.every((l) => typeof (x as Record<string, unknown>)[l] === 'string')) {
    out.push([path, x as Text]);
  } else if (x && typeof x === 'object') {
    for (const [k, v] of Object.entries(x)) texts(v, `${path}.${k}`, out);
  }
  return out;
}

const ALL_TABLES = {
  screens: SCREENS, redFlags: RED_FLAG_TEXT, triage: TRIAGE_TEXT, dial: DIAL_TEXT, correction: CORRECTION_TEXT, usualWear: USUAL_TEXT,
  blocker: BLOCKER_TEXT, frameIssue: FRAME_ISSUE_TEXT, fitProblem: FIT_PROBLEM_TEXT, monoDiff: MONO_DIFF_TEXT, faceShape: FACE_SHAPE_TEXT,
  shapeReasons: SHAPE_REASON_TEXT, styleTips: STYLE_TIPS_TEXT, frameSize: FRAME_SIZE_TEXT, frameHints: FRAME_HINT_TEXT,
  category: CATEGORY_TEXT, status: STATUS_TEXTS, rec: REC_TEXT, eyes: EYES_TEXT, interview: { questions: interview.QUESTIONS, ui: interview.UI },
};
const ALL = texts(ALL_TABLES, 'all');

describe('string tables', () => {
  it('finds every table entry (sanity check of the walker)', () => {
    expect(ALL.length).toBeGreaterThan(300);
  });
  it('every string has exactly the languages in LANGS, none empty, Hindi in Devanagari', () => {
    for (const [path, t] of ALL) {
      expect(Object.keys(t).sort(), path).toEqual([...LANGS].sort());
      for (const l of LANGS) expect(t[l].trim(), `${path}.${l}`).not.toBe('');
      // A template that is only placeholders and punctuation ("{eye} ({snellen})") is the same in every language.
      const neutral = latinWords(t.en).length === 0;
      if (!neutral) expect(t.hi, path).toMatch(DEVANAGARI);
    }
  });
  it('the two languages use the same placeholders and the same numbers', () => {
    for (const [path, t] of ALL) {
      expect(placeholders(t.hi), path).toEqual(placeholders(t.en));
      expect(numbers(t.hi), path).toEqual(numbers(t.en));
    }
  });
  it('bold markers come in pairs, in both languages', () => {
    for (const [path, t] of ALL) for (const l of LANGS) expect(t[l].split('**').length % 2, `${path}.${l}`).toBe(1);
  });
  it('Hindi strings keep no English words apart from units, test terms and chart names', () => {
    for (const [path, t] of ALL) expect(englishLeft(t.hi), path).toEqual([]);
  });
  it('the interview text the user approved is unchanged, and Lang is re-exported from interview.ts', () => {
    expect(interview.LANGS).toBe(LANGS);
    expect(interview.LANG_NAME).toBe(LANG_NAME);
    expect(interview.QUESTIONS[0].text).toEqual({ en: 'How old are you?', hi: 'आपकी उम्र कितनी है?' });
    expect(interview.UI.intro.hi).toBe('आपकी रोज़ की आदतों के बारे में कुछ छोटे सवाल। इनसे ऑप्टोमेट्रिस्ट से बात करने के लिए लेंस के विकल्प सुझाए जाते हैं। यह सिर्फ़ एक शुरुआती जाँच है, चश्मे का नंबर (पर्चा) नहीं।');
    // The language question moved to the welcome screen, with the same words.
    expect(SCREENS.welcome.chooseLang).toEqual({ en: 'Choose a language', hi: 'भाषा चुनें' });
  });
  it('the welcome language buttons name each language in its own script', () => {
    expect(LANG_NAME).toEqual({ en: 'English', hi: 'हिन्दी' });
  });
  it('the dial message names the dial button with the same words', () => {
    for (const l of LANGS) expect(SCREENS.dial.allSix[l]).toContain(SCREENS.dial.same[l]);
    for (const l of LANGS) expect(SCREENS.scale.step4[l]).toContain(`**${SCREENS.scale.done[l]}**`);
    for (const l of LANGS) expect(SCREENS.calibration.step3[l]).toContain(`**${SCREENS.calibration.button[l]}**`);
  });
});

describe('helpers', () => {
  it('fmt fills placeholders, numbers as String(n), and leaves unknown ones', () => {
    expect(fmt('Hold {cm} cm, {x}', { cm: 50 })).toBe('Hold 50 cm, {x}');
    expect(fmt('{a}{a}', { a: 1.5 })).toBe('1.51.5');
    expect(fmt('{a}', { a: '{b}', b: 'no' })).toBe('{b}');
    expect(tr({ en: '{n} of 5', hi: '5 में से {n}' }, 'hi', { n: 2 })).toBe('5 में से 2');
  });
  it('splitTemplate cuts at placeholders; richParts at bold markers', () => {
    expect(splitTemplate('On {date}.')).toEqual(['On ', { key: 'date' }, '.']);
    expect(splitTemplate('{date} को')).toEqual([{ key: 'date' }, ' को']);
    expect(richParts('Tap **Go** now')).toEqual([{ text: 'Tap ', bold: false }, { text: 'Go', bold: true }, { text: ' now', bold: false }]);
    expect(richParts('**Go**')).toEqual([{ text: 'Go', bold: true }]);
  });
  it('listText joins in each language; inLang picks one language of a table', () => {
    expect(listText(['a'], 'en')).toBe('a');
    expect(listText(['a', 'b', 'c'], 'en')).toBe('a, b and c');
    expect(listText(['a', 'b'], 'hi')).toBe('a और b');
    expect(inLang({ x: { en: 'X', hi: 'एक्स' } }, 'hi')).toEqual({ x: 'एक्स' });
    expect(STATUS_TEXT).toEqual(inLang(STATUS_TEXTS, 'en'));
    expect(CATEGORY).toEqual(inLang(CATEGORY_TEXT, 'en'));
  });
});

/* ---------- generated sentences ---------- */

const eye = (logMAR: number | null, extra: Partial<EyeResult> = {}): EyeResult => ({
  logMAR, limited: false, astigmatism: { present: false, lines: [], axisDeg: null }, duochrome: 'equal', acuityAnswers: [], ...extra,
});
const dark = (lines: number[], axisDeg: number | null): DialAnswer => ({ present: true, lines, axisDeg });
const capture = (): FitCapture => {
  const m = measureFit(Array.from({ length: FIT_FRAMES }, (_, i) => demoFaceSample(i)));
  if (!m.ok) throw new Error(m.message);
  return m.fit;
};
const base: Session = {
  safetyFlags: [], correction: 'glasses', testedWith: 'none', pxPerMm: 5.85, dpr: 2, scaleSource: 'card', scaleSavedAt: null,
  targetMm: 500, focalCalibrated: true, demo: true, chart: 'C', results: { right: eye(0.2, { duochrome: 'red', astigmatism: dark([3], 90) }), left: eye(0) },
  fit: null, interview: null, lang: 'en',
};
const ask: Interview = { ageBand: '40-59', screenHours: 'gt6', nightDriving: true, outdoors: 'lots', complaints: ['glare', 'small-print', 'eye-strain', 'headache'] };
const RESULT_SETS: [EyeResult, EyeResult][] = [
  [eye(0), eye(0)], [eye(0.2), eye(0.2)], [eye(0.6), eye(0)], [eye(null), eye(0.1, { astigmatism: dark([2, 3], 75) })],
  [eye(0, { astigmatism: dark([6], 180) }), eye(0.2, { limited: true, duochrome: 'green' })], [eye(0.3, { duochrome: 'red' }), eye(0.1, { duochrome: 'green' })],
];
const INTERVIEWS: (Interview | null)[] = [
  null, ask, { ...ask, ageBand: '60+', complaints: [] }, { ...ask, ageBand: 'under18', screenHours: 'lt2', nightDriving: false, outdoors: 'little' },
  { ageBand: '18-39', screenHours: '2to6', nightDriving: false, outdoors: 'some', complaints: ['eye-strain'] },
];
/** English and Hindi versions of the same generated sentences carry the same numbers and no other English. */
function samePairs(en: string[], hi: string[], what: string) {
  expect(hi.length, what).toBe(en.length);
  hi.forEach((h, i) => {
    expect(h, what).toMatch(DEVANAGARI);
    expect(numbers(h), `${what}: ${h}`).toEqual(numbers(en[i]));
    expect(englishLeft(h), `${what}: ${h}`).toEqual([]);
  });
}

describe('triage in Hindi', () => {
  it('same level, Hindi words, same numbers; English by default is unchanged', () => {
    for (const [r, l] of RESULT_SETS) for (const t of [500, 400]) {
      const res = { right: r, left: l };
      const en = triage([], res, t), hi = triage([], res, t, 'hi');
      expect(triage([], res, t, 'en')).toEqual(en);
      expect(hi.level).toBe(en.level);
      samePairs([en.headline, ...en.reasons, ...en.notes], [hi.headline, ...hi.reasons, ...hi.notes], 'triage');
    }
  });
  it('reads naturally for one case', () => {
    expect(triage([], { right: eye(0.1), left: eye(0) }, 500, 'hi')).toEqual({
      level: 'advise',
      headline: 'चश्मे से मदद मिल सकती है: जब हो सके, आँखों की जाँच करवाएँ',
      reasons: ['दाईं आँख की पास की नज़र (50 cm) 6/6 से कम है (6/7.5); लेंस से मदद मिल सकती है।'],
      notes: [],
    });
  });
  it('acuity and Snellen text keep the numbers', () => {
    expect(acuityText(0.1, false, 'hi')).toBe('6/7.5 (logMAR 0.1)');
    expect(acuityText(0, true, 'hi')).toBe('6/6 या उससे बेहतर (logMAR ≤ 0.0)');
    expect(acuityText(0.25, true, 'hi')).toBe('logMAR 0.3 या उससे बेहतर');
    expect(acuityText(null, false, 'hi')).toBe('6/60 से भी कम');
    expect(snellenOf(null, 'hi')).toBe('6/60 से भी कम');
    expect(acuityText(0, true)).toBe('6/6 or better (logMAR ≤ 0.0)');
  });
});

describe('red flags in any language', () => {
  it('are stored and checked as the English strings; only the display is translated', () => {
    expect(Object.keys(RED_FLAG_TEXT)).toEqual([...RED_FLAGS]);
    for (const f of RED_FLAGS) {
      expect(redFlagText(f)).toBe(f);
      expect(redFlagText(f, 'hi')).toMatch(DEVANAGARI);
    }
    expect(redFlagText('An old flag', 'hi')).toBe('An old flag');
  });
  it('still refer first, with the same items, in Hindi', () => {
    const s: Session = { ...base, lang: 'hi', safetyFlags: ['Double vision', 'Eye pain or a red eye'] };
    const en = triage(s.safetyFlags, s.results, s.targetMm), hi = triage(s.safetyFlags, s.results, s.targetMm, 'hi');
    expect(hi.level).toBe('refer');
    expect(hi.headline).toBe('पहले आँखों के डॉक्टर को दिखाएँ');
    expect(hi.reasons).toEqual(['आपने बताया: एक चीज़ दो-दो दिखना', 'आपने बताया: आँख में दर्द या आँख लाल होना']);
    expect(en.reasons).toEqual(['You reported: double vision', 'You reported: eye pain or a red eye']);
    const rec = recommend(s, en, ask, 'hi');
    expect(rec.status).toBe('refer-first');
    expect(rec.items).toEqual([]);
    expect(rec.notes).toEqual([REC_TEXT.referFirst.hi]);
    // The report of a Hindi red-flag session still stores the English flags, triage and recommendation.
    const e = sessionEntry(s, { id: 'x', startedAt: '2026-11-15T10:00:00.000Z' }, device, '2026-11-15T10:05:00.000Z');
    expect(e.report.safetyFlags).toEqual(['Double vision', 'Eye pain or a red eye']);
    expect(e.report.triage).toEqual(en);
    expect(e.report.recommendation?.status).toBe('refer-first');
  });
});

describe('recommendations in Hindi', () => {
  it('same status, kinds, ZEISS names and counts as English; Hindi words, same numbers', () => {
    for (const fit of [null, capture()]) for (const [r, l] of RESULT_SETS) for (const iv of INTERVIEWS) {
      const s: Session = { ...base, results: { right: r, left: l }, fit };
      const t = triage(s.safetyFlags, s.results, s.targetMm);
      const en = recommend(s, t, iv), hi = recommend(s, t, iv, 'hi');
      expect(recommend(s, t, iv, 'en')).toEqual(en);
      expect(hi.status).toBe(en.status);
      expect(hi.items.map((i) => [i.kind, i.zeissFamily, i.reasons.length])).toEqual(en.items.map((i) => [i.kind, i.zeissFamily, i.reasons.length]));
      samePairs(en.items.map((i) => i.category), hi.items.map((i) => i.category), 'category');
      samePairs(en.items.flatMap((i) => i.reasons), hi.items.flatMap((i) => i.reasons), 'reasons');
      samePairs(en.notes, hi.notes, 'notes');
    }
  });
  it('keeps ZEISS family names untranslated, also inside a note', () => {
    const s: Session = { ...base, results: { right: eye(0.2, { duochrome: 'red' }), left: eye(0) } };
    const hi = recommend(s, triage([], s.results), { ...ask, ageBand: 'under18' }, 'hi');
    expect(hi.notes.some((n) => n.includes(ZEISS_FAMILY.myopiaManagement) && DEVANAGARI.test(n))).toBe(true);
    for (const it of hi.items) if (it.zeissFamily) expect(Object.values(ZEISS_FAMILY)).toContain(it.zeissFamily);
  });
});

describe('frame fit, dial and other screen text in Hindi', () => {
  it('fitText: English is the stored text; Hindi is rebuilt from the same numbers', () => {
    const fit = capture();
    const en = fitText(fit), hi = fitText(fit, 'hi');
    expect(en).toMatchObject({ reasons: fit.shape.reasons, hints: fit.frame.hints, suggest: fit.frame.suggest, avoid: fit.frame.avoid, notes: fit.notes });
    expect(rebuildFitText(fit, 'en')).toEqual({ reasons: fit.shape.reasons, hints: fit.frame.hints, suggest: fit.frame.suggest, avoid: fit.frame.avoid, notes: fit.notes });
    expect(en.shapeName).toBe('Oval');
    expect(hi.shapeName).toBe('अंडाकार');
    expect(hi.size).toBe('मध्यम');
    samePairs(en.reasons, hi.reasons, 'shape reasons');
    samePairs(en.hints, hi.hints, 'hints');
    samePairs(en.suggest.flatMap((t) => [t.style, t.reason]), hi.suggest.flatMap((t) => [t.style, t.reason]), 'styles');
    samePairs(en.avoid.flatMap((t) => [t.style, t.reason]), hi.avoid.flatMap((t) => [t.style, t.reason]), 'avoid');
    // A PD difference note, rebuilt from the stored PDs.
    const skew: FitCapture = { ...fit, pd: { ...fit.pd, distanceEstimate: { totalMm: 63, rightMm: 34, leftMm: 29 } }, notes: [] };
    expect(fitText(skew, 'hi').notes).toEqual(['दाईं और बाईं PD में 5.0 mm का फ़र्क है। ऐसा सच में हो सकता है, या सिर थोड़ा मुड़ा था: लेंस ऑर्डर करने से पहले दोबारा जाँच लें।']);
  });
  it('retake messages: the outcome keeps the English message and adds the problem', () => {
    const few = measureFit(Array.from({ length: 5 }, (_, i) => demoFaceSample(i)));
    expect(few.ok).toBe(false);
    if (!few.ok) {
      expect(few.problem).toEqual({ kind: 'few-frames', frames: 5 });
      expect(few.message).toBe(fitProblemText(few.problem));
      expect(fitProblemText(few.problem, 'hi')).toBe('कैमरे से सिर्फ़ 5 काम की तस्वीरें मिलीं (कम से कम 15 चाहिए)। हिलें नहीं और फिर से नापें।');
    }
    const problems: FitProblem[] = [
      { kind: 'unsteady', spreadMm: 3.44 }, { kind: 'pd-range', pdMm: 84.2 }, { kind: 'bridge', rightMm: 46.1, leftMm: 17 },
      { kind: 'outline', widthMm: 95.5, lengthMm: 250 }, { kind: 'timeout', seconds: 20, issue: 'distance', targetMm: 500 },
      { kind: 'timeout', seconds: 20, issue: null, targetMm: 500 },
    ];
    for (const p of problems) samePairs([fitProblemText(p)], [fitProblemText(p, 'hi')], p.kind);
    expect(fitProblemText(problems[4])).toBe('Could not get a steady view in 20 seconds. Hold the screen about 50 cm from your face.');
  });
  it('dial, frame-issue, correction and camera-blocker text', () => {
    const dials: (DialAnswer | null)[] = [
      { present: false, lines: [], axisDeg: null }, { present: false, lines: [], axisDeg: null, unsure: true },
      dark([3], 90), dark([2, 3], 75), dark([1, 3], null), dark([1, 3, 5], null), dark([], null),
    ];
    samePairs(dials.map((d) => dialText(d)), dials.map((d) => dialText(d, 'hi')), 'dial');
    expect(dialText(null, 'hi')).toBe('—');
    expect(lineLabelIn(3, 'hi')).toBe('3–9 (आड़ी)');
    expect(lineLabelIn(6, 'en')).toBe(lineLabel(6));
    for (const i of ['no-face', 'no-distance', 'distance', 'head-turned', 'head-tilted', 'eyes-closed'] as const) {
      samePairs([frameIssueText(i, 500)], [frameIssueText(i, 500, 'hi')], i);
    }
    samePairs(
      (['none', 'contacts', null] as const).map((t) => testedWithText(t)), (['none', 'contacts', null] as const).map((t) => testedWithText(t, 'hi')), 'tested',
    );
    samePairs(
      (['none', 'glasses', 'contacts', null] as const).map((c) => usualWearText(c)),
      (['none', 'glasses', 'contacts', null] as const).map((c) => usualWearText(c, 'hi')), 'usual',
    );
    for (const status of ['idle', 'error', 'ready'] as const) {
      const g = { demo: false, status, faceFound: false, calibrated: false };
      expect(startBlocker(g, 'hi')).toMatch(DEVANAGARI);
      expect(startBlocker(g, 'en')).toBe(startBlocker(g));
    }
  });
});

/* ---------- the stored report does not depend on the language ---------- */

const device = { userAgent: 'test', screenCss: [360, 780] as [number, number], viewportCss: [360, 700] as [number, number], dpr: 3 };

describe('report and history', () => {
  it("a Hindi session's report equals the same session's English report, apart from lang", () => {
    const meta = { id: 'same', startedAt: '2026-11-15T10:00:00.000Z' };
    for (const fit of [null, capture(), { status: 'skipped' as const, failure: 'Could not get a steady view in 20 seconds.' }])
      for (const [r, l] of RESULT_SETS) for (const iv of INTERVIEWS) {
        const s = (lang: Lang): Session => ({ ...base, lang, results: { right: r, left: l }, fit, interview: iv });
        const en = sessionEntry(s('en'), meta, device, '2026-11-15T10:05:00.000Z');
        const hi = sessionEntry(s('hi'), meta, device, '2026-11-15T10:05:00.000Z');
        expect(hi.report.lang).toBe('hi');
        expect({ ...hi, report: { ...hi.report, lang: 'en' } }).toEqual(en);
        // Nothing in the stored report is Hindi.
        expect(JSON.stringify(hi.report)).not.toMatch(DEVANAGARI);
      }
  });
  it('the report version is unchanged (history keeps reading v11 and v12)', () => {
    const e = sessionEntry({ ...base, lang: 'hi' }, { id: 'v', startedAt: '2026-11-15T10:00:00.000Z' }, device, '2026-11-15T10:05:00.000Z');
    expect(e.report.version).toBe(12);
  });
  it('Hindi still presets the Landolt C', () => {
    expect(presetChart('hi')).toBe('C');
    expect(presetChart('en')).toBeNull();
  });
});
