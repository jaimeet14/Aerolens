import { useEffect, useState } from 'react';
import { Bloom, Footer, Note, VesselMotif } from './components/Coral';
import { FitStep } from './components/Fit';
import { InterviewStep } from './components/Interview';
import { Progress } from './components/Progress';
import { Results } from './components/Results';
import { StaffList, StaffSummary } from './components/Staff';
import { CameraStep, Referral, ScaleStep, Safety, Welcome } from './components/Stages';
import { AcuityTest, AstigmatismTest, CoverPrompt, DuochromeTest, FarPointTest } from './components/Tests';
import { DEMO, useIrisDistance } from './hooks/useIrisDistance';
import { presetChart } from './lib/acuity';
import type { FitRecord } from './lib/face';
import { addToHistory, newSessionId, sessionEntry, type HistoryEntry, type SessionMeta } from './lib/history';
import { CARD_SHORT_MM } from './lib/optics';
import type { Device } from './lib/report';
import { ZOOM, type Lang } from './lib/i18n';
import type { Interview } from './lib/recommend';
import { makeSavedScale, matchesScreen, parseSavedScale, sameDpr, screenSignature, type SavedScale, type ScreenSignature } from './lib/scale';
import { getStore } from './lib/storage';
import type { Correction, Eye, EyeResult, Session, TestedWith } from './lib/types';

const TARGET_MM = 500;
const EYES: Eye[] = ['right', 'left'];
const blank = (): EyeResult => ({ logMAR: null, limited: false, astigmatism: null, duochrome: null, acuityAnswers: [], farPoint: null });
/** A fresh session. The language carries over from the last one (Start over, New test); welcome can change it. */
const newSession = (lang: Lang = 'en'): Session => ({
  safetyFlags: [], correction: null, testedWith: null, pxPerMm: 0, dpr: 1, scaleSource: 'card', scaleSavedAt: null, targetMm: TARGET_MM,
  focalCalibrated: false, demo: DEMO, chart: null, results: { right: blank(), left: blank() }, fit: null,
  interview: null, lang,
});
const newMeta = (): SessionMeta => ({ id: newSessionId(), startedAt: new Date().toISOString() });
const deviceInfo = (): Device => ({
  userAgent: navigator.userAgent,
  screenCss: [screen.width, screen.height],
  viewportCss: [document.documentElement.clientWidth, window.innerHeight],
  dpr: window.devicePixelRatio || 1,
});

/* The card-step result, saved once per device and reused while the screen size and zoom are unchanged.
   Storage may be missing or throw (private mode, blocked site data); then the card step simply runs every time. */
const SCALE_KEY = 'aerolens.scale';
const currentScreen = () => screenSignature(screen.width, screen.height, window.devicePixelRatio || 1);
function forgetScale() {
  try { localStorage.removeItem(SCALE_KEY); } catch { /* storage unavailable */ }
}
function saveScale(pxPerMm: number, signature: ScreenSignature) {
  try { localStorage.setItem(SCALE_KEY, JSON.stringify(makeSavedScale(pxPerMm, signature, new Date().toISOString()))); } catch { /* not saved */ }
}
/** The saved scale if it is valid for this screen right now; a corrupt or non-matching one is removed. */
function loadScale(): SavedScale | null {
  let raw: string | null;
  try { raw = localStorage.getItem(SCALE_KEY); } catch { return null; }
  const saved = parseSavedScale(raw);
  if (saved && matchesScreen(saved, currentScreen())) return saved;
  if (raw !== null) forgetScale();
  return null;
}

type Stage = 'welcome' | 'safety' | 'referral' | 'interview' | 'scale' | 'camera' | 'eye' | 'fit' | 'results' | 'staff' | 'history';
/** Per-eye sub-steps, in order; 'far' (far-point estimate) is the only one not gated at the 50 cm target distance. */
type Sub = 'cover' | 'acuity' | 'astig' | 'duo' | 'far';

