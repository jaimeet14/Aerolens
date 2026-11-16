import { fmt, PROGRESS, type Lang, type Text } from '../lib/i18n';

const PHASES: readonly Text[] = [PROGRESS.setup, PROGRESS.calibrate, PROGRESS.right, PROGRESS.left, PROGRESS.fit];
const SUBS = ['cover', 'acuity', 'astig', 'duo', 'far'] as const;

export type ProgressAt =
  | { stage: 'welcome' | 'safety' | 'referral' | 'interview' | 'scale' | 'camera' | 'fit' | 'results' }
  | { stage: 'eye'; eyeIdx: number; sub: (typeof SUBS)[number] };

/** Fill (0..1) of each of the five phase segments, and the current phase label. */
function progress(at: ProgressAt): { fills: number[]; label: Text } {
  const full = (n: number, frac: number) => PHASES.map((_, i) => (i < n ? 1 : i === n ? frac : 0));
  switch (at.stage) {
    // Setup = welcome, safety, then the short interview (or the referral screen after red flags).
    case 'welcome': return { fills: full(0, 1 / 3), label: PHASES[0] };
    case 'safety': return { fills: full(0, 2 / 3), label: PHASES[0] };
    case 'referral':
    case 'interview': return { fills: full(0, 1), label: PHASES[0] };
    case 'scale': return { fills: full(1, 0.5), label: PHASES[1] };
    case 'camera': return { fills: full(1, 1), label: PHASES[1] };
    case 'eye': {
      const phase = 2 + at.eyeIdx;
      return { fills: full(phase, (SUBS.indexOf(at.sub) + 1) / SUBS.length), label: PHASES[phase] };
    }
    case 'fit': return { fills: full(4, 0.5), label: PHASES[4] };
    case 'results': return { fills: full(PHASES.length, 0), label: PROGRESS.results };
  }
}

export function Progress(props: { lang: Lang; at: ProgressAt }) {
  const { lang } = props;
  const { fills, label } = progress(props.at);
  const done = fills.filter((f) => f === 1).length;
  return (
    <div className="flex flex-col items-end gap-1.5" role="img"
      aria-label={fmt(PROGRESS.aria[lang], { label: label[lang], done, total: PHASES.length })}>
      {/* Five 24 px segments: 136 px in all, about the width of the earlier four 28 px ones, so 360 px phones keep room for the logo. */}
      <div className="flex gap-1">
        {fills.map((f, i) => (
          <span key={PHASES[i].en} className="h-1 w-6 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${f * 100}%` }} />
          </span>
        ))}
      </div>
      <span className="text-[11px] font-medium text-subtle">{label[lang]}</span>
    </div>
  );
}
