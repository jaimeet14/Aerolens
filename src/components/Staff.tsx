import { useState, type ReactNode } from 'react';
import { testedWithText, usualWearText } from '../lib/correction';
import { dialText } from '../lib/dial';
import { farPointText } from '../lib/farpoint';
import {
  CHART_TEXT, clearHistory, deleteFromHistory, DUO_TEXT, historyTime, interviewRows, KIND_TEXT, LANG_TEXT, LEVEL_TEXT, loadHistory,
  type HistoryEntry,
} from '../lib/history';
import { STATUS_TEXT } from '../lib/recommend';
import { getStore } from '../lib/storage';
import { acuityText, type TriageLevel } from '../lib/triage';
import type { Eye } from '../lib/types';
import { FitSummary } from './Fit';

/* Staff-facing screens (English only): one session's printable summary, and the recent sessions on this phone.
   Everything shown comes from the stored report (lib/history.ts); triage and lens suggestions are not recomputed. */

/** Triage level as a coloured dot plus its word (the word carries the meaning in print, where the dot prints black). */
const DOT: Record<TriageLevel, string> = { ok: '#3FA36B', advise: '#E8A23A', refer: '#C8321A' };

function LevelBadge({ level }: { level: TriageLevel }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: DOT[level] }} />{LEVEL_TEXT[level]}
    </span>
  );
}
function DemoBadge() {
  return <span className="badge inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">Demo</span>;
}
const STAFF_EYEBROW = 'text-[11px] font-bold uppercase tracking-[1.2px] text-[#B8391A]';
const SECTION = 'print-block border-t border-line pt-3';
/** Staff text buttons (Back, Print, Clear all): ocean, 44 px tall. */
const TEXT_BTN = 'al-focus min-h-11 rounded-md px-1 text-sm font-semibold text-ocean underline-offset-4 hover:underline';

const Row = ({ k, children }: { k: string; children: ReactNode }) => (
  <><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words">{children}</dd></>
);

