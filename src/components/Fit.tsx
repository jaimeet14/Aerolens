import { useEffect, useState } from 'react';
import { DEMO, type Iris } from '../hooks/useIrisDistance';
import {
  checkFrame, FIT_FRAMES, fitProblemText, fitText, frameIssueText, measureFit, mmText,
  type FaceSample, type FitCapture, type FitProblem, type FitRecord, type FrameIssue,
} from '../lib/face';
import { FIT, FIT_SUMMARY, fmt, type Lang } from '../lib/i18n';
import { DistanceGuard } from './DistanceGuard';
import { Preview } from './Stages';

/** A capture that has not collected FIT_FRAMES usable frames by then fails with the most common problem. */
const CAPTURE_TIMEOUT_MS = 20000;

type Phase =
  | { name: 'intro' }
  | { name: 'capture' }
  | { name: 'failed'; problem: FitProblem }
  | { name: 'result'; fit: FitCapture };

/**
 * Frame-fit step, after both eyes: selfie PD, face shape and frame suggestions from FIT_FRAMES usable camera
 * frames (lib/face checkFrame and measureFit). The capture runs only within ±10% of the target distance
 * (DistanceGuard); the result can be retaken, and the whole step skipped. Needs the eye mode 'both'.
 * Messages are shown in `lang`; a skipped step records the last failure in English (FitSkipped.failure).
 */
