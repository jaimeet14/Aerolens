import type { Eye, EyeResult } from './types';
import { LINES, SNELLEN } from './acuity';
import { cmText, dioptreText, farPointAdvises } from './farpoint';
import { fmt, type Lang, type Text } from './i18n';

/**
 * The red-flag questions. These English strings are what session.safetyFlags stores and the report exports, in
 * every language, so the referral check (any flag at all) never depends on the screen language. Shown translated
 * with redFlagText.
 */
export const RED_FLAGS = [
  'Sudden loss or sudden change of vision',
  'Eye pain or a red eye',
  'Flashes of light or new floaters',
  'Double vision',
] as const;
export type RedFlag = (typeof RED_FLAGS)[number];

/** Each red flag in every language, keyed by the stored English string. */
export const RED_FLAG_TEXT: Record<RedFlag, Text> = {
  'Sudden loss or sudden change of vision': { en: 'Sudden loss or sudden change of vision', hi: 'अचानक दिखना बंद होना या नज़र में अचानक बदलाव' },
  'Eye pain or a red eye': { en: 'Eye pain or a red eye', hi: 'आँख में दर्द या आँख लाल होना' },
  'Flashes of light or new floaters': { en: 'Flashes of light or new floaters', hi: 'रोशनी की चमक या नए तैरते धब्बे दिखना' },
  'Double vision': { en: 'Double vision', hi: 'एक चीज़ दो-दो दिखना' },
};

/** A stored red flag for display in `lang`; a string that is not one of RED_FLAGS is shown as stored. */
export function redFlagText(flag: string, lang: Lang = 'en'): string {
  return Object.prototype.hasOwnProperty.call(RED_FLAG_TEXT, flag) ? RED_FLAG_TEXT[flag as RedFlag][lang] : flag;
}

export type TriageLevel = 'ok' | 'advise' | 'refer';

export interface Triage {
  level: TriageLevel;
  headline: string;
  reasons: string[];
  /** Informational findings that do not change the level (e.g. a dial finding in an eye at 6/6 or better). Always present, possibly empty. */
  notes: string[];
}

/** The eye as the triage sentences name it: "Right" (+ " eye ..." in the English sentence) / "दाईं आँख". */
const EYE_WORD: Record<Eye, Text> = {
  right: { en: 'Right', hi: 'दाईं आँख' },
  left: { en: 'Left', hi: 'बाईं आँख' },
};

