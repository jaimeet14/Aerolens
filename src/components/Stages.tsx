import { useEffect, useRef, useState } from 'react';
import { CAMERA_DENIED, DEMO, type Iris } from '../hooks/useIrisDistance';
import { screenLimit } from '../lib/acuity';
import { CALIBRATE_MAX_CM, CALIBRATE_MIN_CM, parseCalibrationDistanceMm, startBlocker } from '../lib/calibration';
import { testedWithFrom, type ContactLenses } from '../lib/correction';
import { CALIBRATION, CAMERA, DATE_LOCALE, fmt, LANG_NAME, LANGS, REFERRAL, SAFETY, SCALE, WELCOME, type Lang } from '../lib/i18n';
import { CARD_SHORT_MM, scaleBoxMaxPx } from '../lib/optics';
import { RED_FLAGS, redFlagText } from '../lib/triage';
import type { Correction, TestedWith } from '../lib/types';
import { Fill, Rich } from './Text';

/**
 * The first screen. The language choice comes first, with each language named in its own script; everything below
 * it (and every later patient screen) follows the chosen language, so it can be changed here until Start.
 */
export function Welcome({ lang, onLang, onStart, onRecent }: {
  lang: Lang; onLang: (l: Lang) => void; onStart: () => void; onRecent: () => void;
}) {
  const T = WELCOME;
  return (
    <div className="card">
      <fieldset>
        {/* Every language, since the person may not read the current one yet. */}
        <legend className="text-sm font-medium text-muted">
          {LANGS.map((l, i) => <span key={l} lang={l}>{i > 0 && ' · '}{T.chooseLang[l]}</span>)}
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {LANGS.map((l) => (
            <button key={l} type="button" lang={l} aria-pressed={lang === l}
              className={`btn min-h-12 rounded-2xl px-2 py-2.5 text-lg ${lang === l ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onLang(l)}>
              {LANG_NAME[l]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
      </div>
      <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">{T.title[lang]}</h1>
      <p className="mt-2 text-brand">{T.tagline[lang]}</p>
      <p className="mt-4 text-muted">{T.intro[lang]}</p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>{T.minutes[lang]}</li>
        <li>{T.card[lang]}</li>
        <li>{T.brightness[lang]}</li>
      </ul>
      <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">{T.disclaimer[lang]}</p>
      <button className="btn btn-primary mt-5 w-full" onClick={onStart}>{T.start[lang]}</button>
      {DEMO && <p className="mt-3 text-center text-xs text-subtle">{T.demo[lang]}</p>}
      <button className="mt-4 block w-full text-center text-sm font-medium text-brand underline-offset-4 hover:underline" onClick={onRecent}>
        {T.recent[lang]}
      </button>
    </div>
  );
}

/** A row of pill buttons for one required choice; the selected one is filled. */
function Choice<T extends string>({ options, value, onPick, cols }: {
  options: { id: T; label: string }[]; value: T | null; onPick: (id: T) => void; cols: 'grid-cols-2' | 'grid-cols-3';
}) {
  return (
    <div className={`mt-3 grid ${cols} gap-2`}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id}
          className={`btn rounded-2xl px-2 py-3 text-sm ${value === o.id ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onPick(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const ChooseOne = ({ lang }: { lang: Lang }) => <p className="mt-2 text-sm text-red-700" role="alert">{SAFETY.chooseOne[lang]}</p>;

/**
 * Red flags, then usual wear. The test itself is always done without glasses (contact lenses may stay in).
 * The flags are reported as the English RED_FLAGS strings whatever the language (shown with redFlagText).
 */
export function Safety({ lang, onContinue }: { lang: Lang; onContinue: (flags: string[], correction: Correction, testedWith: TestedWith) => void }) {
  const T = SAFETY;
  const [checked, setChecked] = useState<string[]>([]);
  const [usual, setUsual] = useState<Correction | null>(null);
  const [lenses, setLenses] = useState<ContactLenses | null>(null);
  const [missing, setMissing] = useState(false);
  const toggle = (f: string) => setChecked((c) => (c.includes(f) ? c.filter((x) => x !== f) : [...c, f]));
  const testedWith = testedWithFrom(usual, lenses);
  const submit = () => (usual && testedWith ? onContinue(checked, usual, testedWith) : setMissing(true));
  // A new usual-wear answer asks the contact lens follow-up again, so it is always a deliberate choice.
  const pickUsual = (c: Correction) => { if (c !== usual) setLenses(null); setUsual(c); setMissing(false); };
  const pickLenses = (l: ContactLenses) => { setLenses(l); setMissing(false); };
  const usualWear: { id: Correction; label: string }[] = [
    { id: 'none', label: T.wearNone[lang] },
    { id: 'glasses', label: T.wearGlasses[lang] },
    { id: 'contacts', label: T.wearContacts[lang] },
  ];
  const lensChoice: { id: ContactLenses; label: string }[] = [
    { id: 'out', label: T.lensesOut[lang] },
    { id: 'in', label: T.lensesIn[lang] },
  ];
  return (
    <div className="card">
      <h2 className="text-xl font-semibold">{T.title[lang]}</h2>
      <p className="mt-1 text-muted">{T.ask[lang]}</p>
      <div className="mt-4 space-y-2">
        {RED_FLAGS.map((f) => (
          <label key={f} className="flex items-center gap-3 rounded-2xl bg-sunk p-4">
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-brand" checked={checked.includes(f)} onChange={() => toggle(f)} />
            <span>{redFlagText(f, lang)}</span>
          </label>
        ))}
      </div>
      <fieldset className="mt-6">
        <legend className="font-medium">{T.usualQ[lang]}</legend>
        <Choice options={usualWear} value={usual} onPick={pickUsual} cols="grid-cols-3" />
        {missing && usual === null && <ChooseOne lang={lang} />}
      </fieldset>
      {usual === 'glasses' && (
        <p className="mt-4 rounded-2xl bg-brand-soft p-4 text-sm font-medium text-ink" role="status">{T.glassesOff[lang]}</p>
      )}
      {usual === 'contacts' && (
        <fieldset className="mt-5">
          <legend className="font-medium">{T.contactsQ[lang]}</legend>
          <p className="mt-1 text-sm text-muted">{T.contactsNote[lang]}</p>
          <Choice options={lensChoice} value={lenses} onPick={pickLenses} cols="grid-cols-2" />
          {missing && lenses === null && <ChooseOne lang={lang} />}
        </fieldset>
      )}
      <button className="btn btn-primary mt-5 w-full" onClick={submit}>
        {checked.length ? T.continue[lang] : T.noneApply[lang]}
      </button>
    </div>
  );
}

export function Referral({ lang, flags, onRestart }: { lang: Lang; flags: string[]; onRestart: () => void }) {
  const T = REFERRAL;
  return (
    <div className="card ring-2 ring-red-400">
      <h2 className="text-2xl font-semibold">{T.title[lang]}</h2>
      <p className="mt-2 text-muted">{T.told[lang]}</p>
      <ul className="mt-1 list-disc pl-5">{flags.map((f) => <li key={f}>{redFlagText(f, lang)}</li>)}</ul>
      <p className="mt-4 text-muted">{T.body[lang]}</p>
      <button className="btn btn-ghost mt-5" onClick={onRestart}>{T.restart[lang]}</button>
    </div>
  );
}

/** Step 1: find CSS px per mm by matching an on-screen box to the short edge of an ID-1 card. */
export function ScaleStep({ lang, initialPx, onDone }: { lang: Lang; initialPx: number; onDone: (pxPerMm: number) => void }) {
  const T = SCALE;
  const max = scaleBoxMaxPx(document.documentElement.clientWidth);
  const [w, setW] = useState(Math.min(initialPx, max));
  const box = useRef<HTMLDivElement>(null);
  // Use the box's rendered width, so what the user matched is exactly what we record.
  const done = () => onDone((box.current?.getBoundingClientRect().width || w) / CARD_SHORT_MM);
  return (
    <div className="card">
      <h2 className="text-xl font-semibold">{T.title[lang]}</h2>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-muted">
        <li>{T.step1[lang]}</li>
        <li><Rich text={T.step2[lang]} boldClass="text-ink" /></li>
        <li>{T.step3[lang]}</li>
        <li><Rich text={T.step4[lang]} boldClass="text-ink" /></li>
      </ol>
      {/* Full-bleed row so the box can be wider than the card padding allows; the ring is inset so the outer edge is exactly w. Only the width is calibrated, so height is capped to keep the slider on screen. */}
      <div className="relative left-1/2 mt-5 flex w-screen -translate-x-1/2 justify-center">
        <div ref={box} className="shrink-0 rounded-xl bg-brand-soft ring-2 ring-inset ring-brand" style={{ width: w, height: Math.min((w * 85.6) / CARD_SHORT_MM, 200) }} />
      </div>
      <input type="range" className="mt-5 w-full accent-brand" min={100} max={max} step={0.5} value={w} onChange={(e) => setW(Number(e.target.value))} aria-label={T.slider[lang]} />
      <button className="btn btn-primary mt-4 w-full" onClick={done}>{T.done[lang]}</button>
      {/* Below the button and collapsed by default, so the slider and button stay on screen at 360 px. */}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-brand">{T.why[lang]}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>{T.why1[lang]}</li>
          <li>{T.why2[lang]}</li>
          <li>{fmt(T.why3[lang], { mm: CARD_SHORT_MM })}</li>
          <li>{T.why4[lang]}</li>
          <li>{T.why5[lang]}</li>
        </ul>
      </details>
    </div>
  );
}

/** Mirrored live camera preview (also used by the frame-fit step). */
export function Preview({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay muted playsInline className="h-40 w-full -scale-x-100 rounded-xl bg-black object-cover" />;
}

// English keeps the browser's own date format, as before; Hindi uses Hindi month names.
const dateOf = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString(DATE_LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' });

type CalMsg = { tone: 'ok' | 'warn' | 'error'; text: keyof typeof CALIBRATION };
const MSG_TONE = { ok: 'text-emerald-700', warn: 'text-amber-900', error: 'text-red-700' } as const;

/**
 * The one-time tape-measure calibration of the camera (saved per phone). Until it is done it is a
 * required, expanded step; afterwards a one-line status with a way to redo it. Skipped in demo mode.
 */
function CameraCalibration({ lang, iris, targetCm }: { lang: Lang; iris: Iris; targetCm: number }) {
  const T = CALIBRATION;
  const [editing, setEditing] = useState(false);
  const [cm, setCm] = useState(String(targetCm));
  // The message is kept as a key, so it follows the language.
  const [msg, setMsg] = useState<CalMsg | null>(null);
  const ready = iris.status === 'ready' && iris.faceFound;
  const msgText = (m: CalMsg) => fmt(T[m.text][lang], { min: CALIBRATE_MIN_CM, max: CALIBRATE_MAX_CM });

  if (DEMO) return <p className="mt-4 text-sm text-subtle">{T.demo[lang]}</p>;

  if (iris.calibrated && !editing) {
    return (
      <div className="mt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-emerald-700">{T.calibrated[lang]}</p>
          <button className="btn btn-ghost shrink-0 px-3 py-1.5 text-xs" onClick={() => { setEditing(true); setMsg(null); }}>{T.recalibrate[lang]}</button>
        </div>
        {msg && <p role="status" className={`mt-1 ${MSG_TONE[msg.tone]}`}>{msgText(msg)}</p>}
      </div>
    );
  }

  const badDistance: CalMsg = { tone: 'error', text: 'badDistance' };
  const calibrate = () => {
    const mm = parseCalibrationDistanceMm(cm);
    if (mm === null) return setMsg(badDistance);
    const r = iris.calibrateAt(mm);
    if (r === 'bad-distance') return setMsg(badDistance);
    if (r === 'no-face') return setMsg({ tone: 'error', text: 'noFace' });
    setEditing(false);
    setMsg(r === 'saved' ? { tone: 'ok', text: 'saved' } : { tone: 'warn', text: 'notSaved' });
  };

  return (
    <section className="mt-4 rounded-2xl bg-sunk p-4 text-sm ring-1 ring-brand" aria-labelledby="cal-title">
      <h3 id="cal-title" className="font-semibold">{editing ? T.titleEdit[lang] : T.titleFirst[lang]}</h3>
      <p className="mt-1 text-muted">{T.why[lang]}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>{fmt(T.step1[lang], { cm: targetCm })}</li>
        <li>{T.step2[lang]}</li>
        <li><Rich text={T.step3[lang]} /></li>
      </ol>
      <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (ready) calibrate(); }}>
        <input className="w-20 rounded-full bg-white px-4 py-2 text-ink ring-1 ring-line" inputMode="decimal" value={cm}
          onChange={(e) => { setCm(e.target.value); setMsg(null); }} aria-label={T.input[lang]} />
        <span>cm</span>
        <button type="submit" className="btn btn-primary ml-auto py-2" disabled={!ready}>{T.button[lang]}</button>
      </form>
      {!ready && iris.status !== 'error' && <p className="mt-2 text-muted">{T.needFace[lang]}</p>}
      {msg && <p role="status" className={`mt-2 ${MSG_TONE[msg.tone]}`}>{msgText(msg)}</p>}
      {editing && (
        <button className="mt-3 font-medium text-brand underline underline-offset-2" onClick={() => { setEditing(false); setMsg(null); }}>{T.keep[lang]}</button>
      )}
    </section>
  );
}

/** The camera error in the session language: the refused-permission message is translated, others keep the browser's text. */
function cameraError(error: string | null, lang: Lang): string {
  if (error === CAMERA_DENIED) return CAMERA.denied[lang];
  return fmt(CAMERA.failed[lang], { error: error ?? '' });
}

/**
 * Step 2: camera on, live iris-based distance, the one-time camera calibration (required except in demo),
 * and a warning when the screen cannot draw 6/6 at the test distance.
 * `savedScaleAt` is set when the screen scale was reused from an earlier card step; it shows a way to redo it.
 */
export function CameraStep({ lang, iris, targetMm, pxPerMm, savedScaleAt, onRecalibrateScreen, onContinue }: {
  lang: Lang; iris: Iris; targetMm: number; pxPerMm: number; savedScaleAt: string | null; onRecalibrateScreen: () => void; onContinue: () => void;
}) {
  const T = CAMERA;
  // Same limit the acuity staircase will use (live devicePixelRatio, like AcuityTest).
  const limit = screenLimit(pxPerMm, window.devicePixelRatio || 1, targetMm);
  const targetCm = Math.round(targetMm / 10);
  const blocker = startBlocker({ demo: DEMO, status: iris.status, faceFound: iris.faceFound, calibrated: iris.calibrated }, lang);
  return (
    <div className="card">
      <h2 className="text-xl font-semibold">{T.title[lang]}</h2>
      <p className="mt-1 text-sm text-muted">{fmt(T.intro[lang], { cm: targetCm })}</p>
      <div className="mt-4">{DEMO ? <div className="grid h-40 place-items-center rounded-xl bg-sunk text-subtle">{T.demoCamera[lang]}</div> : <Preview stream={iris.stream} />}</div>
      {iris.status === 'loading' && <p className="mt-3 text-center text-muted">{T.starting[lang]}</p>}
      {iris.status === 'error' && <p className="mt-3 rounded-2xl bg-red-50 p-4 text-red-800 ring-1 ring-red-200">{cameraError(iris.error, lang)}</p>}
      {iris.status === 'ready' && (
        <p className="mt-3 text-center text-3xl font-semibold tabular-nums">
          {iris.faceFound && iris.distanceMm ? `${(iris.distanceMm / 10).toFixed(0)} cm` : T.looking[lang]}
        </p>
      )}
      {savedScaleAt && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <p className="text-muted">
            <Fill template={T.screenSaved[lang]} nodes={{ date: <span className="whitespace-nowrap">{dateOf(savedScaleAt, lang)}</span> }} />
          </p>
          <button className="btn btn-ghost shrink-0 px-3 py-1.5 text-xs" onClick={onRecalibrateScreen}>{T.recalScreen[lang]}</button>
        </div>
      )}
      <CameraCalibration lang={lang} iris={iris} targetCm={targetCm} />
      {!limit.reaches66 && (
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200" role="note">
          {limit.snellen
            ? fmt(T.limit[lang], { snellen: limit.snellen, cm: targetCm })
            : fmt(T.tooCoarse[lang], { cm: targetCm })}
        </p>
      )}
      {/* A visible reason instead of a silently disabled button. */}
      {blocker && <p id="start-blocker" className="mt-5 text-center text-sm text-muted">{blocker}</p>}
      <button className={`btn btn-primary w-full ${blocker ? 'mt-2' : 'mt-5'}`} disabled={blocker !== null}
        aria-describedby={blocker ? 'start-blocker' : undefined} onClick={onContinue}>{T.start[lang]}</button>
    </div>
  );
}
