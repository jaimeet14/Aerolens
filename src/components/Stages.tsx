import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CAMERA_DENIED, DEMO, type Iris } from '../hooks/useIrisDistance';
import { useOfflineReady } from '../hooks/useOfflineReady';
import { screenLimit } from '../lib/acuity';
import { CALIBRATE_MAX_CM, CALIBRATE_MIN_CM, parseCalibrationDistanceMm, startBlocker } from '../lib/calibration';
import { testedWithFrom, type ContactLenses } from '../lib/correction';
import { CALIBRATION, CAMERA, DATE_LOCALE, fmt, LANG_NAME, LANGS, REFERRAL, SAFETY, SCALE, WELCOME, type Lang, type Text } from '../lib/i18n';
import { CARD_SHORT_MM, scaleBoxMaxPx } from '../lib/optics';
import { RED_FLAGS, redFlagText } from '../lib/triage';
import type { Correction, TestedWith } from '../lib/types';
import { formatBuildTime } from '../lib/version';
import type { OfflineStatus } from '../lib/offline';
import {
  BigNumber, Bloom, CameraFrame, Footer, Heading, Note, RisingBubbles, Steps, TextLink, TickRow, TickRows, UnderlineSwitch, VesselHero,
  type SwitchOption,
} from './Coral';
import { Fill, Rich } from './Text';

/** Build time in the phone's local time; the typeof guard keeps it safe where `define` did not run. */
const BUILD_LABEL = formatBuildTime(typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '');

const OFFLINE_TEXT: Record<Exclude<OfflineStatus, 'hidden'>, Text> = {
  downloading: WELCOME.offlineDownloading,
  ready: WELCOME.offlineReady,
  updating: WELCOME.offlineUpdating,
  'update-ready': WELCOME.offlineUpdateReady,
};

/**
 * The first screen. The language choice comes first, with each language named in its own script; everything below
 * it (and every later patient screen) follows the chosen language, so it can be changed here until Start.
 */
