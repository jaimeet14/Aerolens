import { describe, expect, it } from 'vitest';
import { acuityText, logMARText, snellenOf, triage } from './triage';
import type { Eye, EyeResult } from './types';

const eye = (logMAR: number | null, extra: Partial<EyeResult> = {}): EyeResult => ({
  logMAR, limited: false, astigmatism: { present: false, lines: [], axisDeg: null }, duochrome: 'equal', acuityAnswers: [], ...extra,
});
const both = (r: number | null, l: number | null): Record<Eye, EyeResult> => ({ right: eye(r), left: eye(l) });
const OK = 'No concern found today';
const ADVISE = 'Glasses are likely to help: get an eye test when you can';
const REFER = 'Please see an optometrist soon';

describe('triage', () => {
  it('any red flag refers and stops', () => {
    const t = triage(['Double vision'], both(0, 0));
    expect(t.level).toBe('refer');
  });
  it('6/6 both eyes is ok', () => {
    expect(triage([], both(0, 0)).level).toBe('ok');
  });
  it('6/9.5 gives advice, not referral', () => {
    expect(triage([], both(0.2, 0.2)).level).toBe('advise');
  });
  it('worse than 6/18 refers', () => {
    expect(triage([], both(0.6, 0.0)).level).toBe('refer');
  });
  it('could not read 6/60 refers', () => {
    expect(triage([], both(null, 0.0)).level).toBe('refer');
  });
  it('two-line difference between eyes advises (no longer refers); three lines refers', () => {
    expect(triage([], both(0.0, 0.2)).level).toBe('advise');
    expect(triage([], both(0.0, 0.3)).level).toBe('refer');
  });
  // A dial finding in an eye at 6/6 or better no longer gives advice (see the line-dial block below), so these
  // two use a coarse screen that stopped both eyes at 6/9.5 ("6/9.5 or better"): the dial is the only finding.
  it('astigmatism flag alone gives advice (eye not shown to reach 6/6)', () => {
    const coarse = { limited: true };
    const r = { right: eye(0.2, { ...coarse, astigmatism: { present: true, lines: [3], axisDeg: 90 } }), left: eye(0.2, coarse) };
    expect(triage([], r).level).toBe('advise');
  });
  it('darker dial lines give the same advice and reason whatever the lines or axis', () => {
    const reason = 'Right eye: some dial lines looked darker, which can point to astigmatism.';
    for (const a of [
      { present: true, lines: [3], axisDeg: 90 },
      { present: true, lines: [2, 3], axisDeg: 75 },
      { present: true, lines: [1, 3, 5], axisDeg: null },
    ]) {
      expect(triage([], { right: eye(0.2, { limited: true, astigmatism: a }), left: eye(0.2, { limited: true }) })).toEqual({
        level: 'advise', headline: ADVISE, reasons: [reason], notes: [],
      });
    }
  });
  it('a "Not sure" dial answer is treated like "Even" (no change in level)', () => {
    const r = { right: eye(0, { astigmatism: { present: false, lines: [], axisDeg: null, unsure: true } }), left: eye(0) };
    expect(triage([], r)).toMatchObject({ level: 'ok', reasons: [] });
  });
  it('snellen labels', () => {
    expect(snellenOf(0.0)).toBe('6/6');
    expect(snellenOf(0.5)).toBe('6/19');
    expect(snellenOf(null)).toBe('worse than 6/60');
  });
});

describe('triage reasons use near-vision wording (levels unchanged)', () => {
  it('below 6/6 gives the advise wording', () => {
    const t = triage([], both(0.2, 0.2));
    expect(t.level).toBe('advise');
    expect(t.reasons).toEqual([
      'Right eye near vision (50 cm) is below 6/6 (6/9.5); a lens may help.',
      'Left eye near vision (50 cm) is below 6/6 (6/9.5); a lens may help.',
    ]);
  });
  it('worse than 6/18, worse than 6/60, two lines apart and three lines apart', () => {
    expect(triage([], both(0.6, 0.6)).reasons).toEqual([
      'Right eye near vision (50 cm) is worse than 6/18 (6/24).',
      'Left eye near vision (50 cm) is worse than 6/18 (6/24).',
    ]);
    expect(triage([], both(null, 0.0)).reasons).toEqual([
      'Right eye near vision (50 cm): could not read the largest line (worse than 6/60).',
    ]);
    expect(triage([], both(0.0, 0.2)).reasons).toEqual([
      'Left eye near vision (50 cm) is below 6/6 (6/9.5); a lens may help.',
      "The two eyes' near vision (50 cm) differs by two lines.",
    ]);
    expect(triage([], both(0.0, 0.3)).reasons).toEqual([
      'Left eye near vision (50 cm) is below 6/6 (6/12); a lens may help.',
      "The two eyes' near vision (50 cm) differs by three or more lines.",
    ]);
  });
  it('the distance in the wording follows targetMm; levels do not', () => {
    const t = triage([], both(0.2, 0.2), 400);
    expect(t.level).toBe('advise');
    expect(t.reasons[0]).toBe('Right eye near vision (40 cm) is below 6/6 (6/9.5); a lens may help.');
  });
  it('a screen-limited 6/9.5 is not flagged as below 6/6 (unchanged)', () => {
    const r = { right: eye(0.2, { limited: true }), left: eye(0.2, { limited: true }) };
    expect(triage([], r)).toMatchObject({ level: 'ok', reasons: [] });
  });
});