/** Triage and acuity sentences. {eye} is EYE_WORD, {near} is `near`, {snellen} a chart line such as 6/9.5. */
export const TRIAGE_TEXT = {
  worse60: { en: 'worse than 6/60', hi: '6/60 से भी कम' },
  orBetter: { en: '{snellen} or better (logMAR ≤ {logmar})', hi: '{snellen} या उससे बेहतर (logMAR ≤ {logmar})' },
  logmarOrBetter: { en: 'logMAR {logmar} or better', hi: 'logMAR {logmar} या उससे बेहतर' },
  referFirst: { en: 'Please see an eye doctor first', hi: 'पहले आँखों के डॉक्टर को दिखाएँ' },
  reported: { en: 'You reported: {flag}', hi: 'आपने बताया: {flag}' },
  near: { en: 'near vision ({cm} cm)', hi: 'पास की नज़र ({cm} cm)' },
  noLine: {
    en: '{eye} eye {near}: could not read the largest line (worse than 6/60).',
    hi: '{eye} की {near}: सबसे बड़ी लाइन भी नहीं पढ़ी जा सकी (6/60 से भी कम)।',
  },
  worse18: { en: '{eye} eye {near} is worse than 6/18 ({snellen}).', hi: '{eye} की {near} 6/18 से कम है ({snellen})।' },
  below6: { en: '{eye} eye {near} is below 6/6 ({snellen}); a lens may help.', hi: '{eye} की {near} 6/6 से कम है ({snellen}); लेंस से मदद मिल सकती है।' },
  dialNote: {
    en: '{eye} eye: some dial lines looked darker — possible mild astigmatism. Mention it at your next eye check.',
    hi: '{eye}: गोले की कुछ लाइनें ज़्यादा गहरी दिखीं — हल्का एस्टिग्मैटिज़्म (सिलेंडर नंबर) हो सकता है। अगली बार आँखों की जाँच में यह बताएँ।',
  },
  dialReason: {
    en: '{eye} eye: some dial lines looked darker, which can point to astigmatism.',
    hi: '{eye}: गोले की कुछ लाइनें ज़्यादा गहरी दिखीं, जो एस्टिग्मैटिज़्म (सिलेंडर नंबर) का संकेत हो सकता है।',
  },
  farPoint: {
    en: '{eye} eye: the letters blurred beyond {cm} cm, which suggests short sight of about {d} D (a rough estimate, not a prescription). The {near} test can miss this.',
    hi: '{eye}: {cm} cm से आगे अक्षर धुंधले हो गए, यानी लगभग {d} D का मायोपिया (दूर का कम दिखना) हो सकता है (मोटा अंदाज़ा, चश्मे का नंबर नहीं)। {near} की जाँच में यह छूट सकता है।',
  },
  differ2: { en: "The two eyes' {near} differs by two lines.", hi: 'दोनों आँखों की {near} में दो लाइनों का फ़र्क है।' },
  differ3: { en: "The two eyes' {near} differs by three or more lines.", hi: 'दोनों आँखों की {near} में तीन या ज़्यादा लाइनों का फ़र्क है।' },
  headRefer: { en: 'Please see an optometrist soon', hi: 'कृपया जल्द ही ऑप्टोमेट्रिस्ट को दिखाएँ' },
  headAdvise: {
    en: 'Glasses are likely to help: get an eye test when you can',
    hi: 'चश्मे से मदद मिल सकती है: जब हो सके, आँखों की जाँच करवाएँ',
  },
  headOk: { en: 'No concern found today', hi: 'आज की जाँच में कोई परेशानी नहीं मिली' },
} satisfies Record<string, Text>;

export function snellenOf(logMAR: number | null, lang: Lang = 'en'): string {
  if (logMAR === null) return TRIAGE_TEXT.worse60[lang];
  const i = LINES.findIndex((l) => Math.abs(l - logMAR) < 1e-9);
  return i >= 0 ? SNELLEN[i] : `logMAR ${logMAR.toFixed(1)}`;
}

/** logMAR to one decimal, with a real minus sign: 0.1 -> "0.1", -0.1 -> "−0.1". */
export function logMARText(logMAR: number): string {
  const t = Math.abs(logMAR).toFixed(1);
  return logMAR < 0 && t !== '0.0' ? `−${t}` : t;
}

/**
 * The acuity value shown on the results screen: "6/7.5 (logMAR 0.1)".
 * When the screen limit was reached the real acuity may be better: "6/6 or better (logMAR ≤ 0.0)".
 * Numbers are the same in every language; only the words around them change.
 */
export function acuityText(logMAR: number | null, limited: boolean, lang: Lang = 'en'): string {
  if (logMAR === null) return snellenOf(null, lang);
  const isLine = LINES.some((l) => Math.abs(l - logMAR) < 1e-9);
  const logmar = logMARText(logMAR);
  if (!isLine) return limited ? fmt(TRIAGE_TEXT.logmarOrBetter[lang], { logmar }) : `logMAR ${logmar}`;
  return limited
    ? fmt(TRIAGE_TEXT.orBetter[lang], { snellen: snellenOf(logMAR, lang), logmar })
    : `${snellenOf(logMAR, lang)} (logMAR ${logmar})`;
}

/** PROVISIONAL: a difference between the eyes of this many logMAR (two lines) gives 'advise'... */
export const DIFF_ADVISE = 0.2;
/** ...and of this many (three lines or more) gives 'refer'. Compared with a 1e-9 tolerance. */
export const DIFF_REFER = 0.3;

