import { Fragment, useMemo, useState } from 'react';
import type { Iris } from '../hooks/useIrisDistance';
import { answer, initAcuity, LINES, MIN_STROKE_PX, nextDir, PER_LINE, screenLimit, SNELLEN } from '../lib/acuity';
import { dialLineWidthMm, lineLabelIn, lineOfHour, pickedAnswer, toggleLine } from '../lib/dial';
import { DUO_GREEN_CSS, DUO_INK_CSS, DUO_RED_CSS } from '../lib/duochrome';
import {
  blurredFarPoint, clearFarPoint, FAR_BEYOND_CM, FAR_NEAREST_CM, FAR_TRIALS, farPointLetterMm, measuredFarPoint, needsFurther, trialCm,
  type FarPoint,
} from '../lib/farpoint';
import { ACUITY, COVER, DIAL, DIR_TEXT, DUO, EYE, FAR, fmt, type Lang } from '../lib/i18n';
import { landoltDiameterMm } from '../lib/landolt';
import { optotypeHeightMm } from '../lib/optics';
import { nextLetter, SLOAN_LETTERS, type Letter } from '../lib/sloan';
import type { AcuityAnswer, Chart, DialAnswer, Dir, Duochrome, Eye, EyeResult } from '../lib/types';
import {
  ActionWords, AnswerBubble, BigNumber, Bloom, BubbleIcon, Eyebrow, Footer, Heading, Note, Steps, StimulusPanel, TextLink,
} from './Coral';
import { DistanceGuard } from './DistanceGuard';
import { LandoltC } from './LandoltC';
import { SloanLetter } from './SloanLetter';
import { Fill, Rich } from './Text';
import { TumblingE } from './TumblingE';

export interface Geometry { pxPerMm: number; targetMm: number }
const ARROW: Record<Dir, string> = { up: '↑', right: '→', down: '↓', left: '←' };

/**
 * Before an eye's tests. With chooseChart (first eye, when the chart was not preset from the interview language),
 * the three buttons also pick the acuity chart for the session.
 */
