import { useState, type ReactNode } from 'react';
import { testedWithText, usualWearText } from '../lib/correction';
import { dialText } from '../lib/dial';
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

const BADGE: Record<TriageLevel, string> = {
  ok: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  advise: 'bg-brand-soft text-brand ring-brand/30',
  refer: 'bg-amber-50 text-amber-900 ring-amber-200',
};

function LevelBadge({ level }: { level: TriageLevel }) {
  return <span className={`badge inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${BADGE[level]}`}>{LEVEL_TEXT[level]}</span>;
}
function DemoBadge() {
  return <span className="badge inline-block rounded-full bg-sunk px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line">Demo</span>;
}

const Row = ({ k, children }: { k: string; children: ReactNode }) => (
  <><dt className="text-subtle">{k}</dt><dd className="min-w-0 break-words">{children}</dd></>
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
      <div className="no-print flex gap-2">
        <button className="btn btn-ghost flex-1" onClick={onBack}>Back</button>
        <button className="btn btn-primary flex-1" onClick={() => window.print()}>Print</button>
      </div>

      <article className="print-area space-y-3">
        <header className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">AeroLens · staff summary</p>
          <h2 className="mt-1 text-xl font-semibold">Screening summary</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <Row k="Started">{historyTime(entry.startedAt)}</Row>
            <Row k="Finished">{historyTime(entry.savedAt)}</Row>
            <Row k="Session">{entry.id.slice(0, 8)}</Row>
          </dl>
          {r.demo && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted"><DemoBadge /> Camera off: not real measurements.</p>
          )}
        </header>

        <section className="card">
          <div className="flex flex-wrap items-center gap-2"><LevelBadge level={t.level} /></div>
          <h3 className="mt-2 text-lg font-semibold">{t.headline}</h3>
          {t.reasons.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{t.reasons.map((x) => <li key={x}>{x}</li>)}</ul>}
          <p className="mt-3 text-sm"><span className="text-subtle">Red flags: </span>{r.safetyFlags.length ? r.safetyFlags.join('; ') : 'none reported'}</p>
          {t.notes.length > 0 && (
            <div className="mt-3 rounded-2xl bg-sunk p-3 text-sm text-muted">
              <p className="font-medium text-ink">Also noted</p>
              <ul className="mt-1 space-y-1">{t.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
        </section>

        <section className="card">
          <h3 className="font-semibold">Vision tests</h3>
          <p className="mt-1 text-xs text-subtle">
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
                </dl>
              </div>
            );
          })}
          <p className="mt-3 text-xs text-subtle">Near vision at {cm} cm can differ from distance vision.</p>
        </section>

        <section className="card">
          <h3 className="font-semibold">Interview</h3>
          {r.interview ? (
            <>
              <p className="mt-1 text-xs text-subtle">Answered in {r.lang ? LANG_TEXT[r.lang] : 'an unrecorded language'}</p>
              <dl className="mt-2 space-y-2 text-sm">
                {rows.map((q) => (
                  <div key={q.question}><dt className="text-subtle">{q.question}</dt><dd>{q.answer}</dd></div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Not answered (skipped, or not asked after red flags).</p>
          )}
        </section>

        <section className="card">
          <h3 className="font-semibold">Lens suggestions</h3>
          {rec ? (
            <>
              <p className="mt-1 text-sm text-muted">{STATUS_TEXT[rec.status]}</p>
              {rec.items.length > 0 && (
                <ul className="mt-3 space-y-3">
                  {rec.items.map((it) => (
                    <li key={it.category}>
                      <p className="text-xs text-subtle">{KIND_TEXT[it.kind]}</p>
                      <p className="font-medium">{it.category}</p>
                      {it.zeissFamily && <p className="text-sm text-brand">{it.zeissFamily}</p>}
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">{it.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
                    </li>
                  ))}
                </ul>
              )}
              {rec.notes.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-2xl bg-sunk p-3 text-sm text-muted">{rec.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Not computed for this session.</p>
          )}
        </section>

        {r.fit?.status === 'captured' ? <FitSummary fit={r.fit} /> : (
          <section className="card">
            <h3 className="font-semibold">Frame fit</h3>
            <p className="mt-1 text-sm text-muted">
              {r.fit?.status === 'skipped' ? `Skipped${r.fit.failure ? ` (last try: ${r.fit.failure})` : ''}.` : 'Not reached.'}
            </p>
          </section>
        )}

        <p className="px-1 text-xs text-subtle">
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
      <button className="btn btn-ghost w-full" onClick={onBack}>Back</button>
      <section className="card">
        <h2 className="text-xl font-semibold">Recent sessions</h2>
        <p className="mt-1 text-sm text-muted">Checks finished on this phone, newest first (the last 20 are kept). No names are stored.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">Could not change the saved sessions on this phone.</p>}
        {entries.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-sunk p-4 text-sm text-muted">No sessions yet. Finished checks appear here when the results screen is reached.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2">
                <button className="min-w-0 flex-1 rounded-2xl p-2 text-left hover:bg-sunk" onClick={() => onOpen(e)}>
                  <span className="block text-sm font-medium">{historyTime(e.savedAt)}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <LevelBadge level={e.report.triage.level} />
                    {e.report.demo && <DemoBadge />}
                  </span>
                </button>
                <button className="btn btn-ghost shrink-0 px-3 py-2 text-sm" aria-label={`Delete session from ${historyTime(e.savedAt)}`}
                  onClick={() => remove(e.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {entries.length > 0 && (confirmClear ? (
        <div className="card" role="alertdialog" aria-label="Clear all sessions">
          <p className="font-medium">Delete all {entries.length} saved {entries.length === 1 ? 'session' : 'sessions'} on this phone?</p>
          <p className="mt-1 text-sm text-muted">This cannot be undone.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
            <button className="btn rounded-full bg-red-700 text-white hover:bg-red-800" onClick={clear}>Delete all</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost w-full" onClick={() => setConfirmClear(true)}>Clear all</button>
      ))}
    </div>
  );
}