describe('difference between the eyes (15 Nov 2026): two lines advise, three or more refer', () => {
  // A screen-limited eye above 6/6 adds no reason of its own, so the difference is the only finding.
  const limited = (logMAR: number) => eye(logMAR, { limited: true });
  const two = "The two eyes' near vision (50 cm) differs by two lines.";
  const three = "The two eyes' near vision (50 cm) differs by three or more lines.";

  it('exactly two lines (0.2) is advise, not refer, with the two-lines reason only', () => {
    for (const r of [{ right: limited(0.2), left: eye(0) }, { right: eye(0), left: limited(0.2) }]) {
      expect(triage([], r)).toEqual({ level: 'advise', headline: ADVISE, reasons: [two], notes: [] });
    }
  });
  it('three lines (0.3) refers, with the three-lines reason only', () => {
    for (const r of [{ right: limited(0.3), left: eye(0) }, { right: eye(0), left: limited(0.3) }]) {
      expect(triage([], r)).toEqual({ level: 'refer', headline: REFER, reasons: [three], notes: [] });
    }
    expect(triage([], { right: limited(0.4), left: eye(-0.1) })).toMatchObject({ level: 'refer', reasons: [three] });
  });
  it('between two and three lines (0.25) is still advise', () => {
    expect(triage([], { right: limited(0.25), left: eye(0) })).toEqual({ level: 'advise', headline: ADVISE, reasons: [two], notes: [] });
  });
  it('one line apart adds nothing', () => {
    expect(triage([], { right: limited(0.1), left: eye(0) })).toEqual({ level: 'ok', headline: OK, reasons: [], notes: [] });
  });
  it('keeps the 1e-9 tolerance at both thresholds', () => {
    const level = (d: number) => triage([], { right: limited(d), left: eye(0) }).level;
    expect(level(0.2 - 1e-10)).toBe('advise');
    expect(level(0.2 - 1e-6)).toBe('ok');
    expect(level(0.3 - 1e-10)).toBe('refer');
    expect(level(0.3 - 1e-6)).toBe('advise');
    // Floating-point line differences: 0.4 − 0.1 and 0.2 − (−0.1) are a hair above 0.3; 0.5 − 0.3 is 0.2.
    expect(triage([], both(0.1, 0.4)).reasons).toContain(three);
    expect(triage([], { right: limited(0.2), left: eye(-0.1) }).reasons).toEqual([three]);
    expect(triage([], both(0.5, 0.3)).reasons).toContain(two);
    expect(triage([], both(-0.1, 0.1)).reasons).toContain(two);
  });
  it('an eye that could not read the largest line is not compared (it refers on its own)', () => {
    const t = triage([], both(null, 0.3));
    expect(t.level).toBe('refer');
    expect(t.reasons.some((x) => x.startsWith("The two eyes'"))).toBe(false);
  });
  it('the other rules are unchanged: worse than 6/18 refers, 6/19 advises, red flags refer first', () => {
    expect(triage([], both(0.6, 0.6)).level).toBe('refer');
    expect(triage([], both(0.5, 0.5))).toMatchObject({ level: 'advise', headline: ADVISE });
    expect(triage([], { right: eye(0.6), left: eye(0.4) })).toMatchObject({ level: 'refer', headline: REFER });
    expect(triage(['Double vision'], both(0, 0.3))).toEqual({
      level: 'refer', headline: 'Please see an eye doctor first', reasons: ['You reported: double vision'], notes: [],
    });
  });

  // Validation V3 (run 2), V4 and V5 (docs/validation.md) were 'refer' only because of the old two-line rule.
  describe('regression: V3, V4 and V5 are now advise', () => {
    const darker = (lines: number[], axisDeg: number | null) => ({ present: true, lines, axisDeg });
    it('V3 run 2: −3 D myope, R 6/19 / L 6/12, dial even', () => {
      const t = triage([], { right: eye(0.5, { duochrome: 'green' }), left: eye(0.3, { duochrome: 'green' }) });
      expect(t).toEqual({
        level: 'advise',
        headline: ADVISE,
        reasons: [
          'Right eye near vision (50 cm) is below 6/6 (6/19); a lens may help.',
          'Left eye near vision (50 cm) is below 6/6 (6/12); a lens may help.',
          two,
        ],
        notes: [],
      });
    });
    it('V4: 2 D astigmatism, presbyope, R 6/12 / L 6/19, dial darker in both eyes', () => {
      const t = triage([], { right: eye(0.3, { astigmatism: darker([1, 2], 45) }), left: eye(0.5, { astigmatism: darker([5, 6], 165) }) });
      expect(t.level).toBe('advise');
      expect(t.headline).toBe(ADVISE);
      expect(t.reasons).toEqual([
        'Right eye near vision (50 cm) is below 6/6 (6/12); a lens may help.',
        'Right eye: some dial lines looked darker, which can point to astigmatism.',
        'Left eye near vision (50 cm) is below 6/6 (6/19); a lens may help.',
        'Left eye: some dial lines looked darker, which can point to astigmatism.',
        two,
      ]);
    });
    it('V5: R 6/12 / L 6/19, dial darker in both eyes (right direction unclear)', () => {
      const t = triage([], { right: eye(0.3, { astigmatism: darker([3, 5], null) }), left: eye(0.5, { astigmatism: darker([3, 4], 105) }) });
      expect(t).toMatchObject({ level: 'advise', headline: ADVISE });
      expect(t.reasons).toContain(two);
      expect(t.reasons).not.toContain(three);
    });
  });
});

