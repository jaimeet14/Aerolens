import { useState } from 'react';
import type { Lang } from '../lib/i18n';
import { answer, buildInterview, isAnswered, isSelected, QUESTIONS, questionCount, UI, type Answers } from '../lib/interview';
import type { Interview } from '../lib/recommend';

/**
 * Short interview (lib/interview.ts), one question per screen, in the session language chosen on the welcome
 * screen. A single-choice tap moves on; the multi-select complaints question has a Next button. "Skip questions"
 * ends with interview null (the language is kept: it belongs to the session).
 */
export function InterviewStep({ lang, onDone }: { lang: Lang; onDone: (interview: Interview | null) => void }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const q = QUESTIONS[idx];
  const last = idx === QUESTIONS.length - 1;
  const next = (a: Answers) => (last ? onDone(buildInterview(a)) : setIdx(idx + 1));
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
      <button type="button" className="mt-3 w-full py-3 text-sm text-muted underline" onClick={() => onDone(null)}>
        {UI.skip[lang]}
      </button>
    </div>
  );
}
