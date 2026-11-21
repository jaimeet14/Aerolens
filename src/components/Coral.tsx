import { useId, type ReactNode } from 'react';

/*
 * Shared pieces of the "retinal coral" design. Decoration only: no clinical logic, no storage.
 * Decorative animation uses the al-* classes in index.css, which `prefers-reduced-motion: reduce` turns off.
 * Test pages pass `pulse={false}` (Bloom) and `animated={false}` (VesselMotif): nothing moves while a stimulus shows.
 */

const GLOSSY = 'radial-gradient(circle at 35% 30%, #FFB08F, #E8552A 55%, #A82C14)';
const TICK_FILL = 'radial-gradient(circle at 35% 30%, #FFB08F, #E8552A 60%, #A82C14)';
/** 1 px coral hairline between rows (the `line` colour token). */
export const HAIRLINE = 'rgba(217,72,30,.18)';

/**
 * The round primary action ("bloom"). 64 px by default; 84 px for Start and Blurred now, about 76-80 px for a long label.
 * Two pulse rings behind it unless `pulse` is false (test pages) or it is disabled.
 */
export function Bloom({ children, onClick, size = 64, pulse = true, disabled = false, dim = false, type = 'button', className = '', ariaLabel, describedBy, fontSize: fs }: {
  children: ReactNode; onClick?: () => void; size?: number; pulse?: boolean; disabled?: boolean;
  /** Looks disabled (aria-disabled) but stays tappable, so the screen can say why. */
  dim?: boolean;
  type?: 'button' | 'submit'; className?: string; ariaLabel?: string; describedBy?: string; fontSize?: number;
}) {
  const fontSize = fs ?? (size >= 80 ? 15 : size >= 72 ? 13 : size >= 60 ? 12 : 11);
  const rings = pulse && !disabled && !dim;
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }}>
      {rings && (
        <>
          <span aria-hidden className="al-pulse pointer-events-none absolute inset-0 rounded-full bg-[#FF8457]" />
          <span aria-hidden className="al-pulse al-pulse-late pointer-events-none absolute inset-0 rounded-full bg-[#FF8457]" />
        </>
      )}
      <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel} aria-disabled={dim || undefined} aria-describedby={describedBy}
        className={`al-focus relative grid h-full w-full place-items-center rounded-full p-2 text-center font-bold leading-tight text-white transition-transform active:scale-95 disabled:opacity-45 disabled:active:scale-100 ${dim ? 'opacity-45' : ''}`}
        style={{ background: GLOSSY, fontSize, boxShadow: '0 12px 20px -8px rgba(168,44,20,.8), inset 0 2px 0 rgba(255,255,255,.35)' }}>
        <span className="block max-w-full break-words">{children}</span>
      </button>
    </span>
  );
}

export type SwitchOption<T extends string> = { id: T; label: ReactNode; lang?: string };

/**
 * Words side by side; the selected one is bolder with a 3 px coral underline that grows in. Each word is a real button with
 * aria-pressed and a 44 px tall hit area. `groupLabel` names the group for screen readers (or wrap it in a fieldset).
 */
export function UnderlineSwitch<T extends string>({ options, value, onPick, groupLabel, separator = false, className = '', textClass = 'text-[14px]' }: {
  options: SwitchOption<T>[]; value: T | null; onPick: (id: T) => void; groupLabel?: string;
  separator?: boolean; className?: string; textClass?: string;
}) {
  return (
    <div role="group" aria-label={groupLabel} className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      {options.map((o, i) => {
        const on = value === o.id;
        return (
          <span key={o.id} className="flex items-center gap-x-4">
            {separator && i > 0 && <span aria-hidden className="text-muted">·</span>}
            <button type="button" lang={o.lang} aria-pressed={on} onClick={() => onPick(o.id)}
              className={`al-focus relative min-h-11 rounded-md px-0.5 ${textClass} text-ink transition-opacity ${on ? 'font-bold opacity-100' : 'font-medium opacity-50 hover:opacity-80'}`}>
              {o.label}
              <span aria-hidden className="al-underline absolute inset-x-0 bottom-1.5 h-[3px] rounded-full bg-brand"
                style={{ transform: on ? 'scaleX(1)' : 'scaleX(0)' }} />
            </button>
          </span>
        );
      })}
    </div>
  );
}

/** The 21 px round tick of a tick row: an empty ring, or a glossy coral fill with a white check. */
export function Tick({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="grid h-[21px] w-[21px] shrink-0 place-items-center rounded-full"
      style={on
        ? { background: TICK_FILL, boxShadow: '0 4px 10px -3px rgba(168,44,20,.7)' }
        : { boxShadow: 'inset 0 0 0 2px #E8A189' }}>
      {on && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.2 5 8.6 9.6 3.6" />
        </svg>
      )}
    </span>
  );
}

