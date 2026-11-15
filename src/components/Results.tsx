import { useState } from 'react';
import { testedWithText, usualWearText } from '../lib/correction';
import { dialText } from '../lib/dial';
import type { HistoryEntry } from '../lib/history';
import { CHART_NAME, DUO_ANSWER, EYE, fmt, KIND_NAME, RESULTS, type Lang } from '../lib/i18n';
import { recommend, STATUS_TEXTS, type Recommendation } from '../lib/recommend';
import { acuityText, triage } from '../lib/triage';
import type { Eye, Session } from '../lib/types';
import { FitSummary } from './Fit';

const TONE = { ok: 'ring-2 ring-emerald-500', advise: 'ring-2 ring-brand', refer: 'ring-2 ring-amber-500' } as const;

/** "6/19 or better (logMAR ≤ 0.5)": on a narrow screen, wrap before the parenthesis, never inside it. */
function NoBreakParen({ text }: { text: string }) {
  const i = text.indexOf(' (');
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)} <span className="whitespace-nowrap">{text.slice(i + 1)}</span></>;
}

/** Rule-based lens suggestions (lib/recommend): category, ZEISS family, reasons and notes. */
function LensSuggestions({ rec, lang }: { rec: Recommendation; lang: Lang }) {
  return (
    <section className="card">
      <h3 className="font-semibold">{RESULTS.lensTitle[lang]}</h3>
      <p className="mt-1 text-sm text-muted">{STATUS_TEXTS[rec.status][lang]}</p>
      {rec.items.length > 0 && (
        <ul className="mt-3 space-y-4">
          {rec.items.map((it) => (
            <li key={it.category}>
              <p className="text-xs text-subtle">{KIND_NAME[it.kind][lang]}</p>
              <p className="font-medium">{it.category}</p>
              {it.zeissFamily && <p className="text-sm text-brand" lang="en">{it.zeissFamily}</p>}
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">{it.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </li>
          ))}
        </ul>
      )}
      {rec.notes.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-2xl bg-sunk p-3 text-sm text-muted">{rec.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      )}
      <p className="mt-3 text-xs text-subtle">{RESULTS.lensDisclaimer[lang]}</p>
    </section>
  );
}

/**
 * The results screen. `entry` is this session's report, built once by the app when results were reached
 * (lib/history sessionEntry) and saved to the recent sessions; `saved` says whether that save worked.
 * The report (and so the JSON and the staff screen) is always English. In another language the screen shows a
 * second triage and recommendation, built from the same session in session.lang: same levels and items, other words.
 */
export function Results({ session, entry, saved, onRestart, onStaff }: {
  session: Session; entry: HistoryEntry; saved: boolean; onRestart: () => void; onStaff: () => void;
}) {
  const T = RESULTS;
  const lang: Lang = session.lang ?? 'en';
  const stored = entry.report.triage;
  // Interview null (questions skipped): age unknown, so single-vision lenses only (see lib/recommend).
  const storedRec = entry.report.recommendation ?? recommend(session, stored, session.interview);
  const t = lang === 'en' ? stored : triage(session.safetyFlags, session.results, session.targetMm, lang);
  const rec = lang === 'en' ? storedRec : recommend(session, stored, session.interview, lang);
  const cm = Math.round(session.targetMm / 10);
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');
  const [json] = useState(() => JSON.stringify(entry.report, null, 2));
  // The clipboard API only exists on HTTPS/localhost; fall back to showing the text to copy by hand.
  const copy = () => {
    if (!navigator.clipboard) return setCopied('failed');
    navigator.clipboard.writeText(json).then(() => setCopied('yes'), () => setCopied('failed'));
  };
  return (
    <div className="space-y-4">
      <div className={`card ${TONE[t.level]}`}>
        <h2 className="text-2xl font-semibold">{t.headline}</h2>
        {t.reasons.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{t.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
      </div>
      {/* Informational only (they do not change the level), so a neutral style, not a warning. */}
      {t.notes.length > 0 && (
        <section className="rounded-2xl bg-sunk p-4 text-sm text-muted">
          <h3 className="font-medium text-ink">{T.alsoNoted[lang]}</h3>
          <ul className="mt-1 space-y-1">{t.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      )}
      <LensSuggestions rec={rec} lang={lang} />
      <div className="px-1 text-sm text-muted">
        <p>{fmt(T.chart[lang], { chart: session.chart ? CHART_NAME[session.chart][lang] : T.notRecorded[lang] })}</p>
        <p>{testedWithText(session.testedWith, lang)}</p>
        <p>{usualWearText(session.correction, lang)}</p>
      </div>
      {(['right', 'left'] as Eye[]).map((eye) => {
        const r = session.results[eye];
        return (
          <div key={eye} className="card">
            <h3 className="font-semibold capitalize">{EYE[eye][lang]}</h3>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-subtle">{fmt(T.near[lang], { cm })}</dt>
              <dd><NoBreakParen text={acuityText(r.logMAR, r.limited, lang)} /></dd>
              <dt className="text-subtle">{T.dial[lang]}</dt>
              <dd><NoBreakParen text={dialText(r.astigmatism, lang)} /></dd>
              <dt className="text-subtle">{T.redGreen[lang]}</dt>
              <dd>{r.duochrome ? DUO_ANSWER[r.duochrome][lang] : '—'}</dd>
            </dl>
            {r.limited && <p className="mt-2 text-sm text-muted">{T.limited[lang]}</p>}
          </div>
        );
      })}
      <p className="px-1 text-sm text-muted">{fmt(T.nearNote[lang], { cm })}</p>
      {session.fit?.status === 'captured' && <FitSummary fit={session.fit} lang={lang} />}
      {session.fit?.status === 'skipped' && <p className="px-1 text-sm text-muted">{T.fitSkipped[lang]}</p>}
      {session.demo && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">{T.demo[lang]}</p>}
      <p className="text-xs text-subtle">{T.provisional[lang]}</p>
      <div className="flex gap-2">
        <button className="btn btn-ghost flex-1" onClick={copy}>{copied === 'yes' ? T.copied[lang] : T.copy[lang]}</button>
        <button className="btn btn-primary flex-1" onClick={onRestart}>{T.newTest[lang]}</button>
      </div>
      <button className="btn btn-ghost w-full" onClick={onStaff}>{T.staff[lang]}</button>
      {!saved && <p className="px-1 text-xs text-subtle">{T.notSaved[lang]}</p>}
      <details className="rounded-2xl bg-surface p-4 text-sm" open={copied === 'failed'}>
        <summary className="cursor-pointer text-muted">{copied === 'failed' ? T.copyFailed[lang] : T.showData[lang]}</summary>
        {/* The report itself: always English (staff, export and history). */}
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs" lang="en">{json}</pre>
      </details>
    </div>
  );
}