describe('headlines (15 Nov 2026), English and Hindi', () => {
  it('ok, advise and refer', () => {
    expect(triage([], both(0, 0)).headline).toBe(OK);
    expect(triage([], both(0, 0), 500, 'hi').headline).toBe('आज की जाँच में कोई परेशानी नहीं मिली');
    expect(triage([], both(0.1, 0.1)).headline).toBe(ADVISE);
    expect(triage([], both(0.1, 0.1), 500, 'hi').headline).toBe('चश्मे से मदद मिल सकती है: जब हो सके, आँखों की जाँच करवाएँ');
    expect(triage([], both(0.6, 0.6)).headline).toBe(REFER);
    expect(triage([], both(0.6, 0.6), 500, 'hi').headline).toBe('कृपया जल्द ही ऑप्टोमेट्रिस्ट को दिखाएँ');
  });
  it('red flags keep their headline in both languages', () => {
    expect(triage(['Double vision'], both(0, 0)).headline).toBe('Please see an eye doctor first');
    expect(triage(['Double vision'], both(0, 0), 500, 'hi').headline).toBe('पहले आँखों के डॉक्टर को दिखाएँ');
  });
  it('the difference reasons in Hindi', () => {
    const at = (d: number) => triage([], { right: eye(d, { limited: true }), left: eye(0) }, 500, 'hi');
    expect(at(0.2)).toMatchObject({ level: 'advise', reasons: ['दोनों आँखों की पास की नज़र (50 cm) में दो लाइनों का फ़र्क है।'] });
    expect(at(0.3)).toMatchObject({ level: 'refer', reasons: ['दोनों आँखों की पास की नज़र (50 cm) में तीन या ज़्यादा लाइनों का फ़र्क है।'] });
  });
});