/**
 * One full-width toggle row with a tick on the left (or `icon`, e.g. a BubbleIcon for the chart choice).
 * A real button with aria-pressed; put rows in a TickRows list for the hairlines between them.
 */
export function TickRow({ selected, onClick, children, icon, lang }: {
  selected: boolean; onClick: () => void; children: ReactNode; icon?: ReactNode; lang?: string;
}) {
  return (
    <button type="button" lang={lang} aria-pressed={selected} onClick={onClick}
      className={`al-focus flex min-h-12 w-full items-center gap-3 rounded-lg py-3 text-left text-ink ${selected ? 'font-semibold' : 'font-normal'}`}>
      {icon ?? <Tick on={selected} />}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

/** A list of TickRows with a 1 px coral hairline between them, no boxes. */
export function TickRows({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col divide-y divide-line ${className}`}>{children}</div>;
}

const BUBBLE = {
  background: 'radial-gradient(circle at 35% 30%, #fff, #FFE6DB 70%)',
  border: '1.5px solid #F0B49C',
  boxShadow: '0 8px 14px -8px rgba(168,44,20,.6)',
};

/**
 * A round answer key (acuity letters and E/C directions). The letter or icon inside keeps its own fixed (black) colour.
 * 44 px by default so the hit area is at least 44 px.
 */
export function AnswerBubble({ children, onClick, ariaLabel, size = 44, disabled = false, lang }: {
  children: ReactNode; onClick: () => void; ariaLabel?: string; size?: number; disabled?: boolean; lang?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} disabled={disabled} lang={lang}
      className="al-focus grid shrink-0 place-items-center rounded-full text-lg font-bold text-black transition-transform active:scale-[.93] disabled:opacity-40"
      style={{ ...BUBBLE, width: Math.max(size, 44), height: Math.max(size, 44) }}>
      {children}
    </button>
  );
}

/** The same bubble as a decorative icon (e.g. K / E / C on the chart-choice rows). Hidden from screen readers. */
export function BubbleIcon({ children, size = 38 }: { children: ReactNode; size?: number }) {
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full text-base font-bold text-black"
      style={{ ...BUBBLE, width: size, height: size }}>
      {children}
    </span>
  );
}

/**
 * Small vessel drawing in the very top-right corner of a patient screen, behind the header's progress line (not the welcome
 * screen, which has VesselHero). 90 x 75 px at opacity .4: its lowest stroke ends inside the header, above the first line of
 * screen content; the progress caption is left-aligned so no stroke crosses it.
 * Positioned absolute at z-index -10: its parent needs `relative`, and something above it a stacking context
 * (<main> is `isolate`). Pass `animated={false}` on a test page so nothing moves while a stimulus shows.
 */
export function VesselMotif({ animated = true, className = '' }: { animated?: boolean; className?: string }) {
  const id = useId();
  const disc = `${id}-disc`;
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 120 100" width="90" height="75"
      className={`pointer-events-none absolute right-0 top-0 -z-10 opacity-40 ${className}`}>
      <defs>
        <radialGradient id={disc}>
          <stop offset="0" stopColor="#FFF8E6" />
          <stop offset=".6" stopColor="#FFD9A8" />
          <stop offset="1" stopColor="#F6A878" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill="none" strokeLinecap="round">
        <path d="M100 22C80 20 60 30 44 50S16 70 0 70" stroke="#B8391A" strokeWidth="3" />
        <path d="M100 22C86 10 64 6 44 12" stroke="#FF8A5E" strokeWidth="2.2" />
        <path d="M100 22C98 46 90 66 76 82" stroke="#B8391A" strokeWidth="2.6" />
        {animated && <path className="al-flow" d="M100 22C80 20 60 30 44 50S16 70 0 70" stroke="#FFE0D2" strokeWidth="1.4" />}
      </g>
      <circle cx="100" cy="22" r="14" fill={`url(#${disc})`} />
      <circle cx="100" cy="22" r="8" fill="#FFF6E2" />
      <circle cx="0" cy="70" r="3.5" fill="#FFE0D2" />
      <circle cx="44" cy="12" r="3" fill="#FFE0D2" />
      <circle cx="76" cy="82" r="3" fill="#FFE0D2" />
    </svg>
  );
}

/**
 * The welcome screen's hero: vessels from an optic disc at (196, 40) arcing over the title. 250 px wide, anchored top-right,
 * behind the content (absolute, z-index -10; same parent rules as VesselMotif). It sways gently, the disc breathes and the
 * main vessels carry flowing dashes; all of it stops with prefers-reduced-motion.
 */
export function VesselHero({ className = '' }: { className?: string }) {
  const id = useId();
  const disc = `${id}-disc`;
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 230 300" preserveAspectRatio="xMinYMin meet"
      className={`pointer-events-none absolute right-0 top-0 -z-10 h-auto w-[250px] overflow-visible opacity-85 ${className}`}>
      <defs>
        <radialGradient id={disc}>
          <stop offset="0" stopColor="#FFF8E6" />
          <stop offset=".6" stopColor="#FFD9A8" />
          <stop offset="1" stopColor="#F6A878" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="al-sway">
        <g fill="none" strokeLinecap="round">
          <path d="M196 40C160 40 120 60 90 100S30 150 -6 150" stroke="#B8391A" strokeWidth="4.6" />
          <path d="M90 100C84 80 72 66 56 60" stroke="#B8391A" strokeWidth="2.6" />
          <path d="M196 40C196 80 186 120 166 150S150 200 160 240" stroke="#B8391A" strokeWidth="4" />
          <path d="M196 40C170 24 130 22 100 40S50 70 10 72" stroke="#FF8A5E" strokeWidth="3.2" />
          <path d="M100 40C92 24 80 16 64 14" stroke="#FF8A5E" strokeWidth="1.8" />
          <path d="M196 40C214 74 214 110 200 140S184 190 196 226" stroke="#FF8A5E" strokeWidth="2.6" />
          <path className="al-flow" d="M196 40C160 40 120 60 90 100S30 150 -6 150" stroke="#FFE0D2" strokeWidth="2" />
          <path className="al-flow" d="M196 40C170 24 130 22 100 40S50 70 10 72" stroke="#FFE0D2" strokeWidth="2" />
        </g>
        <circle cx="196" cy="40" r="24" fill={`url(#${disc})`} />
        <circle className="al-breathe" cx="196" cy="40" r="14" fill="#FFF6E2" />
        <circle cx="56" cy="60" r="4" fill="#FFE0D2" />
        <circle cx="64" cy="14" r="4" fill="#FFE0D2" />
        <circle cx="10" cy="72" r="4" fill="#FFE0D2" />
        <circle cx="160" cy="240" r="4" fill="#FFE0D2" />
        <circle cx="196" cy="226" r="3.5" fill="#FFE0D2" />
      </g>
    </svg>
  );
}

/** Three small bubbles rising above the Start bloom (decorative, staggered). */
export function RisingBubbles({ className = '' }: { className?: string }) {
  const bubbles = [
    { size: 8, left: '20%', delay: '0s' },
    { size: 6, left: '62%', delay: '1.4s' },
    { size: 10, left: '40%', delay: '2.7s' },
  ];
  return (
    <span aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-1/2 h-0 ${className}`}>
      {bubbles.map((b) => (
        <span key={b.delay} className="al-bubble absolute bottom-0 rounded-full"
          style={{
            width: b.size, height: b.size, left: b.left, animationDelay: b.delay,
            border: '1.5px solid rgba(31,92,122,.45)', background: 'rgba(255,255,255,.5)',
          }} />
      ))}
    </span>
  );
}

/* ---------- Page pieces (phase B) ---------- */

/** Small uppercase label above a heading: dark coral (#B8391A, readable at 11 px), or ocean. */
export function Eyebrow({ children, tone = 'coral', className = '' }: { children: ReactNode; tone?: 'coral' | 'ocean'; className?: string }) {
  return (
    <p className={`text-[11px] font-bold uppercase tracking-[1.2px] ${tone === 'coral' ? 'text-[#B8391A]' : 'text-ocean'} ${className}`}>{children}</p>
  );
}

/** Screen heading: 800 weight, tight letter-spacing. */
export function Heading({ children, className = '', as: H = 'h2', id }: { children: ReactNode; className?: string; as?: 'h1' | 'h2' | 'h3'; id?: string }) {
  return <H id={id} className={`text-[24px] font-extrabold leading-tight tracking-[-0.4px] text-ink ${className}`}>{children}</H>;
}

/** A secondary action as an ocean text link (a real button, 44 px tall). */
export function TextLink({ children, onClick, className = '', ariaLabel, type = 'button', pressed }: {
  children: ReactNode; onClick?: () => void; className?: string; ariaLabel?: string; type?: 'button' | 'submit'; pressed?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} aria-label={ariaLabel} aria-pressed={pressed}
      className={`al-focus min-h-11 rounded-md px-1 text-left text-[13px] font-semibold text-ocean underline-offset-4 hover:underline ${className}`}>
      {children}
    </button>
  );
}

/** Footer row: secondary links on the left, the bloom on the right. */
export function Footer({ left, children, className = '' }: { left?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={`mt-6 flex items-end justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 flex-col items-start gap-0.5 pb-1">{left}</div>
      {children && <div className="mr-1 shrink-0">{children}</div>}
    </div>
  );
}

/** 18 px glossy coral number circle for numbered steps. */
export function StepNumber({ n }: { n: number }) {
  return (
    <span aria-hidden className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
      style={{ background: TICK_FILL, boxShadow: '0 3px 8px -3px rgba(168,44,20,.7)' }}>{n}</span>
  );
}

/** A numbered list with glossy number circles (still an <ol> for screen readers). */
export function Steps({ items, className = '' }: { items: ReactNode[]; className?: string }) {
  return (
    <ol className={`space-y-2 text-sm text-ink ${className}`}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5"><StepNumber n={i + 1} /><span className="min-w-0">{it}</span></li>
      ))}
    </ol>
  );
}