export function Welcome({ lang, onLang, onStart, onRecent }: {
  lang: Lang; onLang: (l: Lang) => void; onStart: () => void; onRecent: () => void;
}) {
  const T = WELCOME;
  const offline = useOfflineReady();
  return (
    <div className="relative">
      {/* Vessels from the optic disc arcing over the top right; the title sits below the main vessel's tail (150 px), so no
          vessel crosses the title or the tagline at 360-375 px. Decorative, behind everything. */}
      <VesselHero />
      <p className="pt-1 text-[11px] font-bold uppercase tracking-[1.2px] text-[#B8391A]">Team Aero</p>
      {/* The brand name, not translated. */}
      <h1 aria-label="AeroLens" className="mt-[150px] text-[44px] font-extrabold leading-[.95] tracking-[-1.5px] text-ink">
        <span aria-hidden className="block">Aero</span>
        <span aria-hidden className="block pl-[30px] font-bold italic text-brand">Lens</span>
      </h1>
      <p className="mt-4 max-w-[15rem] font-medium text-ocean">{T.tagline[lang]}</p>
      <fieldset className="mt-5">
        {/* Every language, since the person may not read the current one yet. */}
        <legend className="text-[11px] font-medium text-muted">
          {LANGS.map((l, i) => <span key={l} lang={l}>{i > 0 && ' · '}{T.chooseLang[l]}</span>)}
        </legend>
        <UnderlineSwitch className="mt-0.5" separator value={lang} onPick={onLang}
          options={LANGS.map((l) => ({ id: l, label: LANG_NAME[l], lang: l }))} />
      </fieldset>
      <ul className="mt-4 space-y-2 text-sm text-ink">
        {[T.minutes, T.card, T.brightness].map((t) => (
          <li key={t.en} className="flex gap-2.5">
            <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span>{t[lang]}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex items-end justify-between gap-4">
        <div className="min-w-0 pb-1">
          <p className="text-[15px] font-extrabold tracking-[-0.4px]">{T.ready[lang]}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted">{T.disclaimer[lang]}</p>
        </div>
        <span className="relative mr-1 shrink-0">
          <RisingBubbles />
          <Bloom size={84} onClick={onStart}>{T.start[lang]}</Bloom>
        </span>
      </div>
      {DEMO && <p className="mt-4 text-center text-xs text-muted">{T.demo[lang]}</p>}
      <button className="al-focus mx-auto mt-4 block min-h-11 rounded-md px-2 text-center text-sm font-semibold text-ocean underline-offset-4 hover:underline" onClick={onRecent}>
        {T.recent[lang]}
      </button>
      {/* Offline / update status of the service worker; the live region stays mounted so each change is announced.
          Welcome screen only, so "Reload now" never interrupts a test. */}
      <div className={`text-center text-xs text-muted ${offline === 'hidden' ? 'hidden' : 'mt-2'}`}>
        <p aria-live="polite">{offline === 'hidden' ? '' : OFFLINE_TEXT[offline][lang]}</p>
        {offline === 'update-ready' && (
          <button type="button" className="al-focus mt-1 min-h-11 rounded-full px-4 text-xs font-semibold text-ocean ring-1 ring-ocean/50"
            onClick={() => location.reload()}>
            {T.reloadNow[lang]}
          </button>
        )}
      </div>
      {BUILD_LABEL && <p className="mt-2 text-center text-[11px] text-muted">{fmt(T.version[lang], { time: BUILD_LABEL })}</p>}
    </div>
  );
}

const ChooseOne = ({ lang }: { lang: Lang }) => <Note tone="error" role="alert" className="mt-2">{SAFETY.chooseOne[lang]}</Note>;

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
  const usualWear: SwitchOption<Correction>[] = [
    { id: 'none', label: T.wearNone[lang] },
    { id: 'glasses', label: T.wearGlasses[lang] },
    { id: 'contacts', label: T.wearContacts[lang] },
  ];
  const lensChoice: SwitchOption<ContactLenses>[] = [
    { id: 'out', label: T.lensesOut[lang] },
    { id: 'in', label: T.lensesIn[lang] },
  ];
  return (
    <div>
      <Heading>{T.title[lang]}</Heading>
      <p className="mt-1 text-muted">{T.ask[lang]}</p>
      <TickRows className="mt-3">
        {RED_FLAGS.map((f) => (
          <TickRow key={f} selected={checked.includes(f)} onClick={() => toggle(f)}>{redFlagText(f, lang)}</TickRow>
        ))}
      </TickRows>
      <fieldset className="mt-6">
        <legend className="font-semibold">{T.usualQ[lang]}</legend>
        <UnderlineSwitch className="mt-1" options={usualWear} value={usual} onPick={pickUsual} />
        {missing && usual === null && <ChooseOne lang={lang} />}
      </fieldset>
      {usual === 'glasses' && (
        <Note role="status" className="mt-4 font-medium">{T.glassesOff[lang]}</Note>
      )}
      {usual === 'contacts' && (
        <fieldset className="mt-5">
          <legend className="font-semibold">{T.contactsQ[lang]}</legend>
          <p className="mt-1 text-sm text-muted">{T.contactsNote[lang]}</p>
          <UnderlineSwitch className="mt-1" options={lensChoice} value={lenses} onPick={pickLenses} />
          {missing && lenses === null && <ChooseOne lang={lang} />}
        </fieldset>
      )}
      <Footer>
        <Bloom size={checked.length ? 72 : 80} onClick={submit}>{checked.length ? T.continue[lang] : T.noneApply[lang]}</Bloom>
      </Footer>
    </div>
  );
}

export function Referral({ lang, flags, onRestart }: { lang: Lang; flags: string[]; onRestart: () => void }) {
  const T = REFERRAL;
  return (
    <div>
      <span aria-hidden className="grid h-[46px] w-[46px] place-items-center rounded-full"
        style={{ background: 'radial-gradient(circle at 35% 30%, #FF8A6A, #C8321A 60%, #8A1C0A)', boxShadow: '0 8px 16px -6px rgba(138,28,10,.7)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 7v6" /><path d="M12 17.2v.1" />
        </svg>
      </span>
      <Heading className="mt-4">{T.title[lang]}</Heading>
      <p className="mt-3 text-sm font-semibold text-muted">{T.told[lang]}</p>
      <ul className="mt-1 divide-y divide-line">
        {flags.map((f) => (
          <li key={f} className="flex gap-2.5 py-2">
            <span aria-hidden className="mt-[0.45rem] h-2 w-2 shrink-0 rounded-full bg-alert" />
            <span>{redFlagText(f, lang)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-ink">{T.body[lang]}</p>
      <Footer>
        <Bloom size={72} onClick={onRestart}>{T.restart[lang]}</Bloom>
      </Footer>
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
  const min = 100;
  const fill = `${(((w - min) / Math.max(1, max - min)) * 100).toFixed(1)}%`;
  return (
    <div>
      <Heading>{T.title[lang]}</Heading>
      <Steps className="mt-3" items={[
        T.step1[lang],
        <Rich text={T.step2[lang]} boldClass="text-ink" />,
        T.step3[lang],
        <Rich text={T.step4[lang]} boldClass="text-ink" />,
      ]} />
      {/* Full-bleed white row so the box can be wider than the page padding allows. The dashed border is inside the box
          (border-box), so its outer edge is exactly w. Only the width is calibrated, so height is capped to keep the slider on screen. */}
      <div className="relative left-1/2 mt-5 flex w-screen -translate-x-1/2 justify-center bg-white py-4">
        <div ref={box} className="shrink-0 rounded-xl border-2 border-dashed border-brand bg-polyp/50" style={{ width: w, height: Math.min((w * 85.6) / CARD_SHORT_MM, 200) }} />
      </div>
      <input type="range" className="al-range mt-3 w-full" min={min} max={max} step={0.5} value={w}
        style={{ '--fill': fill } as CSSProperties} onChange={(e) => setW(Number(e.target.value))} aria-label={T.slider[lang]} />
      <Footer className="mt-3" left={
        // Collapsed by default, so the slider and button stay on screen at 360 px.
        <details className="text-sm">
          <summary className="al-focus flex min-h-11 cursor-pointer items-center rounded-md font-semibold text-ocean">{T.why[lang]}</summary>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
            <li>{T.why1[lang]}</li>
            <li>{T.why2[lang]}</li>
            <li>{fmt(T.why3[lang], { mm: CARD_SHORT_MM })}</li>
            <li>{T.why4[lang]}</li>
            <li>{T.why5[lang]}</li>
          </ul>
        </details>
      }>
        <Bloom size={84} fontSize={12} onClick={done}>{T.done[lang]}</Bloom>
      </Footer>
    </div>
  );
}

/** Mirrored live camera preview (also used by the frame-fit step). Fills its frame (CameraFrame). */
export function Preview({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay muted playsInline className="h-full w-full -scale-x-100 bg-black object-cover" />;
}

/** The camera frame's content in demo mode (no camera). */
export const DemoCamera = ({ text }: { text: string }) => (
  <div className="grid h-full w-full place-items-center bg-sunk px-4 text-center text-sm text-muted">{text}</div>
);

// English keeps the browser's own date format, as before; Hindi uses Hindi month names.
const dateOf = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString(DATE_LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' });

type CalMsg = { tone: 'ok' | 'warn' | 'error'; text: keyof typeof CALIBRATION };

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

  if (DEMO) return <p className="mt-4 text-sm text-muted">{T.demo[lang]}</p>;

  if (iris.calibrated && !editing) {
    return (
      <div className="mt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-[#1E6B3E]">✓ {T.calibrated[lang]}</p>
          <TextLink className="shrink-0" onClick={() => { setEditing(true); setMsg(null); }}>{T.recalibrate[lang]}</TextLink>
        </div>
        {msg && <Note role="status" tone={msg.tone} className="mt-1">{msgText(msg)}</Note>}
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
    <section className="mt-6 border-t border-line pt-4 text-sm" aria-labelledby="cal-title">
      <h3 id="cal-title" className="text-base font-extrabold tracking-[-0.3px]">{editing ? T.titleEdit[lang] : T.titleFirst[lang]}</h3>
      <p className="mt-1 text-muted">{T.why[lang]}</p>
      <Steps className="mt-3" items={[fmt(T.step1[lang], { cm: targetCm }), T.step2[lang], <Rich text={T.step3[lang]} />]} />
      <form className="mt-2" onSubmit={(e) => { e.preventDefault(); if (ready) calibrate(); }}>
        <Footer className="mt-2" left={
          <label className="flex items-baseline gap-1.5">
            <input className="al-focus w-24 border-b-[3px] border-brand bg-transparent pb-0.5 text-[36px] font-extrabold leading-none tracking-[-1px] text-ink tabular-nums"
              inputMode="decimal" value={cm} onChange={(e) => { setCm(e.target.value); setMsg(null); }} aria-label={T.input[lang]} />
            <span className="text-[14px] font-semibold">cm</span>
          </label>
        }>
          <Bloom type="submit" size={72} disabled={!ready}>{T.button[lang]}</Bloom>
        </Footer>
      </form>
      {!ready && iris.status !== 'error' && <p className="mt-2 text-muted">{T.needFace[lang]}</p>}
      {msg && <Note role="status" tone={msg.tone} className="mt-2">{msgText(msg)}</Note>}
      {editing && (
        <TextLink className="mt-2" onClick={() => { setEditing(false); setMsg(null); }}>{T.keep[lang]}</TextLink>
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
    <div>
      <Heading>{T.title[lang]}</Heading>
      <p className="mt-1 text-sm text-muted">{fmt(T.intro[lang], { cm: targetCm })}</p>
      <div className="mt-6">
        <CameraFrame>{DEMO ? <DemoCamera text={T.demoCamera[lang]} /> : <Preview stream={iris.stream} />}</CameraFrame>
      </div>
      {iris.status === 'loading' && <p className="mt-4 text-center text-muted">{T.starting[lang]}</p>}
      {iris.status === 'error' && <Note tone="error" role="alert" className="mt-4">{cameraError(iris.error, lang)}</Note>}
      {iris.status === 'ready' && (
        <div className="mt-5 text-center">
          {iris.faceFound && iris.distanceMm
            ? <BigNumber value={(iris.distanceMm / 10).toFixed(0)} unit="cm" />
            : <p className="text-lg font-bold">{T.looking[lang]}</p>}
          <p className="mt-1 text-xs font-semibold text-muted">{fmt(T.target[lang], { cm: targetCm })}</p>
        </div>
      )}
      {savedScaleAt && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-2 text-sm">
          <p className="text-muted">
            <Fill template={T.screenSaved[lang]} nodes={{ date: <span className="whitespace-nowrap">{dateOf(savedScaleAt, lang)}</span> }} />
          </p>
          <TextLink className="shrink-0" onClick={onRecalibrateScreen}>{T.recalScreen[lang]}</TextLink>
        </div>
      )}
      <CameraCalibration lang={lang} iris={iris} targetCm={targetCm} />
      {!limit.reaches66 && (
        <Note tone="warn" role="note" className="mt-4">
          {limit.snellen
            ? fmt(T.limit[lang], { snellen: limit.snellen, cm: targetCm })
            : fmt(T.tooCoarse[lang], { cm: targetCm })}
        </Note>
      )}
      <Footer left={
        // A visible reason instead of a silently disabled button.
        blocker && <p id="start-blocker" className="text-sm text-muted">{blocker}</p>
      }>
        <Bloom size={80} fontSize={12} disabled={blocker !== null} describedBy={blocker ? 'start-blocker' : undefined} onClick={onContinue}>
          {T.start[lang]}
        </Bloom>
      </Footer>
    </div>
  );
}