describe('line dial: a note at 6/6 or better, advice otherwise', () => {
  const darker = (lines: number[], axisDeg: number | null) => ({ present: true, lines, axisDeg });
  const note = (e: string) => `${e} eye: some dial lines looked darker — possible mild astigmatism. Mention it at your next eye check.`;
  const reason = (e: string) => `${e} eye: some dial lines looked darker, which can point to astigmatism.`;

  it('V2-like: right 6/6 or better (screen limit) with darker lines is a note; the left eye alone makes it advise', () => {
    const r = {
      right: eye(0, { limited: true, astigmatism: darker([4], 120), duochrome: 'green' }),
      left: eye(0.1, { astigmatism: darker([2, 3], 75) }),
    };
    const t = triage([], r);
    expect(t).toEqual({
      level: 'advise',
      headline: ADVISE,
      reasons: ['Left eye near vision (50 cm) is below 6/6 (6/7.5); a lens may help.', reason('Left')],
      notes: [note('Right')],
    });
    expect(t.reasons.some((x) => x.startsWith('Right'))).toBe(false);
    // Without the left eye's findings, the right eye's dial answer alone does not raise the level.
    expect(triage([], { ...r, left: eye(0) }).level).toBe('ok');
  });
  it('an eye at 6/6 with darker lines and the other eye 6/6 and even: ok with one note', () => {
    for (const a of [darker([3], 90), darker([2, 3], 75), darker([1, 3, 5], null)]) {
      expect(triage([], { right: eye(0, { astigmatism: a }), left: eye(0) })).toEqual({
        level: 'ok', headline: OK, reasons: [], notes: [note('Right')],
      });
    }
  });
  it('6/6 or better includes a screen-limited 6/6 and 6/4.8', () => {
    for (const right of [eye(0, { limited: true }), eye(-0.1), eye(-0.1, { limited: true })]) {
      const t = triage([], { right: { ...right, astigmatism: darker([6], 180) }, left: eye(0) });
      expect(t).toMatchObject({ level: 'ok', reasons: [], notes: [note('Right')] });
    }
  });
  it('both eyes at 6/6 with darker lines: ok with a note per eye, right first', () => {
    const r = { right: eye(0, { astigmatism: darker([3], 90) }), left: eye(-0.1, { astigmatism: darker([6], 180) }) };
    expect(triage([], r)).toMatchObject({ level: 'ok', reasons: [], notes: [note('Right'), note('Left')] });
  });
  it('an eye below 6/6 with darker lines: advise and the same reason as before, no note', () => {
    const r = { right: eye(0.1, { astigmatism: darker([3], 90) }), left: eye(0) };
    expect(triage([], r)).toEqual({
      level: 'advise',
      headline: ADVISE,
      reasons: ['Right eye near vision (50 cm) is below 6/6 (6/7.5); a lens may help.', reason('Right')],
      notes: [],
    });
  });
  it('a coarse screen limited at 6/9.5 with darker lines: advise as before (not shown to be 6/6)', () => {
    const r = { right: eye(0.2, { limited: true, astigmatism: darker([3], 90) }), left: eye(0.2, { limited: true }) };
    expect(triage([], r)).toEqual({
      level: 'advise', headline: ADVISE, reasons: [reason('Right')], notes: [],
    });
  });
  it('could not read the largest line, with darker lines: refer, and the dial reason as before', () => {
    const t = triage([], { right: eye(null, { astigmatism: darker([3], 90) }), left: eye(null) });
    expect(t.level).toBe('refer');
    expect(t.reasons).toContain(reason('Right'));
    expect(t.notes).toEqual([]);
  });
  it('"All look the same" and "Not sure" add neither a reason nor a note, at any acuity', () => {
    for (const a of [{ present: false, lines: [], axisDeg: null }, { present: false, lines: [], axisDeg: null, unsure: true as const }]) {
      for (const logMAR of [0, 0.1]) {
        const t = triage([], { right: eye(logMAR, { astigmatism: a }), left: eye(logMAR) });
        expect(t.notes).toEqual([]);
        expect(t.reasons.some((x) => x.includes('dial'))).toBe(false);
      }
    }
    expect(triage([], both(0, 0)).notes).toEqual([]);
  });
  it('a red flag refers with no notes, even with darker lines at 6/6', () => {
    const t = triage(['Double vision'], { right: eye(0, { astigmatism: darker([3], 90) }), left: eye(0) });
    expect(t).toEqual({ level: 'refer', headline: 'Please see an eye doctor first', reasons: ['You reported: double vision'], notes: [] });
  });
});

describe('acuityText (results screen)', () => {
  it('shows Snellen and logMAR', () => {
    expect(acuityText(0.1, false)).toBe('6/7.5 (logMAR 0.1)');
    expect(acuityText(0.0, false)).toBe('6/6 (logMAR 0.0)');
    expect(acuityText(-0.1, false)).toBe('6/4.8 (logMAR −0.1)');
  });
  it('says "or better" at the screen limit', () => {
    expect(acuityText(0.0, true)).toBe('6/6 or better (logMAR ≤ 0.0)');
    expect(acuityText(0.2, true)).toBe('6/9.5 or better (logMAR ≤ 0.2)');
  });
  it('could not read the largest line', () => {
    expect(acuityText(null, false)).toBe('worse than 6/60');
  });
  it('logMARText', () => {
    expect(logMARText(0.5)).toBe('0.5');
    expect(logMARText(-0)).toBe('0.0');
    expect(logMARText(-0.1)).toBe('−0.1');
  });
});