/** Big number with a small unit: 800 weight; coral for the live or important value. */
export function BigNumber({ value, unit, tone = 'coral', className = '' }: { value: ReactNode; unit?: ReactNode; tone?: 'coral' | 'ink'; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1 ${className}`}>
      <span className={`text-[36px] font-extrabold leading-none tracking-[-1px] tabular-nums ${tone === 'coral' ? 'text-brand' : 'text-ink'}`}>{value}</span>
      {unit && <span className="text-[14px] font-semibold text-ink">{unit}</span>}
    </span>
  );
}

const NOTE_TONE = {
  info: 'border-brand-pale text-ink',
  ok: 'border-[#3FA36B] text-[#1E6B3E]',
  warn: 'border-[#E8A23A] text-[#7A4A06]',
  error: 'border-alert text-[#8A1C0A]',
} as const;
/** A message without a box: a 3 px coloured bar on the left. */
export function Note({ children, tone = 'info', role, className = '', id }: {
  children: ReactNode; tone?: keyof typeof NOTE_TONE; role?: 'status' | 'alert' | 'note'; className?: string; id?: string;
}) {
  return <div id={id} role={role} className={`border-l-[3px] pl-3 text-sm ${NOTE_TONE[tone]} ${className}`}>{children}</div>;
}

/** Plain white rounded panel for a test stimulus (still: no animation). Pure white inside. */
export function StimulusPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[24px] bg-white ${className}`}
      style={{ boxShadow: '0 20px 34px -18px rgba(168,44,20,.55), 0 0 0 5px rgba(255,255,255,.55)' }}>
      {children}
    </div>
  );
}

