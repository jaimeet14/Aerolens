import { useEffect, useState } from 'react';
import { DEMO, type Iris } from '../hooks/useIrisDistance';
import {
  checkFrame, FIT_FRAMES, fitProblemText, fitText, frameIssueText, measureFit, mmText,
  type FaceSample, type FitCapture, type FitProblem, type FitRecord, type FrameIssue,
} from '../lib/face';
import { FIT, FIT_SUMMARY, fmt, type Lang } from '../lib/i18n';
import { BigNumber, Bloom, CameraFrame, Eyebrow, Footer, Heading, Note, RowItem, Rows, Steps, TextLink } from './Coral';
import { DistanceGuard } from './DistanceGuard';
import { DemoCamera, Preview } from './Stages';

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
      <div>
        <FitSummary fit={phase.fit} lang={lang} />
        <Footer left={<TextLink onClick={start}>{T.retake[lang]}</TextLink>}>
          <Bloom size={72} onClick={() => onDone(phase.fit)}>{T.seeResults[lang]}</Bloom>
        </Footer>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow className="mb-0.5">{T.header[lang]}</Eyebrow>
      {/* "Skip this step" is always available: in the footer row (links left, bloom right) while the guard shows the step,
          and on its own under the guard's "move closer" message otherwise. */}
      <DistanceGuard lang={lang} iris={iris} targetMm={targetMm}
        outside={(ok) => !ok && <TextLink className="mt-2" onClick={skip}>{T.skip[lang]}</TextLink>}>
        <div>
          <Heading>{T.title[lang]}</Heading>
          <p className="mt-1 text-sm text-muted">{T.intro[lang]}</p>
          <Steps className="mt-3" items={[T.step1[lang], T.step2[lang], T.step3[lang]]} />
          <div className="mt-7">
            <CameraFrame shape="oval">{DEMO ? <DemoCamera text={T.demoCamera[lang]} /> : <Preview stream={iris.stream} />}</CameraFrame>
          </div>
          {capturing ? (
            <div className="mt-6">
              <div className="h-1.5 overflow-hidden rounded-full bg-brand-pale" role="progressbar" aria-label={T.measuring[lang]}
                aria-valuemin={0} aria-valuemax={FIT_FRAMES} aria-valuenow={count}>
                <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${(count / FIT_FRAMES) * 100}%` }} />
              </div>
              <p className="mt-2 text-center text-sm text-muted" aria-live="polite">{issue ? frameIssueText(issue, targetMm, lang) : T.holdStill[lang]}</p>
              <Footer className="mt-3" left={<TextLink onClick={skip}>{T.skip[lang]}</TextLink>} />
            </div>
          ) : (
            <>
              {phase.name === 'failed' && (
                <Note tone="warn" role="alert" className="mt-6">{fitProblemText(phase.problem, lang)}</Note>
              )}
              {/* Inside the distance guard: no pulse. */}
              <Footer left={<TextLink onClick={skip}>{T.skip[lang]}</TextLink>}>
                <Bloom pulse={false} onClick={start}>{phase.name === 'failed' ? T.retake[lang] : T.measure[lang]}</Bloom>
              </Footer>
            </>
          )}
        </div>
      </DistanceGuard>
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
    <section className="print-block">
      <h3 className="text-lg font-extrabold tracking-[-0.3px]">{T.title[lang]}</h3>
      {/* PD and face shape as big numbers; the rest as hairline rows. */}
      <div className="mt-2 grid grid-cols-2 gap-x-3 border-b border-line pb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted">{T.pdDistance[lang]}</p>
          <BigNumber value={mmText(pd.distanceEstimate.totalMm)} unit="mm" />
          <p className="mt-0.5 text-xs text-muted">
            {fmt(T.pdSides[lang], { right: mmText(pd.distanceEstimate.rightMm), left: mmText(pd.distanceEstimate.leftMm) })}
          </p>
        </div>
        <div className="min-w-0 border-l border-line pl-3">
          <p className="text-xs font-semibold text-muted">{T.shape[lang]}</p>
          <p className="text-[26px] font-extrabold leading-tight tracking-[-0.6px] break-words">{text.shapeName}</p>
        </div>
      </div>
      <Rows>
        <RowItem label={fmt(T.pdAt[lang], { cm })}><span className="tabular-nums">{fmt(T.asMeasured[lang], { mm: mmText(pd.measured.totalMm) })}</span></RowItem>
        <RowItem label={T.frameWidth[lang]}>{range(frame.totalWidthMm)} ({text.size})</RowItem>
        <RowItem label={T.lensWidth[lang]}>{range(frame.lensWidthMm)}</RowItem>
        <RowItem label={T.bridge[lang]}>{range(frame.bridgeMm)}</RowItem>
      </Rows>
      <p className="mt-1 text-xs text-muted">{fmt(T.pdNote[lang], { cm })}</p>

      <h4 className="mt-4 text-sm font-bold">{fmt(T.why[lang], { shape: text.shapeName.toLowerCase() })}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">{text.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      {text.nearby.length > 0 && (
        <p className="mt-1 text-sm text-muted">{fmt(T.close[lang], { shapes: text.nearby.join(', ') })}</p>
      )}

      <h4 className="mt-4 text-sm font-bold">{T.tryStyles[lang]}</h4>
      <ul className="mt-1 divide-y divide-line text-sm text-muted">
        {text.suggest.map((t) => <li key={t.style} className="py-1.5"><span className="font-semibold text-ink">{t.style}</span>: {t.reason}</li>)}
      </ul>
      <h4 className="mt-3 text-sm font-bold">{T.avoidStyles[lang]}</h4>
      <ul className="mt-1 divide-y divide-line text-sm text-muted">
        {text.avoid.map((t) => <li key={t.style} className="py-1.5"><span className="font-semibold text-ink">{t.style}</span>: {t.reason}</li>)}
      </ul>

      <details className="mt-3 text-sm">
        <summary className="al-focus flex min-h-11 cursor-pointer items-center rounded-md font-semibold text-ocean">{T.how[lang]}</summary>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">{text.hints.map((h) => <li key={h}>{h}</li>)}</ul>
      </details>
      {text.notes.length > 0 && (
        <Note className="mt-3"><ul className="space-y-1 text-muted">{text.notes.map((n) => <li key={n}>{n}</li>)}</ul></Note>
      )}
      <p className="mt-3 text-xs text-muted">{T.disclaimer[lang]}</p>
    </section>
  );
}