/** One stored session on one screen, printable (window.print; print styles in index.css). */
export function StaffSummary({ entry, onBack }: { entry: HistoryEntry; onBack: () => void }) {
  const r = entry.report;
  const t = r.triage;
  const rec = r.recommendation;
  const cm = Math.round(r.targetMm / 10);
  const rows = interviewRows(r.interview);
  return (
    <div className="space-y-3">
      <div className="no-print flex justify-between gap-2">
        <button className={TEXT_BTN} onClick={onBack}>← Back</button>
        <button className={TEXT_BTN} onClick={() => window.print()}>Print</button>
      </div>

      <article className="print-area space-y-4">
        <header className="print-block">
          <p className={STAFF_EYEBROW}>AeroLens · staff summary</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-[-0.4px] text-[#B8391A]">Screening summary</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <Row k="Started">{historyTime(entry.startedAt)}</Row>
            <Row k="Finished">{historyTime(entry.savedAt)}</Row>
            <Row k="Session">{entry.id.slice(0, 8)}</Row>
          </dl>
          {r.demo && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted"><DemoBadge /> Camera off: not real measurements.</p>
          )}
        </header>

        <section className={SECTION}>
          <div className="flex flex-wrap items-center gap-2"><LevelBadge level={t.level} /></div>
          <h3 className="mt-1 text-lg font-extrabold">{t.headline}</h3>
          {t.reasons.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{t.reasons.map((x) => <li key={x}>{x}</li>)}</ul>}
          <p className="mt-3 text-sm"><span className="text-muted">Red flags: </span>{r.safetyFlags.length ? r.safetyFlags.join('; ') : 'none reported'}</p>
          {t.notes.length > 0 && (
            <div className="mt-3 border-l-[3px] border-brand-pale pl-3 text-sm text-muted">
              <p className="font-semibold text-ink">Also noted</p>
              <ul className="mt-1 space-y-1">{t.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
        </section>

        <section className={SECTION}>
          <h3 className="font-extrabold text-[#B8391A]">Vision tests</h3>
          <p className="mt-1 text-xs text-muted">
            {r.chart ? CHART_TEXT[r.chart] : 'Chart not recorded'} · {testedWithText(r.testedWith)} · {usualWearText(r.correction)}
          </p>
          {(['right', 'left'] as Eye[]).map((e) => {
            const x = r.results[e];
            return (
              <div key={e} className="mt-3">
                <h4 className="text-sm font-medium capitalize">{e} eye</h4>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <Row k={`Near vision (${cm} cm)`}>{acuityText(x.logMAR, x.limited)}</Row>
                  <Row k="Line dial">{dialText(x.astigmatism)}</Row>
                  <Row k="Red-green">{x.duochrome ? DUO_TEXT[x.duochrome] : '—'}</Row>
                  {/* Reports before v13 have no far-point step, so no row. */}
                  {'farPoint' in x && (
                    <Row k={r.testedWith === 'contacts' ? 'Far point, with contact lenses in' : 'Far point'}>{farPointText(x.farPoint)}</Row>
                  )}
                </dl>
              </div>
            );
          })}
          <p className="mt-3 text-xs text-muted">
            Near vision at {cm} cm can differ from distance vision.
            {'farPoint' in r.results.right && ' The far point is a rough, provisional estimate of short sight (letters followed until they blur), not a prescription.'}
          </p>
        </section>

        <section className={SECTION}>
          <h3 className="font-extrabold text-[#B8391A]">Interview</h3>
          {r.interview ? (
            <>
              <p className="mt-1 text-xs text-muted">Answered in {r.lang ? LANG_TEXT[r.lang] : 'an unrecorded language'}</p>
              <dl className="mt-2 space-y-2 text-sm">
                {rows.map((q) => (
                  <div key={q.question}><dt className="text-muted">{q.question}</dt><dd>{q.answer}</dd></div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Not answered (skipped, or not asked after red flags).</p>
          )}
        </section>

        <section className={SECTION}>
          <h3 className="font-extrabold text-[#B8391A]">Lens suggestions</h3>
          {rec ? (
            <>
              <p className="mt-1 text-sm text-muted">{STATUS_TEXT[rec.status]}</p>
              {rec.items.length > 0 && (
                <ul className="mt-3 space-y-3">
                  {rec.items.map((it) => (
                    <li key={it.category}>
                      <p className="text-xs text-muted">{KIND_TEXT[it.kind]}</p>
                      <p className="font-medium">{it.category}</p>
                      {it.zeissFamily && <p className="text-sm font-semibold text-ocean">{it.zeissFamily}</p>}
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">{it.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
                    </li>
                  ))}
                </ul>
              )}
              {rec.notes.length > 0 && (
                <ul className="mt-3 space-y-1 border-l-[3px] border-brand-pale pl-3 text-sm text-muted">{rec.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Not computed for this session.</p>
          )}
        </section>

        {r.fit?.status === 'captured' ? <div className={SECTION}><FitSummary fit={r.fit} /></div> : (
          <section className={SECTION}>
            <h3 className="font-extrabold text-[#B8391A]">Frame fit</h3>
            <p className="mt-1 text-sm text-muted">
              {r.fit?.status === 'skipped' ? `Skipped${r.fit.failure ? ` (last try: ${r.fit.failure})` : ''}.` : 'Not reached.'}
            </p>
          </section>
        )}

        <p className="px-1 text-xs text-muted">
          Screening aid only, not a prescription. Lens powers come only from an optometrist's eye test. Thresholds are provisional until reviewed with an optometrist.
        </p>
      </article>
    </div>
  );
}

/** Recent sessions stored on this phone (newest first): open, delete one, or clear all after an in-app confirm. */
export function StaffList({ onOpen, onBack }: { onOpen: (e: HistoryEntry) => void; onBack: () => void }) {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory(getStore()));
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState(false);
  const remove = (id: string) => {
    const r = deleteFromHistory(getStore(), id);
    setEntries(r.entries);
    setError(!r.ok);
  };
  const clear = () => {
    const r = clearHistory(getStore());
    setEntries(r.entries);
    setError(!r.ok);
    setConfirmClear(false);
  };
  return (
    <div className="space-y-3">
      <button className={TEXT_BTN} onClick={onBack}>← Back</button>
      <section>
        <p className={STAFF_EYEBROW}>Staff</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.4px] text-[#B8391A]">Recent sessions</h2>
        <p className="mt-1 text-sm text-muted">Checks finished on this phone, newest first (the last 20 are kept). No names are stored.</p>
        {error && <p role="alert" className="mt-3 border-l-[3px] border-alert pl-3 text-sm text-[#8A1C0A]">Could not change the saved sessions on this phone.</p>}
        {entries.length === 0 ? (
          <p className="mt-4 border-y border-line py-4 text-sm text-muted">No sessions yet. Finished checks appear here when the results screen is reached.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2">
                <button className="al-focus min-w-0 flex-1 rounded-lg p-2 text-left hover:bg-[#FCF3EE]" onClick={() => onOpen(e)}>
                  <span className="block text-sm font-semibold">{historyTime(e.savedAt)}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <LevelBadge level={e.report.triage.level} />
                    {e.report.demo && <DemoBadge />}
                  </span>
                </button>
                <button className={`${TEXT_BTN} shrink-0 px-2`} aria-label={`Delete session from ${historyTime(e.savedAt)}`}
                  onClick={() => remove(e.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {entries.length > 0 && (confirmClear ? (
        <div className="border-l-[3px] border-alert pl-3" role="alertdialog" aria-label="Clear all sessions">
          <p className="font-semibold">Delete all {entries.length} saved {entries.length === 1 ? 'session' : 'sessions'} on this phone?</p>
          <p className="mt-1 text-sm text-muted">This cannot be undone.</p>
          <div className="mt-2 flex items-center gap-4">
            <button className={TEXT_BTN} onClick={() => setConfirmClear(false)}>Cancel</button>
            <button className="al-focus min-h-11 rounded-full bg-alert px-5 text-sm font-bold text-white hover:bg-[#8A1C0A]" onClick={clear}>Delete all</button>
          </div>
        </div>
      ) : (
        <button className={TEXT_BTN} onClick={() => setConfirmClear(true)}>Clear all</button>
      ))}
    </div>
  );
}