/**
 * Provisional triage thresholds. A triage aid, never a prescription.
 * These must be reviewed with an optometrist before real-world use.
 * Acuity is measured at `targetMm` (50 cm), so it is near/intermediate vision, not distance vision:
 * the reasons say so. Levels and thresholds do not depend on `targetMm`.
 *
 * Line dial ("Some are darker"): in an eye at 6/6 or better (logMAR ≤ 0, including a screen-limited
 * "6/6 or better") it is a note only and does not change the level: the dial picks up astigmatism too
 * small to prescribe (validation V2). In any other eye (below 6/6, unknown, or screen-limited at a
 * coarser line) it raises the level to 'advise' with a reason, as before.
 *
 * Difference between the eyes (changed 15 Nov 2026): |R − L| ≥ 0.3 logMAR (three lines or more) -> 'refer';
 * 0.2 ≤ |R − L| < 0.3 (two lines) -> 'advise'. Two lines of uncorrected near acuity is within test-retest noise
 * and usually means the eyes need different lenses (an optometrist's job), so 'refer' is kept for "see someone soon".
 *
 * Far point (added 16 Nov 2026, PROVISIONAL): a 'measured' far-point estimate of FAR_ADVISE_D (−1.5 D) or stronger in
 * either eye (lib/farpoint.ts farPointAdvises) raises 'ok' to 'advise' with a reason, because the 50 cm acuity test
 * misses short sight up to about −2 D (known issue #1). It never lowers a level and never refers; 'beyond',
 * 'already-blurred', a skipped step (null) and reports without the field add nothing.
 *
 * `lang` changes only the words of headline, reasons and notes, never the level. The report and history always
 * store the English triage (lang 'en'); the results screen shows a second one in the session language.
 * `flags` are the stored English RED_FLAGS strings.
 */
export function triage(flags: string[], results: Record<Eye, EyeResult>, targetMm = 500, lang: Lang = 'en'): Triage {
  const T = TRIAGE_TEXT;
  if (flags.length > 0) {
    return {
      level: 'refer',
      headline: T.referFirst[lang],
      // English keeps its old lower-case wording; other languages show the translated flag.
      reasons: flags.map((f) => fmt(T.reported[lang], { flag: lang === 'en' ? f.toLowerCase() : redFlagText(f, lang) })),
      notes: [],
    };
  }
  const reasons: string[] = [];
  const notes: string[] = [];
  const eyes: Eye[] = ['right', 'left'];
  const near = fmt(T.near[lang], { cm: Math.round(targetMm / 10) });
  let level = 'ok' as TriageLevel;
  const up = (l: TriageLevel) => {
    const order: TriageLevel[] = ['ok', 'advise', 'refer'];
    if (order.indexOf(l) > order.indexOf(level)) level = l;
  };

  for (const e of eyes) {
    const r = results[e];
    const v = { eye: EYE_WORD[e][lang], near };
    if (r.logMAR === null) {
      up('refer');
      reasons.push(fmt(T.noLine[lang], v));
    } else if (r.logMAR > 0.5) {
      up('refer');
      reasons.push(fmt(T.worse18[lang], { ...v, snellen: snellenOf(r.logMAR, lang) }));
    } else if (r.logMAR > 0.0 && !r.limited) {
      up('advise');
      reasons.push(fmt(T.below6[lang], { ...v, snellen: snellenOf(r.logMAR, lang) }));
    }
    if (r.astigmatism?.present) {
      if (r.logMAR !== null && r.logMAR <= 1e-9) {
        notes.push(fmt(T.dialNote[lang], v));
      } else {
        up('advise');
        reasons.push(fmt(T.dialReason[lang], v));
      }
    }
    const fp = r.farPoint;
    if (farPointAdvises(fp)) {
      up('advise');
      reasons.push(fmt(T.farPoint[lang], { ...v, cm: cmText(fp.medianCm), d: dioptreText(fp.estimateD) }));
    }
  }
  const [a, b] = [results.right.logMAR, results.left.logMAR];
  if (a !== null && b !== null) {
    const diff = Math.abs(a - b);
    if (diff >= DIFF_REFER - 1e-9) {
      up('refer');
      reasons.push(fmt(T.differ3[lang], { near }));
    } else if (diff >= DIFF_ADVISE - 1e-9) {
      up('advise');
      reasons.push(fmt(T.differ2[lang], { near }));
    }
  }

  const headline =
    level === 'refer'
      ? T.headRefer[lang]
      : level === 'advise'
        ? T.headAdvise[lang]
        : T.headOk[lang];
  return { level, headline, reasons, notes };
}
