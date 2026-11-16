import { useState } from 'react';
import { useClipPlayer } from '../hooks/useClipPlayer';
import type { Lang } from '../lib/i18n';
import { answer, audioPath, buildInterview, isAnswered, isSelected, QUESTIONS, questionCount, UI, type Answers } from '../lib/interview';
import type { Interview } from '../lib/recommend';

/**
 * Short interview (lib/interview.ts), one question per screen, in the session language chosen on the welcome
 * screen. A single-choice tap moves on; the multi-select complaints question has a Next button. "Skip questions"
 * ends with interview null (the language is kept: it belongs to the session).
 *
 * Read-aloud: each screen plays its recorded clip (the first screen: the intro clip, then question 1). Recorded
 * human clips only, never text-to-speech: a missing clip is silence and the sound controls stay hidden.
 * Mute lasts for the whole interview (component state only, never stored).
 */
export function InterviewStep({ lang, onDone }: { lang: Lang; onDone: (interview: Interview | null) => void }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [muted, setMuted] = useState(false);

  const q = QUESTIONS[idx];
  const clips = idx === 0 ? [audioPath(lang, 'intro'), audioPath(lang, q.id)] : [audioPath(lang, q.id)];
  const clip = useClipPlayer(clips, muted);

  const last = idx === QUESTIONS.length - 1;
  const finish = (interview: Interview | null) => {
    clip.stop();
    onDone(interview);
  };
  const next = (a: Answers) => (last ? finish(buildInterview(a)) : setIdx(idx + 1));
  const pick = (value: (typeof q.options)[number]['value']) => {
    const a = answer(answers, q, value);
    setAnswers(a);
    if (q.kind === 'single') next(a);
  };
  const showBack = idx > 0;

  return (
    <div className="card" lang={lang}>
      {idx === 0 && <p className="mb-4 rounded-2xl bg-sunk p-3 text-sm text-muted">{UI.intro[lang]}</p>}
      <p className="text-xs font-medium text-subtle">{questionCount(lang, idx + 1)}</p>
      <h2 className="mt-1 text-xl font-semibold leading-snug">{q.text[lang]}</h2>
      {clip.canPlay && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!muted && (
            <button type="button" className="btn btn-ghost min-h-11 px-4 py-2 text-sm" onClick={clip.replay}>
              <SpeakerIcon /> {UI.playAgain[lang]}
            </button>
          )}
          <button type="button" aria-pressed={muted} className="btn btn-ghost min-h-11 px-4 py-2 text-sm"
            onClick={() => setMuted(!muted)}>
            <SpeakerIcon off={!muted} /> {muted ? UI.soundOn[lang] : UI.soundOff[lang]}
          </button>
        </div>
      )}
      <div className="mt-4 grid gap-2">
        {q.options.map((o) => {
          const on = isSelected(q, answers, o.value);
          return (
            <button key={String(o.value)} type="button" aria-pressed={on}
              className={`btn min-h-14 rounded-2xl px-4 py-3 text-left text-base ${on ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => pick(o.value)}>
              {o.text[lang]}
            </button>
          );
        })}
      </div>
      {/* No Back on the first question: the language is chosen on the welcome screen now. */}
      {(showBack || q.kind === 'multi') && (
        <div className="mt-5 flex gap-3">
          {showBack && <button type="button" className="btn btn-ghost flex-1" onClick={() => setIdx(idx - 1)}>{UI.back[lang]}</button>}
          {q.kind === 'multi' && (
            <button type="button" className="btn btn-primary flex-1" disabled={!isAnswered(q, answers)} onClick={() => next(answers)}>
              {UI.next[lang]}
            </button>
          )}
        </div>
      )}
      <button type="button" className="mt-3 w-full py-3 text-sm text-muted underline" onClick={() => finish(null)}>
        {UI.skip[lang]}
      </button>
    </div>
  );
}

/** Small speaker glyph for the sound buttons (decorative; the button text names the action). */
function SpeakerIcon({ off = false }: { off?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-1 inline-block h-4 w-4 align-[-2px]" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      {off ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7" />}
    </svg>
  );
}
