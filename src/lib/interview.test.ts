import { describe, expect, it } from 'vitest';
import recordingScript from '../../docs/recording-script.md?raw';
import {
  answer, audioPath, buildInterview, CLIP_IDS, clipScript, sentence, isAnswered, isSelected, LANG_NAME, LANGS, NONE, QUESTIONS, questionCount, toggleComplaint, UI,
  type Answers, type Question,
} from './interview';

const DEVANAGARI = /[ऀ-ॿ]/;
const q = (id: string) => QUESTIONS.find((x) => x.id === id) as Question;
const full: Answers = { ageBand: '40-59', screenHours: 'gt6', nightDriving: true, outdoors: 'some', complaints: ['glare'] };

describe('question set', () => {
  it('has five questions with stable, unique ids q1..q5 in order', () => {
    expect(QUESTIONS.map((x) => x.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
  });
  it('covers every Interview field exactly once', () => {
    expect(QUESTIONS.map((x) => x.field).sort()).toEqual(['ageBand', 'complaints', 'nightDriving', 'outdoors', 'screenHours']);
  });
  it('has English and Hindi (Devanagari) text for every question and option', () => {
    expect(LANGS).toEqual(['en', 'hi']);
    for (const x of QUESTIONS) {
      for (const t of [x.text, ...x.options.map((o) => o.text)]) {
        expect(t.en.trim()).not.toBe('');
        expect(t.hi).toMatch(DEVANAGARI);
        expect(Object.keys(t).sort()).toEqual(['en', 'hi']);
      }
    }
  });
  it('has both languages for every UI string and the language names', () => {
    for (const t of Object.values(UI)) {
      expect(t.en.trim()).not.toBe('');
      expect(t.hi).toMatch(DEVANAGARI);
    }
    expect(LANG_NAME).toEqual({ en: 'English', hi: 'हिन्दी' });
  });
  it('has unique option values within each question, matching the Interview types', () => {
    for (const x of QUESTIONS) expect(new Set(x.options.map((o) => o.value)).size).toBe(x.options.length);
    expect(q('q1').options.map((o) => o.value)).toEqual(['under18', '18-39', '40-59', '60+']);
    expect(q('q2').options.map((o) => o.value)).toEqual(['lt2', '2to6', 'gt6']);
    expect(q('q3').options.map((o) => o.value)).toEqual([true, false]);
    expect(q('q4').options.map((o) => o.value)).toEqual(['little', 'some', 'lots']);
    expect(q('q5').options.map((o) => o.value)).toEqual(['headache', 'glare', 'small-print', 'eye-strain', NONE]);
  });
  it('only the complaints question is multi-select', () => {
    expect(QUESTIONS.filter((x) => x.kind === 'multi').map((x) => x.id)).toEqual(['q5']);
  });
  it('names audio clips by language and id as mp3, and counts questions in both languages', () => {
    expect(audioPath('en', 'q1')).toBe('/audio/en/q1.mp3');
    expect(audioPath('hi', 'q5')).toBe('/audio/hi/q5.mp3');
    expect(audioPath('hi', 'intro')).toBe('/audio/hi/intro.mp3');
    expect(questionCount('en', 2)).toBe('Question 2 of 5');
    expect(questionCount('hi', 2)).toBe('सवाल 2 / 5');
  });
});

describe('complaints: none of these', () => {
  it('"None of these" selects an empty list, and a second tap clears it', () => {
    expect(toggleComplaint(undefined, NONE)).toEqual([]);
    expect(toggleComplaint([], NONE)).toBeUndefined();
  });
  it('"None of these" clears any chosen complaints', () => {
    expect(toggleComplaint(['headache', 'glare'], NONE)).toEqual([]);
  });
  it('a complaint clears "None of these"', () => {
    expect(toggleComplaint([], 'glare')).toEqual(['glare']);
  });
  it('toggles complaints, keeps option order, and is unanswered again when the last one is removed', () => {
    expect(toggleComplaint(['eye-strain'], 'headache')).toEqual(['headache', 'eye-strain']);
    expect(toggleComplaint(['headache', 'eye-strain'], 'headache')).toEqual(['eye-strain']);
    expect(toggleComplaint(['eye-strain'], 'eye-strain')).toBeUndefined();
  });
  it('shows the selection, with "None of these" only for an empty list', () => {
    const c = q('q5');
    expect(isSelected(c, { complaints: [] }, NONE)).toBe(true);
    expect(isSelected(c, {}, NONE)).toBe(false);
    expect(isSelected(c, { complaints: ['glare'] }, NONE)).toBe(false);
    expect(isSelected(c, { complaints: ['glare'] }, 'glare')).toBe(true);
    expect(isSelected(c, { complaints: ['glare'] }, 'headache')).toBe(false);
  });
});

describe('answer and isAnswered', () => {
  it('records a single-choice answer and replaces an earlier one', () => {
    let a = answer({}, q('q1'), '18-39');
    expect(a).toEqual({ ageBand: '18-39' });
    a = answer(a, q('q1'), '60+');
    expect(a).toEqual({ ageBand: '60+' });
    expect(isAnswered(q('q1'), a)).toBe(true);
    expect(isAnswered(q('q2'), a)).toBe(false);
  });
  it('records "No" for night driving as answered (false is a real answer)', () => {
    const a = answer({}, q('q3'), false);
    expect(a).toEqual({ nightDriving: false });
    expect(isAnswered(q('q3'), a)).toBe(true);
    expect(isSelected(q('q3'), a, false)).toBe(true);
    expect(isSelected(q('q3'), a, true)).toBe(false);
  });
  it('toggles complaints and drops the field when nothing is selected', () => {
    let a = answer({ ageBand: '18-39' }, q('q5'), 'glare');
    expect(a).toEqual({ ageBand: '18-39', complaints: ['glare'] });
    a = answer(a, q('q5'), 'glare');
    expect(a).toEqual({ ageBand: '18-39' });
    expect(isAnswered(q('q5'), a)).toBe(false);
    a = answer(a, q('q5'), NONE);
    expect(isAnswered(q('q5'), a)).toBe(true);
  });
});

describe('buildInterview', () => {
  it('builds the Interview from complete answers', () => {
    expect(buildInterview(full)).toEqual(full);
  });
  it('accepts "None of these" (empty complaints) and night driving false', () => {
    expect(buildInterview({ ...full, nightDriving: false, complaints: [] })).toEqual({ ...full, nightDriving: false, complaints: [] });
  });
  it('builds an Interview from taps through every question', () => {
    let a: Answers = {};
    a = answer(a, q('q1'), '60+');
    a = answer(a, q('q2'), 'lt2');
    a = answer(a, q('q3'), false);
    a = answer(a, q('q4'), 'lots');
    a = answer(a, q('q5'), 'small-print');
    a = answer(a, q('q5'), 'headache');
    expect(buildInterview(a)).toEqual({ ageBand: '60+', screenHours: 'lt2', nightDriving: false, outdoors: 'lots', complaints: ['headache', 'small-print'] });
  });
  it('is null when any question is unanswered', () => {
    expect(buildInterview({})).toBeNull();
    for (const field of ['ageBand', 'screenHours', 'nightDriving', 'outdoors', 'complaints'] as const) {
      const { [field]: _drop, ...rest } = full;
      void _drop;
      expect(buildInterview(rest)).toBeNull();
    }
  });
  it('is null for values that are not options', () => {
    expect(buildInterview({ ...full, ageBand: '30' as never })).toBeNull();
    expect(buildInterview({ ...full, nightDriving: 'yes' as never })).toBeNull();
    expect(buildInterview({ ...full, complaints: ['itchy'] as never })).toBeNull();
    expect(buildInterview({ ...full, complaints: [NONE] as never })).toBeNull();
    expect(buildInterview({ ...full, complaints: 'glare' as never })).toBeNull();
  });
  it('deduplicates complaints and puts them in option order', () => {
    expect(buildInterview({ ...full, complaints: ['eye-strain', 'headache', 'eye-strain'] })?.complaints).toEqual(['headache', 'eye-strain']);
  });
});

describe('read-aloud clips', () => {
  it('has the intro clip and one clip per question, with the stable question ids', () => {
    expect(CLIP_IDS).toEqual(['intro', ...QUESTIONS.map((x) => x.id)]);
  });
  it('adds "." (English) or "।" (Hindi) only when the text has no ending punctuation', () => {
    expect(sentence('en', 'Yes')).toBe('Yes.');
    expect(sentence('en', 'How old are you?')).toBe('How old are you?');
    expect(sentence('en', 'Tap all that apply.')).toBe('Tap all that apply.');
    expect(sentence('en', 'Wow!')).toBe('Wow!');
    expect(sentence('en', 'Very little (mostly indoors)')).toBe('Very little (mostly indoors).');
    expect(sentence('hi', 'हाँ')).toBe('हाँ।');
    expect(sentence('hi', 'सब चुनें।')).toBe('सब चुनें।');
    expect(sentence('hi', 'आपकी उम्र कितनी है?')).toBe('आपकी उम्र कितनी है?');
    expect(sentence('en', '  No  ')).toBe('No.');
  });
  it('reads a question and then each option, each as its own sentence', () => {
    expect(clipScript('en', 'q1')).toBe('How old are you? Under 18. 18 to 39. 40 to 59. 60 or over.');
    expect(clipScript('hi', 'q3')).toBe('क्या आप रात में गाड़ी चलाते हैं (कार, स्कूटर, बाइक)? हाँ। नहीं।');
    expect(clipScript('en', 'q5')).toBe(
      'Do any of these bother you? Tap all that apply. Headaches. Glare from lights (headlights, sun). '
        + 'Small print is hard to read. Tired or strained eyes. None of these.',
    );
  });
  it('reads the intro text for the intro clip', () => {
    expect(clipScript('en', 'intro')).toBe(UI.intro.en);
    expect(clipScript('hi', 'intro')).toBe(UI.intro.hi);
  });
  it('contains every question and option text of the clip, in both languages', () => {
    for (const x of QUESTIONS) {
      for (const lang of LANGS) {
        const s = clipScript(lang, x.id);
        expect(s.startsWith(x.text[lang])).toBe(true);
        for (const o of x.options) expect(s).toContain(o.text[lang]);
      }
    }
  });
});

describe('docs/recording-script.md', () => {
  const doc = recordingScript.replace(/\r\n/g, '\n');
  const fence = '`'.repeat(3);
  it('lists every clip with its file name and the exact words of clipScript', () => {
    for (const lang of LANGS) {
      for (const id of CLIP_IDS) {
        expect(doc).toContain(`\`public/audio/${lang}/${id}.mp3\`\n\n${fence}text\n${clipScript(lang, id)}\n${fence}`);
      }
    }
  });
  it("has no clip texts other than the app's clips", () => {
    expect(doc.split(`${fence}text\n`).length - 1).toBe(LANGS.length * CLIP_IDS.length);
  });
});
