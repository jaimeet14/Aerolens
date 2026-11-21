import { useState, type ReactNode } from 'react';
import { Bloom, Eyebrow, Footer, Heading, TextLink, TickRow, TickRows } from './Coral';
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
    <div lang={lang}>
      {idx === 0 && <p className="mb-4 text-sm text-muted">{UI.intro[lang]}</p>}
      <div className="flex min-h-11 items-center justify-between gap-2">
        <Eyebrow>{questionCount(lang, idx + 1)}</Eyebrow>
        {/* Sound controls only when a clip loaded; icon buttons in coral, named by the same words as before. */}
        {clip.canPlay && (
          <div className="flex items-center gap-1">
            {!muted && (
              <IconButton label={UI.playAgain[lang]} onClick={clip.replay}><ReplayIcon /></IconButton>
            )}
            <IconButton label={muted ? UI.soundOn[lang] : UI.soundOff[lang]} pressed={muted} onClick={() => setMuted(!muted)}>
              <SpeakerIcon off={!muted} />
            </IconButton>
          </div>
        )}
      </div>
      <Heading className="mt-1 text-[22px] leading-snug">{q.text[lang]}</Heading>
      <TickRows className="mt-3">
        {q.options.map((o) => (
          <TickRow key={String(o.value)} selected={isSelected(q, answers, o.value)} onClick={() => pick(o.value)}>
            {o.text[lang]}
          </TickRow>
        ))}
      </TickRows>
      {/* No Back on the first question: the language is chosen on the welcome screen now. */}
      <Footer left={<>
        {showBack && <TextLink onClick={() => setIdx(idx - 1)}>{UI.back[lang]}</TextLink>}
        <TextLink onClick={() => finish(null)}>{UI.skip[lang]}</TextLink>
      </>}>
        {q.kind === 'multi' && (
          <Bloom disabled={!isAnswered(q, answers)} onClick={() => next(answers)}>{UI.next[lang]}</Bloom>
        )}
      </Footer>
    </div>
  );
}

/** A 44 px round coral icon button; the label is its accessible name (and tooltip). */
function IconButton({ label, pressed, onClick, children }: { label: string; pressed?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}
      className="al-focus grid h-11 w-11 place-items-center rounded-full text-brand ring-1 ring-brand-pale hover:bg-polyp">
      {children}
    </button>
  );
}

/** Replay arrow for "Play again" (decorative; the button is named). */
function ReplayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v4h4" />
    </svg>
  );
}

/** Small speaker glyph for the sound buttons (decorative; the button text names the action). */
function SpeakerIcon({ off = false }: { off?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      {off ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7" />}
    </svg>
  );
}