export default function App() {
  const [stage, setStage] = useState<Stage>('welcome');
  const [eyeIdx, setEyeIdx] = useState(0);
  const [sub, setSub] = useState<Sub>('cover');
  const [session, setSession] = useState<Session>(newSession);
  const [meta, setMeta] = useState<SessionMeta>(newMeta);
  // This session's report, built and saved to the recent sessions once, when results are reached.
  const [entry, setEntry] = useState<{ entry: HistoryEntry; saved: boolean } | null>(null);
  // Staff summary on show, and the screen its Back returns to.
  const [staff, setStaff] = useState<{ entry: HistoryEntry; from: 'results' | 'history' } | null>(null);
  const iris = useIrisDistance(stage === 'camera' || stage === 'eye' || stage === 'fit');
  const eye = EYES[eyeIdx];
  // Every patient screen follows the session language; the staff screens are English only.
  const lang: Lang = session.lang ?? 'en';
  const pageLang: Lang = stage === 'staff' || stage === 'history' ? 'en' : lang;

  // Monocular tests measure the open eye only; everywhere else (camera step, frame fit) both eyes are open.
  useEffect(() => {
    iris.setEyeMode(stage === 'eye' ? eye : 'both');
  }, [stage, eye, iris.setEyeMode]);
  // <html lang>, for the right fonts, hyphenation and screen-reader voice.
  useEffect(() => {
    document.documentElement.lang = pageLang;
  }, [pageLang]);
  // Staff screens get a near-white page instead of the coral gradient (index.css body[data-page="staff"]).
  const staffPage = stage === 'staff' || stage === 'history';
  useEffect(() => {
    if (staffPage) document.body.dataset.page = 'staff';
    else delete document.body.dataset.page;
  }, [staffPage]);
  // Test pages (a stimulus or the distance gate on screen) are still: the corner vessels are drawn without flowing dashes.
  const stillPage = (stage === 'eye' && sub !== 'cover') || stage === 'fit';

  const patch = (e: Eye, p: Partial<EyeResult>) =>
    setSession((s) => ({ ...s, results: { ...s.results, [e]: { ...s.results[e], ...p } } }));
  const restart = () => { setSession((s) => newSession(s.lang ?? 'en')); setEntry(null); setStaff(null); setEyeIdx(0); setSub('cover'); setStage('welcome'); };
  // A fresh id and start time each time Start is pressed; the history saves each id once.
  const start = () => { setMeta(newMeta()); setStage('safety'); };
  // Saved in the event handler, not an effect, so re-renders and StrictMode's double effects cannot save it twice
  // (addToHistory also ignores an id it already holds).
  const finish = (fit: FitRecord) => {
    const done = { ...session, fit };
    const e = sessionEntry(done, meta, deviceInfo(), new Date().toISOString());
    const saved = addToHistory(getStore(), e).ok;
    setSession(done);
    setEntry({ entry: e, saved });
    setStage('results');
  };
  const openStaff = (e: HistoryEntry, from: 'results' | 'history') => { setStaff({ entry: e, from }); setStage('staff'); window.scrollTo(0, 0); };
  const zoomChanged = stage === 'eye' && !sameDpr(window.devicePixelRatio || 1, session.dpr);
  const geo = { pxPerMm: session.pxPerMm, targetMm: TARGET_MM };
  const recalibrateScreen = () => { forgetScale(); setStage('scale'); };
  // Red flags end at the referral screen (it only offers Start over), so the interview is never shown then:
  // recommend() would return refer-first whatever the answers, and the person should not be kept at the counter.
  const afterSafety = (flags: string[], correction: Correction, testedWith: TestedWith) => {
    setSession((s) => ({ ...s, safetyFlags: flags, correction, testedWith }));
    setStage(flags.length ? 'referral' : 'interview');
  };
  // A Hindi session gets the Landolt C here (Sloan letters are English letters), so the chart question is skipped.
  // The language itself was set on the welcome screen and is kept when the questions are skipped.
  const afterInterview = (interview: Interview | null) => {
    const saved = loadScale();
    setSession((s) => ({
      ...s, interview, chart: presetChart(s.lang) ?? s.chart,
      ...(saved ? { pxPerMm: saved.pxPerMm, dpr: saved.signature.dpr, scaleSource: 'saved' as const, scaleSavedAt: saved.savedAt } : {}),
    }));
    setStage(saved ? 'camera' : 'scale');
  };
  const afterScale = (pxPerMm: number) => {
    const sig = currentScreen();
    saveScale(pxPerMm, sig);
    setSession((s) => ({ ...s, pxPerMm, dpr: sig.dpr, scaleSource: 'card', scaleSavedAt: null }));
    setStage('camera');
  };

  return (
    // isolate: a stacking context, so the decorative vessels (z-index -10, components/Coral.tsx) paint above the fixed page
    // background (body::before) and below the content. overflow-x-clip: the bloom's pulse rings never cause a sideways scroll.
    <main className="relative isolate mx-auto min-h-full max-w-md overflow-x-clip px-4 pb-10 pt-5">
      {/* No header on welcome: its big title is the logo, and the hero vessels need the top of the screen. */}
      {stage !== 'welcome' && <header className="no-print mb-4 flex items-center justify-between gap-4">
        <span className="shrink-0 text-lg font-extrabold tracking-[-0.4px] text-ink">Aero<span className="font-bold italic text-brand">Lens</span></span>
        {stage === 'staff' || stage === 'history'
          ? <span className="text-[11px] font-semibold text-muted">Staff</span>
          : <div className="min-w-0 max-w-[78%] flex-1"><Progress lang={lang} at={stage === 'eye' ? { stage, eyeIdx, sub } : { stage }} /></div>}
      </header>}
      {/* Small vessel drawing in the top-right corner of every patient screen except the welcome hero. */}
      {stage !== 'welcome' && !staffPage && <VesselMotif animated={!stillPage} className="no-print" />}

      {stage === 'welcome' && (
        <Welcome lang={lang} onLang={(l) => setSession((s) => ({ ...s, lang: l }))} onStart={start} onRecent={() => setStage('history')} />
      )}
      {stage === 'safety' && (
        <Safety lang={lang} onContinue={afterSafety} />
      )}
      {stage === 'referral' && <Referral lang={lang} flags={session.safetyFlags} onRestart={restart} />}
      {stage === 'interview' && <InterviewStep lang={lang} onDone={afterInterview} />}
      {stage === 'scale' && (
        <ScaleStep lang={lang} initialPx={CARD_SHORT_MM * (session.pxPerMm || 4)} onDone={afterScale} />
      )}
      {stage === 'camera' && (
        <CameraStep lang={lang} iris={iris} targetMm={TARGET_MM} pxPerMm={session.pxPerMm}
          savedScaleAt={session.scaleSource === 'saved' ? session.scaleSavedAt : null} onRecalibrateScreen={recalibrateScreen}
          onContinue={() => { setSession((s) => ({ ...s, focalCalibrated: iris.calibrated })); setEyeIdx(0); setSub('cover'); setStage('eye'); }} />
      )}

      {stage === 'eye' && zoomChanged && (
        <div>
          <Note tone="warn" role="alert" className="text-base">{ZOOM.changed[lang]}</Note>
          <Footer>
            <Bloom size={72} pulse={false} onClick={recalibrateScreen}>{ZOOM.recalibrate[lang]}</Bloom>
          </Footer>
        </div>
      )}
      {stage === 'eye' && !zoomChanged && (
        <>
          {/* The chart is chosen once, before the first eye; the second eye reuses it. Not asked when it was preset
              from the session language (Hindi: Landolt C, set in afterInterview). */}
          {sub === 'cover' && (
            <CoverPrompt lang={lang} eye={eye} chooseChart={eyeIdx === 0 && presetChart(session.lang) === null}
              onReady={(chart) => { if (chart) setSession((s) => ({ ...s, chart })); setSub('acuity'); }} />
          )}
          {sub === 'acuity' && (
            <AcuityTest key={eye} lang={lang} eye={eye} chart={session.chart ?? 'E'} iris={iris} geo={geo} onDone={(r) => { patch(eye, r); setSub('astig'); }} />
          )}
          {sub === 'astig' && (
            <AstigmatismTest key={eye} lang={lang} eye={eye} iris={iris} geo={geo} acuity={session.results[eye].logMAR} onDone={(a) => { patch(eye, { astigmatism: a }); setSub('duo'); }} />
          )}
          {sub === 'duo' && (
            <DuochromeTest key={eye} lang={lang} eye={eye} iris={iris} geo={geo} acuity={session.results[eye].logMAR}
              onDone={(d) => { patch(eye, { duochrome: d }); setSub('far'); }} />
          )}
          {sub === 'far' && (
            <FarPointTest key={eye} lang={lang} eye={eye} chart={session.chart ?? 'E'} iris={iris} pxPerMm={session.pxPerMm}
              onDone={(fp) => {
                patch(eye, { farPoint: fp });
                if (eyeIdx === 0) { setEyeIdx(1); setSub('cover'); } else setStage('fit');
              }} />
          )}
        </>
      )}
      {stage === 'fit' && (
        <FitStep lang={lang} iris={iris} targetMm={TARGET_MM} onDone={finish} />
      )}
      {stage === 'results' && entry && (
        <Results session={session} entry={entry.entry} saved={entry.saved} onRestart={restart}
          onStaff={() => openStaff(entry.entry, 'results')} />
      )}
      {stage === 'staff' && staff && (
        <StaffSummary entry={staff.entry} onBack={() => { const from = staff.from; setStaff(null); setStage(from); }} />
      )}
      {stage === 'history' && <StaffList onOpen={(e) => openStaff(e, 'history')} onBack={() => setStage('welcome')} />}
    </main>
  );
}
