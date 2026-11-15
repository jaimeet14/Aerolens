import { median } from './optics';
import type { Recommendation } from './recommend';
import type { AcuityAnswer, Eye, Session } from './types';

export interface DistanceSummary { n: number; medianMm: number; minMm: number; maxMm: number }
export interface Device { userAgent: string; screenCss: [number, number]; viewportCss: [number, number]; dpr: number }

/** Median/min/max of the measured distance across acuity answers; null when nothing was measured. */
export function distanceSummary(answers: AcuityAnswer[]): DistanceSummary | null {
  const d = answers.map((a) => a.distanceMm).filter((x): x is number => x !== null && Number.isFinite(x));
  if (!d.length) return null;
  return { n: d.length, medianMm: Math.round(median(d)), minMm: Math.round(Math.min(...d)), maxMm: Math.round(Math.max(...d)) };
}

/**
 * The exported result: the session plus derived fields used for validation.
 * v3: adds session.chart ('E' | 'letters') and optional per-answer shown/picked.
 * v4: adds session.scaleSource ('card' | 'saved') and session.scaleSavedAt (ISO time or null).
 * v5: results[eye].astigmatism.unsure (true for a "Not sure" answer; present is false then). From v5 the
 *     dial lines are sized from the eye's acuity (dialLineWidthMm) instead of a fixed 0.7 mm, and the
 *     triage reasons say "near vision (50 cm)".
 * v6: results[eye].astigmatism is { present, lines, axisDeg, unsure? }. The single `hour` (one clock number)
 *     is gone: the person now selects the darker dial LINES (1 to 5), each named by its lower clock hour
 *     (1 = 1–7, 2 = 2–8, 3 = 3–9 horizontal, 4 = 4–10, 5 = 5–11, 6 = 6–12 vertical). axisDeg is the provisional
 *     rule-of-30 estimate (axisEstimate in lib/dial.ts), null when none or unclear. A v5 `hour` h is line ((h - 1) % 6) + 1.
 * v7: triage.notes (string[], always present, possibly empty). A dial finding ("Some are darker") in an eye at
 *     6/6 or better (logMAR ≤ 0, including screen-limited at 6/6) is now a note and no longer raises triage.level
 *     to 'advise'; in any other eye it still adds a reason and raises the level, as in v6.
 * v8: the test is always done WITHOUT glasses. Adds session.testedWith ('none' | 'contacts'; null if not answered):
 *     what the eyes were tested with ('contacts' = a contact lens wearer kept them in). session.correction
 *     ('none' | 'glasses' | 'contacts') now means what the person USUALLY wears, asked as a history question.
 *     In v7 and earlier, correction meant what was worn DURING the test (a 'glasses' run was done with glasses).
 * v9: adds fit (Phase 2 frame-fit step, see lib/face.ts), always present:
 *     - null: the step was not reached;
 *     - { status: 'skipped', failure }: skipped; failure is the last failed capture's message, or null;
 *     - { status: 'captured', frames, pd, face, shape, frame, notes }: pd.measured is the PD between the iris
 *       centres at pd.viewingDistanceMm (eyes converged on the screen); pd.distanceEstimate is the estimated
 *       distance PD (convergence-corrected with pd.rotationMm); face sizes in mm; shape { shape, ratios, reasons,
 *       nearby }; frame { totalWidthMm, size, lensWidthMm, bridgeMm, framePdMm, hints, suggest, avoid }.
 *     Every other field is unchanged from v8.
 * v10: adds recommendation (Phase 3 rule-based lens suggestions, see lib/recommend.ts), always present:
 *     - null: not computed;
 *     - { status, items, notes }: status 'refer-first' (red flags: items empty) | 'after-check' (triage refers for
 *       other reasons; items to discuss after the eye check) | 'suggest' (a lens is indicated) | 'none';
 *       items [{ kind: 'lens' | 'coating' | 'frame', category (generic name), zeissFamily (string, or null for a
 *       frame), reasons (plain "Because …" sentences) }], lens first, then lens options, then the frame;
 *       notes (string[], possibly empty) include the red-green (duochrome) tendency per eye.
 *     The interview is not asked yet, so v10 recommendations are computed with no interview (age unknown:
 *     single-vision lens only). Never contains lens powers. Every other field is unchanged from v9.
 * v11: adds interview and lang (Phase 3 short interview after the safety screen, see lib/interview.ts), always present:
 *     - interview: null (questions skipped, or not reached, e.g. red flags) | { ageBand: 'under18' | '18-39' |
 *       '40-59' | '60+', screenHours: 'lt2' | '2to6' | 'gt6', nightDriving: boolean, outdoors: 'little' | 'some' |
 *       'lots', complaints: ('headache' | 'glare' | 'small-print' | 'eye-strain')[] ([] = "None of these") };
 *     - lang: 'en' | 'hi' (the interview language), or null when no language was chosen.
 *     The recommendation is now computed with the interview (age known: progressive and office lenses possible).
 *     Every other field is unchanged from v10.
 * v12: session.chart may also be 'C': the Landolt C (ISO 8596 ring, gap = stroke = diameter / 5, see lib/landolt.ts),
 *     sized exactly like the Tumbling E (outer diameter = E height) on the same staircase. For a 'C' session each
 *     answer's shown/picked is the gap direction ('up' | 'right' | 'down' | 'left'; picked null = "can't see"), as for
 *     the E. A session whose interview language is Hindi (lang 'hi') gets chart 'C' without the chart question
 *     (Sloan letters are English letters); English or no language: the person chooses as before. Every other field
 *     is unchanged from v11.
 *     Whole-app language (still v12, same fields and values): lang is now chosen first, on the welcome screen, and
 *     every patient screen is shown in it; it is also the interview language. New sessions always have 'en' or 'hi'
 *     (null only in older reports), also when the questions were skipped. All report text (triage, recommendation,
 *     fit sentences, safetyFlags) stays English in every language, so a Hindi session's report equals the same
 *     session's English report except for lang itself.
 */
export function buildReport<T>(session: Session, triage: T, device: Device, at: string, recommendation: Recommendation | null = null) {
  const distance = Object.fromEntries(
    (Object.keys(session.results) as Eye[]).map((e) => [e, distanceSummary(session.results[e].acuityAnswers)]),
  ) as Record<Eye, DistanceSummary | null>;
  return {
    version: 12, at, ...session, fit: session.fit ?? null, interview: session.interview ?? null, lang: session.lang ?? null,
    distance, device, triage, recommendation,
  };
}