/** Camera view frame: a circle (distance check) or an oval (frame fit), 4 px white then 4 px coral ring and a soft shadow. */
export function CameraFrame({ children, shape = 'circle' }: { children: ReactNode; shape?: 'circle' | 'oval' }) {
  const size = shape === 'circle' ? 'h-[176px] w-[176px] rounded-full' : 'h-[200px] w-[156px] rounded-[50%]';
  return (
    <div className={`mx-auto overflow-hidden bg-black ${size}`}
      style={{ boxShadow: '0 0 0 4px #fff, 0 0 0 8px #D9481E, 0 22px 34px -14px rgba(168,44,20,.55)' }}>
      {children}
    </div>
  );
}

/**
 * Words side by side that each act at once (dial and red-green answers): full opacity, a static pale coral underline.
 * Not toggles, so no aria-pressed. `swatch` shows a small fixed colour before the word (the red-green halves).
 */
export function ActionWords({ options, className = '' }: {
  options: { id: string; label: ReactNode; onClick: () => void; swatch?: string }[]; className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-1 ${className}`}>
      {options.map((o) => (
        <button key={o.id} type="button" onClick={o.onClick}
          className="al-focus relative inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-[15px] font-bold text-ink active:scale-95">
          {o.swatch && <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/20" style={{ background: o.swatch }} />}
          {o.label}
          <span aria-hidden className="absolute inset-x-1 bottom-1.5 h-[3px] rounded-full bg-brand-pale" />
        </button>
      ))}
    </div>
  );
}

/** Label / value rows with coral hairlines between them, no box. */
export function Rows({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <dl className={`divide-y divide-line text-sm ${className}`}>{children}</dl>;
}
export function RowItem({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,42%)_1fr] gap-x-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