export function FitStep({ lang, iris, targetMm, onDone }: { lang: Lang; iris: Iris; targetMm: number; onDone: (fit: FitRecord) => void }) {
  const T = FIT;
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });
  const [count, setCount] = useState(0);
  const [issue, setIssue] = useState<FrameIssue | null>(null);
  const [lastFailure, setLastFailure] = useState<FitProblem | null>(null);
  const capturing = phase.name === 'capture';
  const { subscribeFace } = iris;

  useEffect(() => {
    if (!capturing) return;
    const frames: FaceSample[] = [];
    const seen = new Map<FrameIssue, number>();
    let over = false;
    let unsubscribe = () => {};
    let timer = 0;
    const finish = (p: Phase) => {
      if (over) return;
      over = true;
      unsubscribe();
      window.clearTimeout(timer);
      if (p.name === 'failed') setLastFailure(p.problem);
      setPhase(p);
    };
    unsubscribe = subscribeFace((s) => {
      if (over) return;
      const problem = checkFrame(s, targetMm);
      setIssue(problem);
      if (problem) {
        seen.set(problem, (seen.get(problem) ?? 0) + 1);
        return;
      }
      frames.push(s);
      setCount(frames.length);
      if (frames.length < FIT_FRAMES) return;
      const out = measureFit(frames);
      finish(out.ok ? { name: 'result', fit: out.fit } : { name: 'failed', problem: out.problem });
    });
    timer = window.setTimeout(() => {
      const common = [...seen.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      finish({ name: 'failed', problem: { kind: 'timeout', seconds: CAPTURE_TIMEOUT_MS / 1000, issue: common, targetMm } });
    }, CAPTURE_TIMEOUT_MS);
    return () => {
      over = true;
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [capturing, subscribeFace, targetMm]);

  const start = () => {
    setCount(0);
    setIssue(null);
    setPhase({ name: 'capture' });
  };
  const skip = () => onDone({ status: 'skipped', failure: lastFailure ? fitProblemText(lastFailure, 'en') : null });

  if (phase.name === 'result') {
    return (
      <div className="space-y-3">
        <FitSummary fit={phase.fit} lang={lang} />
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-ghost" onClick={start}>{T.retake[lang]}</button>
          <button className="btn btn-primary" onClick={() => onDone(phase.fit)}>{T.seeResults[lang]}</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-center text-sm text-muted">{T.header[lang]}</p>
      <DistanceGuard lang={lang} iris={iris} targetMm={targetMm}>
        <div className="card">
          <h2 className="text-xl font-semibold">{T.title[lang]}</h2>
          <p className="mt-1 text-sm text-muted">{T.intro[lang]}</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>{T.step1[lang]}</li>
            <li>{T.step2[lang]}</li>
            <li>{T.step3[lang]}</li>
          </ol>
          <div className="mt-4">
            {DEMO ? <div className="grid h-40 place-items-center rounded-xl bg-sunk text-subtle">{T.demoCamera[lang]}</div> : <Preview stream={iris.stream} />}
          </div>
          {capturing ? (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={T.measuring[lang]}
                aria-valuemin={0} aria-valuemax={FIT_FRAMES} aria-valuenow={count}>
                <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${(count / FIT_FRAMES) * 100}%` }} />
              </div>
              <p className="mt-2 text-center text-sm text-muted" aria-live="polite">{issue ? frameIssueText(issue, targetMm, lang) : T.holdStill[lang]}</p>
            </div>
          ) : (
            <>
              {phase.name === 'failed' && (
                <p role="alert" className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">{fitProblemText(phase.problem, lang)}</p>
              )}
              <button className="btn btn-primary mt-4 w-full" onClick={start}>{phase.name === 'failed' ? T.retake[lang] : T.measure[lang]}</button>
            </>
          )}
        </div>
      </DistanceGuard>
      {/* Outside the guard, so the step can always be skipped. */}
      <button className="btn btn-ghost mt-3 w-full" onClick={skip}>{T.skip[lang]}</button>
    </div>
  );
}

const range = ([a, b]: [number, number]) => `${a}–${b} mm`;

/**
 * PD, face shape and frame suggestions of a capture (frame-fit step, results screen, staff screen). `lang`
 * defaults to English, which shows exactly the stored sentences (the staff screen passes none).
 */
export function FitSummary({ fit, lang = 'en' }: { fit: FitCapture; lang?: Lang }) {
  const T = FIT_SUMMARY;
  const { pd, frame } = fit;
  const text = fitText(fit, lang);
  const cm = Math.round(pd.viewingDistanceMm / 10);
  return (
    <div className="card">
      <h3 className="font-semibold">{T.title[lang]}</h3>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-subtle">{T.pdDistance[lang]}</dt>
        <dd>
          <span className="font-semibold tabular-nums">{mmText(pd.distanceEstimate.totalMm)} mm</span>{' '}
          <span className="whitespace-nowrap text-muted">
            {fmt(T.pdSides[lang], { right: mmText(pd.distanceEstimate.rightMm), left: mmText(pd.distanceEstimate.leftMm) })}
          </span>
        </dd>
        <dt className="text-subtle">{fmt(T.pdAt[lang], { cm })}</dt>
        <dd className="tabular-nums">{fmt(T.asMeasured[lang], { mm: mmText(pd.measured.totalMm) })}</dd>
        <dt className="text-subtle">{T.shape[lang]}</dt>
        <dd>{text.shapeName}</dd>
        <dt className="text-subtle">{T.frameWidth[lang]}</dt>
        <dd>{range(frame.totalWidthMm)} ({text.size})</dd>
        <dt className="text-subtle">{T.lensWidth[lang]}</dt>
        <dd>{range(frame.lensWidthMm)}</dd>
        <dt className="text-subtle">{T.bridge[lang]}</dt>
        <dd>{range(frame.bridgeMm)}</dd>
      </dl>
      <p className="mt-2 text-xs text-subtle">{fmt(T.pdNote[lang], { cm })}</p>

      <h4 className="mt-4 text-sm font-medium">{fmt(T.why[lang], { shape: text.shapeName.toLowerCase() })}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">{text.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      {text.nearby.length > 0 && (
        <p className="mt-1 text-sm text-muted">{fmt(T.close[lang], { shapes: text.nearby.join(', ') })}</p>
      )}

      <h4 className="mt-4 text-sm font-medium">{T.tryStyles[lang]}</h4>
      <ul className="mt-1 space-y-1 text-sm text-muted">
        {text.suggest.map((t) => <li key={t.style}><span className="font-medium text-ink">{t.style}</span>: {t.reason}</li>)}
      </ul>
      <h4 className="mt-3 text-sm font-medium">{T.avoidStyles[lang]}</h4>
      <ul className="mt-1 space-y-1 text-sm text-muted">
        {text.avoid.map((t) => <li key={t.style}><span className="font-medium text-ink">{t.style}</span>: {t.reason}</li>)}
      </ul>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-brand">{T.how[lang]}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{text.hints.map((h) => <li key={h}>{h}</li>)}</ul>
      </details>
      {text.notes.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-2xl bg-sunk p-3 text-sm text-muted">{text.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      )}
      <p className="mt-3 text-xs text-subtle">{T.disclaimer[lang]}</p>
    </div>
  );
}
