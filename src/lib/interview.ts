/*
 * Phase 3 step 2: the short interview (text + tap, English and Hindi) that feeds recommend().
 * Pure data and helpers; components/Interview.tsx only renders them.
 *
 * Each question has a stable id (q1..q5). The interview reads each screen aloud from pre-recorded human clips
 * (never text-to-speech), one per clip id ('intro', q1..q5) and language, at audioPath(lang, id)
 * (for example /audio/hi/q1.mp3), so ids must never be renumbered or reused. clipScript(lang, id) is the exact
 * wording to record; docs/recording-script.md lists it and a test keeps the two identical.
 *
 * Answers are a Partial<Interview>: a missing field is unanswered. For the complaints question an empty array
 * means "None of these" was chosen; deselecting every complaint makes it unanswered again (undefined).
 */
import type { Lang, Text } from './i18n';
import type { AgeBand, Complaint, Interview, Outdoors, ScreenHours } from './recommend';

// The language now belongs to the whole app (lib/i18n.ts, chosen on the welcome screen); re-exported for old imports.
export { LANG_NAME, LANGS, type Lang, type Text } from './i18n';

export type QuestionId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';
export type Answers = Partial<Interview>;
/** The value of the "None of these" option of the complaints question. */
export const NONE = 'none' as const;

interface Option<V> { value: V; text: Text }
interface Base<F extends keyof Interview, V> { id: QuestionId; field: F; text: Text; options: Option<V>[] }
export type SingleQuestion =
  | (Base<'ageBand', AgeBand> & { kind: 'single' })
  | (Base<'screenHours', ScreenHours> & { kind: 'single' })
  | (Base<'nightDriving', boolean> & { kind: 'single' })
  | (Base<'outdoors', Outdoors> & { kind: 'single' });
/** Multi-select: any of the complaints, or the last option "None of these" (value NONE), which clears the others. */
export type MultiQuestion = Base<'complaints', Complaint | typeof NONE> & { kind: 'multi' };
export type Question = SingleQuestion | MultiQuestion;

export const QUESTIONS: readonly Question[] = [
  {
    id: 'q1', field: 'ageBand', kind: 'single',
    text: { en: 'How old are you?', hi: 'आपकी उम्र कितनी है?' },
    options: [
      { value: 'under18', text: { en: 'Under 18', hi: '18 से कम' } },
      { value: '18-39', text: { en: '18 to 39', hi: '18 से 39' } },
      { value: '40-59', text: { en: '40 to 59', hi: '40 से 59' } },
      { value: '60+', text: { en: '60 or over', hi: '60 या उससे ज़्यादा' } },
    ],
  },
  {
    id: 'q2', field: 'screenHours', kind: 'single',
    text: {
      en: 'How many hours a day do you look at screens (phone, computer, TV)?',
      hi: 'आप दिन में कितने घंटे स्क्रीन देखते हैं (फ़ोन, कंप्यूटर, टीवी)?',
    },
    options: [
      { value: 'lt2', text: { en: 'Less than 2 hours', hi: '2 घंटे से कम' } },
      { value: '2to6', text: { en: '2 to 6 hours', hi: '2 से 6 घंटे' } },
      { value: 'gt6', text: { en: 'More than 6 hours', hi: '6 घंटे से ज़्यादा' } },
    ],
  },
  {
    id: 'q3', field: 'nightDriving', kind: 'single',
    text: {
      en: 'Do you drive or ride at night (car, scooter, bike)?',
      hi: 'क्या आप रात में गाड़ी चलाते हैं (कार, स्कूटर, बाइक)?',
    },
    options: [
      { value: true, text: { en: 'Yes', hi: 'हाँ' } },
      { value: false, text: { en: 'No', hi: 'नहीं' } },
    ],
  },
  {
    id: 'q4', field: 'outdoors', kind: 'single',
    text: {
      en: 'How much time do you spend outdoors in daylight?',
      hi: 'आप दिन में कितना समय बाहर धूप में रहते हैं?',
    },
    options: [
      { value: 'little', text: { en: 'Very little (mostly indoors)', hi: 'बहुत कम (ज़्यादातर अंदर)' } },
      { value: 'some', text: { en: 'Some', hi: 'थोड़ा-बहुत' } },
      { value: 'lots', text: { en: 'A lot (work or travel outside)', hi: 'काफ़ी (बाहर काम या आना-जाना)' } },
    ],
  },
  {
    id: 'q5', field: 'complaints', kind: 'multi',
    text: {
      en: 'Do any of these bother you? Tap all that apply.',
      hi: 'क्या इनमें से कोई परेशानी है? जितनी हों, सब चुनें।',
    },
    options: [
      { value: 'headache', text: { en: 'Headaches', hi: 'सिर दर्द' } },
      { value: 'glare', text: { en: 'Glare from lights (headlights, sun)', hi: 'रोशनी से आँखें चौंधियाना (गाड़ी की लाइट, धूप)' } },
      { value: 'small-print', text: { en: 'Small print is hard to read', hi: 'छोटे अक्षर पढ़ने में दिक्कत' } },
      { value: 'eye-strain', text: { en: 'Tired or strained eyes', hi: 'आँखों में थकान या खिंचाव' } },
      { value: NONE, text: { en: 'None of these', hi: 'इनमें से कोई नहीं' } },
    ],
  },
];

