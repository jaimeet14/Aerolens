import { fmt, PROGRESS, type Lang, type Text } from '../lib/i18n';

const PHASES: readonly Text[] = [PROGRESS.setup, PROGRESS.calibrate, PROGRESS.right, PROGRESS.left, PROGRESS.fit];
const SUBS = ['cover', 'acuity', 'astig', 'duo', 'far'] as const;

export type ProgressAt =
  | { stage: 'welcome' | 'safety' | 'referral' | 'interview' | 'scale' | 'camera' | 'fit' | 'results' }
  | { stage: 'eye'; eyeIdx: number; sub: (typeof SUBS)[number] };

/** Fill (0..1) of each of the five phases, the current phase (0..4; 5 on results, all done) and its label. */
function progress(at: ProgressAt): { fills: number[]; phase: number; label: Text } {
  const full = (n: number, frac: number) => PHASES.map((_, i) => (i < n ? 1 : i === n ? frac : 0));
  switch (at.stage) {
    // Setup = welcome, safety, then the short interview (or the referral screen after red flags).
    case 'welcome': return { fills: full(0, 1 / 3), phase: 0, label: PHASES[0] };
    case 'safety': return { fills: full(0, 2 / 3), phase: 0, label: PHASES[0] };
    case 'referral':
    case 'interview': return { fills: full(0, 1), phase: 0, label: PHASES[0] };
    case 'scale': return { fills: full(1, 0.5), phase: 1, label: PHASES[1] };
    case 'camera': return { fills: full(1, 1), phase: 1, label: PHASES[1] };
    case 'eye': {
      const phase = 2 + at.eyeIdx;
      return { fills: full(phase, (SUBS.indexOf(at.sub) + 1) / SUBS.length), phase, label: PHASES[phase] };
    }
    case 'fit': return { fills: full(4, 0.5), phase: 4, label: PHASES[4] };
    case 'results': return { fills: full(PHASES.length, 0), phase: PHASES.length, label: PROGRESS.results };
  }
}

/* The curved progress line: one dot per phase. DOT_AT is where each dot sits along the path, in % of its length
   (pathLength=100), so the coral overlay reaches a phase's dot when that phase starts and creeps toward the next one. */
const PATH = 'M6 18C40 18 50 6 100 10S170 22 194 8';
const DOTS: readonly [number, number][] = [[6, 18], [52, 10], [100, 10], [148, 17], [194, 8]];
const DOT_AT = [0, 24.6, 49.7, 75.2, 100];

/** How far along the line (0..100) the coral overlay reaches. */
function lineFill(fills: number[], phase: number): number {
  if (phase >= DOTS.length - 1) return 100;
  return DOT_AT[phase] + fills[phase] * (DOT_AT[phase + 1] - DOT_AT[phase]);
}

export function Progress(props: { lang: Lang; at: ProgressAt }) {
  const { lang } = props;
  const { fills, phase, label } = progress(props.at);
  const done = fills.filter((f) => f === 1).length;
  const fill = lineFill(fills, phase);
  const caption = phase < PHASES.length
    ? `${fmt(PROGRESS.step[lang], { n: phase + 1, total: PHASES.length })} · ${label[lang]}`
    : label[lang];
  return (
    <div className="flex w-full flex-col items-stretch gap-0.5" role="img"
      aria-label={fmt(PROGRESS.aria[lang], { label: label[lang], done, total: PHASES.length })}>
      <svg viewBox="0 0 200 26" className="h-auto w-full overflow-visible" aria-hidden focusable="false">
        <path d={PATH} fill="none" stroke="#F3CDBE" strokeWidth="3" strokeLinecap="round" />
        {fill > 0 && (
          <path d={PATH} pathLength={100} fill="none" stroke="#D9481E" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${fill} 100`} className="transition-[stroke-dasharray] duration-500" />
        )}
        {DOTS.map(([cx, cy], i) => i < phase
          ? <circle key={i} cx={cx} cy={cy} r="5" fill="#D9481E" />
          : i === phase
            ? <circle key={i} cx={cx} cy={cy} r="6.5" fill="#fff" stroke="#D9481E" strokeWidth="2.5" />
            : <circle key={i} cx={cx} cy={cy} r="5" fill="#F3CDBE" />)}
      </svg>
      {/* Left-aligned, so the corner vessels (Coral.tsx VesselMotif, right 90 px of the page) never cross it. */}
      <span className="text-left text-[11px] font-semibold text-muted">{caption}</span>
    </div>
  );
}