export function CoverPrompt({ lang, eye, chooseChart = false, onReady }: {
  lang: Lang; eye: Eye; chooseChart?: boolean; onReady: (chart?: Chart) => void;
}) {
  const T = COVER;
  const right = eye === 'right';
  // Testing the right eye = cover the LEFT eye, so the palm is drawn on the left (and the other way round).
  const charts: { chart: Chart; key: string; label: string }[] = [
    { chart: 'letters', key: 'K', label: T.letters[lang] },
    { chart: 'E', key: 'E', label: T.e[lang] },
    { chart: 'C', key: 'C', label: T.ring[lang] },
  ];
  return (
    <div>
      <Eyebrow>{(right ? T.testingRight : T.testingLeft)[lang]}</Eyebrow>
      <Heading className="mt-1">{(right ? T.coverLeft : T.coverRight)[lang]}</Heading>
      <p className="mt-2 text-muted">{(right ? T.howRight : T.howLeft)[lang]}</p>
      <div className="mt-3 flex justify-center"><CoverDrawing palm={right ? 'left' : 'right'} /></div>
      {chooseChart ? (
        <>
          {/* Each row picks the chart and starts the test at once (as before), so they are plain buttons, not toggles. */}
          <div className="mt-4 flex flex-col divide-y divide-line">
            {charts.map((c) => (
              <button key={c.chart} type="button" className="al-focus flex min-h-14 w-full items-center gap-3 rounded-lg py-2.5 text-left font-semibold text-ink"
                onClick={() => onReady(c.chart)}>
                <BubbleIcon>{c.key}</BubbleIcon>
                <span className="min-w-0 flex-1">{c.label}</span>
                <span aria-hidden className="text-brand">→</span>
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-sm text-muted">
            <p>{T.eHelp[lang]}</p>
            <p>{T.ringHelp[lang]}</p>
          </div>
        </>
      ) : (
        <Footer>
          <Bloom onClick={() => onReady()}>{T.ready[lang]}</Bloom>
        </Footer>
      )}
    </div>
  );
}

/** Mirror view of a face: a palm over one eye, the other eye open. Decorative (the heading says which eye). */
function CoverDrawing({ palm }: { palm: 'left' | 'right' }) {
  const palmX = palm === 'left' ? 26 : 70;
  const eyeX = palm === 'left' ? 70 : 26;
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 96 60" width="120" height="75" className="shrink-0">
      <path d="M4 30Q28 4 48 30Q68 4 92 30" fill="none" stroke="#2A1610" strokeWidth="2" strokeLinecap="round" />
      <circle cx={eyeX} cy="26" r="7" fill="#D9481E" />
      <circle cx={eyeX} cy="26" r="3" fill="#2A1610" />
      <ellipse cx={palmX} cy="28" rx="20" ry="16" fill="#FFB08F" opacity=".85" />
    </svg>
  );
}

/* ---------- Visual acuity: Tumbling E, Landolt C or Sloan letters, same staircase ---------- */
export function AcuityTest({ lang, eye, chart, iris, geo, onDone }: {
  lang: Lang; eye: Eye; chart: Chart; iris: Iris; geo: Geometry; onDone: (r: Pick<EyeResult, 'logMAR' | 'limited' | 'acuityAnswers'>) => void;
}) {
  const dpr = window.devicePixelRatio || 1;
  // Same helper as the pre-test warning on the camera step, so the two always agree.
  const maxIdx = useMemo(() => screenLimit(geo.pxPerMm, dpr, geo.targetMm).idx, [geo.targetMm, geo.pxPerMm, dpr]);
  const [s, setS] = useState(() => initAcuity(maxIdx));
  // E opening or C gap; the same no-repeat picker for both.
  const [dir, setDir] = useState<Dir>(() => nextDir(null));
  const [letter, setLetter] = useState<Letter>(() => nextLetter(null));
  const [answers, setAnswers] = useState<AcuityAnswer[]>([]);
  const letters = chart === 'letters';
  const ring = chart === 'C';

  if (maxIdx < 0) {
    return <Note tone="warn" role="alert">{ACUITY.tooCoarse[lang]}</Note>;
  }
  // Sloan letters and the Landolt C share the E's 5x5 design (stroke, and the C's gap, = height / 5), so the size and
  // the screen limit are identical. The C's outer diameter comes from landoltDiameterMm, the E height by definition.
  const sizeMm = ring ? landoltDiameterMm(LINES[s.idx], geo.targetMm) : optotypeHeightMm(LINES[s.idx], geo.targetMm);
  const sizeCss = sizeMm * geo.pxPerMm;

  const pick = (choice: Dir | Letter | null) => {
    const shown = letters ? letter : dir;
    const ok = choice === shown;
    const log = [...answers, { logMAR: LINES[s.idx], ok, distanceMm: iris.distanceMm === null ? null : Math.round(iris.distanceMm), shown, picked: choice }];
    setAnswers(log);
    const next = answer(s, ok, maxIdx);
    setS(next);
    if (next.done) {
      onDone({ logMAR: next.resultIdx === null ? null : LINES[next.resultIdx], limited: next.limited, acuityAnswers: log });
      return;
    }
    if (letters) {
      setLetter(nextLetter(letter));
      return;
    }
    setDir(nextDir(dir));
  };
  const question = (letters ? ACUITY.askLetter : ring ? ACUITY.askRing : ACUITY.askE)[lang];

  return (
    <div>
      <TestHeader lang={lang} eye={eye} title={question} />
      <DistanceGuard lang={lang} iris={iris} targetMm={geo.targetMm}>
        <StimulusPanel className="flex h-56 items-center justify-center">
          {letters ? <SloanLetter letter={letter} sizeCss={sizeCss} />
            : ring ? <LandoltC dir={dir} sizeCss={sizeCss} label={fmt(ACUITY.ringLabel[lang], { dir: DIR_TEXT[dir][lang] })} />
              : <TumblingE dir={dir} sizeCss={sizeCss} label={fmt(ACUITY.eLabel[lang], { dir: DIR_TEXT[dir][lang] })} />}
        </StimulusPanel>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {Array.from({ length: PER_LINE }, (_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i < s.correct + s.wrong ? 'bg-brand' : 'bg-brand-pale'}`} />
          ))}
        </div>
        {letters ? (
          <div className="mt-4">
            {/* Wide gaps, larger between the two rows, against vertical mis-taps (D sits above R).
                46 px bubbles; 5 keys fit a 328 px row (360 px screen). */}
            <div className="grid grid-cols-5 justify-items-center gap-x-2 gap-y-5">
              {SLOAN_LETTERS.map((l) => (
                <AnswerBubble key={l} size={46} onClick={() => pick(l)}><span className="text-2xl">{l}</span></AnswerBubble>
              ))}
            </div>
            <div className="mt-3 flex justify-center">
              <TextLink onClick={() => pick(null)}>{ACUITY.cantSeeBlurry[lang]}</TextLink>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-4 grid w-60 grid-cols-3 place-items-center gap-2">
            <span />
            <Key lang={lang} d="up" ring={ring} pick={pick} />
            <span />
            <Key lang={lang} d="left" ring={ring} pick={pick} />
            <TextLink className="text-center text-xs" onClick={() => pick(null)}>{ACUITY.cantSee[lang]}</TextLink>
            <Key lang={lang} d="right" ring={ring} pick={pick} />
            <span />
            <Key lang={lang} d="down" ring={ring} pick={pick} />
            <span />
          </div>
        )}
      </DistanceGuard>
    </div>
  );
}

/** Eyebrow with the eye's name, then the test as the heading (first letter capitalised for display). Still: no animation. */
function TestHeader({ lang, eye, title }: { lang: Lang; eye: Eye; title: string }) {
  return (
    <div className="mb-3">
      <Eyebrow>{EYE[eye][lang]}</Eyebrow>
      <Heading className="mt-0.5 text-[20px] first-letter:uppercase">{title}</Heading>
    </div>
  );
}

/**
 * One direction key, in the same diamond for both charts: an arrow for the E; for the C a small ring with its gap
 * that way (an answer icon, not a stimulus; black like the keys' letters).
 */
function Key({ lang, d, ring, pick }: { lang: Lang; d: Dir; ring: boolean; pick: (d: Dir) => void }) {
  const dir = DIR_TEXT[d][lang];
  return (
    <AnswerBubble size={46} ariaLabel={ring ? fmt(ACUITY.gapKey[lang], { dir }) : dir} onClick={() => pick(d)}>
      {ring ? (
        <span className="flex h-6 items-center justify-center" aria-hidden>
          <LandoltC dir={d} sizeCss={24} color="#000" label={fmt(ACUITY.ringLabel[lang], { dir })} />
        </span>
      ) : <span className="text-2xl" aria-hidden>{ARROW[d]}</span>}
    </AnswerBubble>
  );
}

/* ---------- Astigmatism dial (physically sized in mm) ---------- */
const R = 24; // dial radius, mm
const M = 6; // margin for the numbers, mm
const NUM_R = R + 3.2; // radius of the clock numbers, mm
// Radius of the circle drawn round each number while picking, mm. Small enough to stay inside the drawing
// (27.2 + 2.6 + half the 0.3 stroke < R + M = 30), so the 12, 3, 6 and 9 circles are not cut off.
const RING_MM = 2.6;
const MIN_TAP_PX = 44; // smallest tap target, CSS px; the invisible number buttons may be larger than the drawn circle
// A line itself is tappable from HIT_FROM_MM outwards (all lines meet at the centre). HIT_WIDTH_MM is below the
// 4.5 mm (9 mm x sin 30°) between neighbouring lines at that radius, so two lines' tap areas never overlap.
const HIT_FROM_MM = 9;
const HIT_WIDTH_MM = 4;
// Pick-phase overlay colours are fixed like the stimulus colours (teal, as the app accent). The band is drawn
// under the black stimulus lines, so the lines themselves look the same while picking.
const PICK = { ink: '#0f5c55', soft: '#e6f0ed', bandOpacity: 0.25, bandMm: 2.6 } as const;
export function AstigmatismTest({ lang, eye, iris, geo, acuity, onDone }: {
  lang: Lang; eye: Eye; iris: Iris; geo: Geometry; acuity: number | null; onDone: (r: DialAnswer) => void;
}) {
  const T = DIAL;
  const [phase, setPhase] = useState<'ask' | 'pick'>('ask');
  // Darker lines, by lower clock hour (1 = 1–7 ... 6 = 6–12), ascending. Kept when going Back to the question.
  const [lines, setLines] = useState<number[]>([]);
  const [msg, setMsg] = useState<'allSix' | 'noneYet' | null>(null);
  // Near-threshold lines sized from this eye's acuity (see dialLineWidthMm for the rule and its limits).
  const lineMm = dialLineWidthMm(acuity, geo.targetMm, geo.pxPerMm, window.devicePixelRatio || 1);
  const size = (R + M) * 2;
  const sizePx = size * geo.pxPerMm;
  const tapPx = Math.max(MIN_TAP_PX, 2 * RING_MM * geo.pxPerMm);
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const picking = phase === 'pick';
  // hour h sits at h*30 degrees clockwise from 12 o'clock
  const pos = (h: number, r: number) => {
    const a = (h * 30 * Math.PI) / 180;
    return { x: R + M + r * Math.sin(a), y: R + M - r * Math.cos(a) };
  };
  const toggle = (line: number) => {
    const t = toggleLine(lines, line);
    setLines(t.lines);
    setMsg(t.blocked ? 'allSix' : null);
  };
  const done = () => (lines.length ? onDone(pickedAnswer(lines)) : setMsg('noneYet'));
  const go = (p: 'ask' | 'pick') => { setMsg(null); setPhase(p); };
  return (
    <div>
      <TestHeader lang={lang} eye={eye} title={T.header[lang]} />
      <DistanceGuard lang={lang} iris={iris} targetMm={geo.targetMm}>
        <StimulusPanel className="flex justify-center p-2">
          <div className="relative shrink-0 touch-manipulation" style={{ width: sizePx, height: sizePx }}>
            <svg className="block" width={sizePx} height={sizePx} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={T.svg[lang]}>
              {/* Selected lines: a light band from number to number, under the unchanged black line. */}
              {picking && lines.map((l) => {
                const a = pos(l, NUM_R), b = pos(l + 6, NUM_R);
                return <line key={`band${l}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={PICK.ink} strokeOpacity={PICK.bandOpacity} strokeWidth={PICK.bandMm} strokeLinecap="round" />;
              })}
              {[12, 1, 2, 3, 4, 5].map((h) => {
                const a = pos(h, R), b = pos(h + 6, R);
                return <line key={h} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#000" strokeWidth={lineMm} />;
              })}
              {/* Invisible tap areas along each half-line (mouse/touch; the number buttons below cover the keyboard). */}
              {picking && hours.map((h) => {
                const a = pos(h, HIT_FROM_MM), b = pos(h, R);
                return <line key={`hit${h}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={HIT_WIDTH_MM}
                  style={{ cursor: 'pointer' }} onClick={() => toggle(lineOfHour(h))} />;
              })}
              {hours.map((h) => {
                const p = pos(h, NUM_R);
                const on = picking && lines.includes(lineOfHour(h));
                return (
                  <g key={h}>
                    {picking && <circle cx={p.x} cy={p.y} r={RING_MM} fill={on ? PICK.ink : PICK.soft} stroke={PICK.ink} strokeWidth={0.3} />}
                    <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={2.8} fill={on ? '#fff' : '#0f172a'}>{h}</text>
                  </g>
                );
              })}
            </svg>
            {/* Number buttons: at least MIN_TAP_PX CSS px whatever the screen scale; either end toggles the whole line. */}
            {picking && hours.map((h) => {
              const p = pos(h, NUM_R);
              const line = lineOfHour(h);
              return (
                <button key={h} type="button" aria-pressed={lines.includes(line)} aria-label={fmt(T.numberKey[lang], { line: lineLabelIn(line, lang), hour: h })}
                  className="absolute rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  style={{ left: p.x * geo.pxPerMm - tapPx / 2, top: p.y * geo.pxPerMm - tapPx / 2, width: tapPx, height: tapPx }}
                  onClick={() => toggle(line)} />
              );
            })}
          </div>
        </StimulusPanel>
        {phase === 'ask' ? (
          <div className="mt-5">
            <p className="text-center font-semibold">{T.ask[lang]}</p>
            {/* "Not sure" is recorded distinctly; present stays false so triage treats it like "All look the same". */}
            <ActionWords className="mt-2" options={[
              { id: 'same', label: T.same[lang], onClick: () => onDone({ present: false, lines: [], axisDeg: null }) },
              { id: 'darker', label: T.darker[lang], onClick: () => go('pick') },
              { id: 'unsure', label: T.unsure[lang], onClick: () => onDone({ present: false, lines: [], axisDeg: null, unsure: true }) },
            ]} />
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-center font-semibold">{T.pick[lang]}</p>
            <p className="mt-2 text-center text-sm text-muted" aria-live="polite">
              {T.selected[lang]} {lines.length === 0 ? T.none[lang] : lines.map((l, i) => (
                <Fragment key={l}>{i > 0 && ', '}<span className="whitespace-nowrap">{lineLabelIn(l, lang)}</span></Fragment>
              ))}
            </p>
            {msg && <Note tone="error" role="alert" className="mt-2">{T[msg][lang]}</Note>}
            {/* Test page: no pulse. Done looks disabled until a line is picked, but stays tappable so it can say why. */}
            <Footer className="mt-3" left={<TextLink onClick={() => go('ask')}>{T.back[lang]}</TextLink>}>
              <Bloom pulse={false} dim={lines.length === 0} onClick={done}>{T.done[lang]}</Bloom>
            </Footer>
          </div>
        )}
      </DistanceGuard>
    </div>
  );
}

/* ---------- Duochrome (red-green) ---------- */
// Luminance-matched halves and black ink from lib/duochrome.ts, so the halves differ in colour only (not brightness).
const DUO_DIRS: Dir[] = ['right', 'up', 'left'];
export function DuochromeTest({ lang, eye, iris, geo, acuity, onDone }: {
  lang: Lang; eye: Eye; iris: Iris; geo: Geometry; acuity: number | null; onDone: (r: Duochrome) => void;
}) {
  // Present letters two lines coarser than the measured acuity, so they sit near the eye's limit.
  const idx = Math.max(0, (acuity === null ? 0 : LINES.indexOf(acuity as (typeof LINES)[number])) - 2);
  const sizeCss = optotypeHeightMm(LINES[idx], geo.targetMm) * geo.pxPerMm;
  const panel = (bg: string) => (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6" style={{ background: bg }}>
      {DUO_DIRS.map((d, i) => <TumblingE key={i} dir={d} sizeCss={sizeCss} color={DUO_INK_CSS} label={fmt(ACUITY.eLabel[lang], { dir: DIR_TEXT[d][lang] })} />)}
    </div>
  );
  return (
    <div>
      <TestHeader lang={lang} eye={eye} title={fmt(DUO.header[lang], { size: SNELLEN[idx] })} />
      <DistanceGuard lang={lang} iris={iris} targetMm={geo.targetMm}>
        {/* A 14 px pure white border round the halves, so no coral or peach touches the red and green. */}
        <StimulusPanel className="p-3.5">
          <div className="flex overflow-hidden rounded-xl">{panel(DUO_RED_CSS)}{panel(DUO_GREEN_CSS)}</div>
        </StimulusPanel>
        <p className="mt-5 text-center font-semibold">{DUO.ask[lang]}</p>
        <ActionWords className="mt-2" options={[
          { id: 'red', label: DUO.red[lang], swatch: DUO_RED_CSS, onClick: () => onDone('red') },
          { id: 'equal', label: DUO.same[lang], onClick: () => onDone('equal') },
          { id: 'green', label: DUO.green[lang], swatch: DUO_GREEN_CSS, onClick: () => onDone('green') },
        ]} />
      </DistanceGuard>
    </div>
  );
}

/* ---------- Far point: a rough short-sight estimate (lib/farpoint.ts, PROVISIONAL) ---------- */
const FAR_LINE = 5; // optotypes in the line
/** A line of optotypes with no two neighbours alike: Sloan letters, or E / C directions. */
const letterLine = () => { const l: Letter[] = []; for (let i = 0; i < FAR_LINE; i++) l.push(nextLetter(l[i - 1] ?? null)); return l; };
const dirLine = () => { const d: Dir[] = []; for (let i = 0; i < FAR_LINE; i++) d.push(nextDir(d[i - 1] ?? null)); return d; };

/**
 * Far point, after the red-green test of each eye. Not gated by DistanceGuard: the distance changes on purpose, and
 * the live distance is shown instead. A line of the session's optotypes at a FIXED physical size (farPointLetterMm:
 * 0.1 logMAR at 65 cm, about 1.19 mm), spaced one letter apart. The person starts close, slowly moves the phone away and taps
 * "Blurred now" at the first blur; FAR_TRIALS trials (a new line each time), then the median (measuredFarPoint).
 * "Still clear at arm's length" and "Already blurred" end the step with that outcome; "Skip this step" gives null.
 * "Still clear" closer than FAR_BEYOND_CM (needsFurther) does not end the step: it asks for the phone further away and
 * offers "I can't hold it further", which ends with "Still clear" at the last tapped distance; a later "Blurred now"
 * tap hides the request.
 * Every tap except Skip and "I can't hold it further" needs a face and a distance in range (trialCm); otherwise it is
 * ignored and says why.
 * Demo mode: the distance is fixed at 50 cm, so three taps give 50 cm (about −2.00 D), and "Still clear" asks for more.
 */
export function FarPointTest({ lang, eye, chart, iris, pxPerMm, onDone }: {
  lang: Lang; eye: Eye; chart: Chart; iris: Iris; pxPerMm: number; onDone: (r: FarPoint | null) => void;
}) {
  const T = FAR;
  const [trials, setTrials] = useState<number[]>([]);
  const [line, setLine] = useState(() => ({ letters: letterLine(), dirs: dirLine() }));
  const [needFace, setNeedFace] = useState(false);
  /** The distance of a "Still clear" tap that was too close to end the step (needsFurther); null when none is pending. */
  const [shortClear, setShortClear] = useState<number | null>(null);
  const sizeMm = farPointLetterMm();
  const sizeCss = sizeMm * pxPerMm;
  // Same rule as the acuity chart's screen limit; warned, not blocked (larger-looking letters only make the estimate weaker).
  const coarse = (sizeMm / 5) * pxPerMm * (window.devicePixelRatio || 1) < MIN_STROKE_PX;
  const cm = iris.faceFound ? trialCm(iris.distanceMm) : null;
  /** The distance for a tap, or null (the tap is ignored) without a face or a distance in range. */
  const tapCm = (): number | null => {
    setNeedFace(cm === null);
    return cm;
  };
  const blurredNow = () => {
    const c = tapCm();
    if (c === null) return;
    const next = [...trials, c];
    if (next.length >= FAR_TRIALS) return onDone(measuredFarPoint(next));
    setShortClear(null);
    setTrials(next);
    setLine({ letters: letterLine(), dirs: dirLine() });
  };
  const endWith = (make: (c: number) => FarPoint | null) => {
    const c = tapCm();
    if (c !== null) onDone(make(c));
  };
  const stillClear = () => {
    const c = tapCm();
    if (c === null) return;
    if (needsFurther(c)) return setShortClear(c);
    onDone(clearFarPoint(c));
  };
  return (
    <div>
      <TestHeader lang={lang} eye={eye} title={T.title[lang]} />
      {/* Live distance as a big coral number (the far point is not gated at 50 cm). Still: no animation on this page. */}
      <div className="flex items-end justify-between gap-2">
        <p className="text-sm font-semibold text-muted">
          {cm !== null
            ? <Fill template={T.distance[lang]} nodes={{ distance: <BigNumber className="ml-1" value={cm} unit="cm" /> }} />
            : <span className="text-[#7A4A06]">{fmt(T.distance[lang], { distance: T.noFace[lang] })}</span>}
        </p>
        <span className="pb-1 text-sm font-semibold text-muted">{fmt(T.trial[lang], { n: Math.min(trials.length + 1, FAR_TRIALS), total: FAR_TRIALS })}</span>
      </div>
      <Steps className="mt-3" items={[
        T.step1[lang],
        fmt(T.step2[lang], { cm: FAR_NEAREST_CM }),
        T.step3[lang],
        <Rich text={T.step4[lang]} boldClass="text-ink" />,
      ]} />
      {trials.length > 0 && (
        <p className="mt-2 text-sm" aria-live="polite">{fmt(T.recorded[lang], { list: trials.map((c) => `${c} cm`).join(', ') })} {T.again[lang]}</p>
      )}
      <div role="img" aria-label={T.letters[lang]}>
        <StimulusPanel className="mt-4 flex h-24 items-center justify-center">
          <div className="flex items-center" style={{ gap: sizeCss }} aria-hidden>
            {chart === 'letters'
              ? line.letters.map((l, i) => <SloanLetter key={i} letter={l} sizeCss={sizeCss} />)
              : line.dirs.map((d, i) => (chart === 'C' ? <LandoltC key={i} dir={d} sizeCss={sizeCss} /> : <TumblingE key={i} dir={d} sizeCss={sizeCss} />))}
          </div>
        </StimulusPanel>
      </div>
      {coarse && <Note tone="warn" className="mt-3">{T.coarse[lang]}</Note>}
      {needFace && <Note tone="error" role="alert" className="mt-3">{T.needFace[lang]}</Note>}
      {shortClear !== null && (
        <Note tone="warn" role="status" className="mt-3">
          <p><Rich text={fmt(T.furtherAsk[lang], { cm: shortClear, max: FAR_BEYOND_CM })} /></p>
          <TextLink className="mt-1" onClick={() => onDone(clearFarPoint(shortClear))}>{T.cantFurther[lang]}</TextLink>
        </Note>
      )}
      <Footer className="mt-4" left={<>
        <TextLink onClick={stillClear}>{T.stillClear[lang]}</TextLink>
        <TextLink onClick={() => endWith(blurredFarPoint)}>{T.alreadyBlurred[lang]}</TextLink>
        <TextLink onClick={() => onDone(null)}>{T.skip[lang]}</TextLink>
      </>}>
        <Bloom size={80} pulse={false} onClick={blurredNow}>{T.blurred[lang]}</Bloom>
      </Footer>
      <p className="mt-4 text-xs text-muted">{T.note[lang]}</p>
    </div>
  );
}