/** Interface strings around the questions (the language choice moved to the welcome screen, lib/i18n.ts WELCOME). */
export const UI = {
  intro: {
    en: 'A few quick questions about your daily routine. They help suggest lens options to discuss with the optometrist. This is a screening aid, not a prescription.',
    hi: 'आपकी रोज़ की आदतों के बारे में कुछ छोटे सवाल। इनसे ऑप्टोमेट्रिस्ट से बात करने के लिए लेंस के विकल्प सुझाए जाते हैं। यह सिर्फ़ एक शुरुआती जाँच है, चश्मे का नंबर (पर्चा) नहीं।',
  },
  back: { en: 'Back', hi: 'पीछे' },
  next: { en: 'Next', hi: 'आगे' },
  skip: { en: 'Skip questions', hi: 'सवाल छोड़ें' },
  // Read-aloud controls, shown only when a recorded clip has loaded. The sound buttons name the action.
  playAgain: { en: 'Play again', hi: 'फिर से सुनें' },
  soundOff: { en: 'Sound off', hi: 'आवाज़ बंद करें' },
  soundOn: { en: 'Sound on', hi: 'आवाज़ चालू करें' },
} satisfies Record<string, Text>;

/** "Question 2 of 5" / "सवाल 2 / 5". */
export function questionCount(lang: Lang, n: number, total: number = QUESTIONS.length): string {
  return lang === 'hi' ? `सवाल ${n} / ${total}` : `Question ${n} of ${total}`;
}

/** Recorded clips: the intro text, then one per question (question text followed by its options). */
export const CLIP_IDS = ['intro', 'q1', 'q2', 'q3', 'q4', 'q5'] as const satisfies readonly ('intro' | QuestionId)[];
export type ClipId = (typeof CLIP_IDS)[number];

/** Where the recorded clip lives (public/audio/<lang>/<id>.mp3, precached by the service worker). */
export function audioPath(lang: Lang, id: ClipId): string {
  return `/audio/${lang}/${id}.mp3`;
}

/** Ending punctuation that counts as a finished sentence: . ? ! and the Devanagari danda । */
const SENTENCE_END = /[.?!।]$/;
/** One spoken sentence: the text, plus "." (English) or "।" (Hindi) when it has no ending punctuation. */
export function sentence(lang: Lang, text: string): string {
  const t = text.trim();
  return SENTENCE_END.test(t) ? t : t + (lang === 'hi' ? '।' : '.');
}

/**
 * The exact words to record for a clip: for 'intro', UI.intro; for a question, the question text and then each
 * option, each as its own sentence (see sentence()), joined by single spaces.
 */
export function clipScript(lang: Lang, id: ClipId): string {
  if (id === 'intro') return sentence(lang, UI.intro[lang]);
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`unknown clip id ${id}`);
  return [q.text, ...q.options.map((o) => o.text)].map((t) => sentence(lang, t[lang])).join(' ');
}

const valuesOf = (field: keyof Interview) => {
  const q = QUESTIONS.find((x) => x.field === field);
  return (q?.options ?? []).map((o) => o.value as unknown);
};
const COMPLAINTS = valuesOf('complaints').filter((v): v is Complaint => v !== NONE);

/** True once the question has an answer (for complaints: at least one complaint, or "None of these"). */
export function isAnswered(q: Question, a: Answers): boolean {
  return a[q.field] !== undefined;
}

/** True when this option is shown as selected. */
export function isSelected(q: Question, a: Answers, value: Question['options'][number]['value']): boolean {
  if (q.kind === 'multi') {
    const c = a.complaints;
    return value === NONE ? c !== undefined && c.length === 0 : c !== undefined && c.includes(value as Complaint);
  }
  return a[q.field] === value;
}

/**
 * The complaints after one tap. "None of these" selects [] (or clears it when already chosen); a complaint is
 * toggled and clears "None of these"; removing the last complaint leaves the question unanswered (undefined).
 * The result keeps the option order.
 */
export function toggleComplaint(current: Complaint[] | undefined, value: Complaint | typeof NONE): Complaint[] | undefined {
  if (value === NONE) return current !== undefined && current.length === 0 ? undefined : [];
  const set = new Set(current ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  const next = COMPLAINTS.filter((c) => set.has(c));
  return next.length ? next : undefined;
}

/** The answers after tapping one option of question q. */
export function answer(a: Answers, q: Question, value: Question['options'][number]['value']): Answers {
  if (q.kind === 'multi') {
    const complaints = toggleComplaint(a.complaints, value as Complaint | typeof NONE);
    const { complaints: _old, ...rest } = a;
    void _old;
    return complaints === undefined ? rest : { ...rest, complaints };
  }
  return { ...a, [q.field]: value };
}

/**
 * A complete, valid Interview from the answers, or null when any question is unanswered or a value is not one
 * of the question's options. Complaints are deduplicated and put in option order; [] means "None of these".
 */
export function buildInterview(a: Answers): Interview | null {
  const ok = (field: keyof Interview) => valuesOf(field).includes(a[field]);
  if (!ok('ageBand') || !ok('screenHours') || !ok('nightDriving') || !ok('outdoors')) return null;
  const c = a.complaints;
  if (!Array.isArray(c) || !c.every((x) => (COMPLAINTS as unknown[]).includes(x))) return null;
  return {
    ageBand: a.ageBand as AgeBand,
    screenHours: a.screenHours as ScreenHours,
    nightDriving: a.nightDriving as boolean,
    outdoors: a.outdoors as Outdoors,
    complaints: COMPLAINTS.filter((x) => c.includes(x)),
  };
}
