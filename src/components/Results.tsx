import { useState } from 'react';
import { testedWithText, usualWearText } from '../lib/correction';
import { dialText } from '../lib/dial';
import { farPointText } from '../lib/farpoint';
import type { HistoryEntry } from '../lib/history';
import { CHART_NAME, DUO_ANSWER, EYE, fmt, KIND_NAME, RESULTS, type Lang } from '../lib/i18n';
import { recommend, STATUS_TEXTS, type Recommendation } from '../lib/recommend';
import { acuityText, snellenOf, triage } from '../lib/triage';
import type { Eye, Session } from '../lib/types';
import { BigNumber, Bloom, Eyebrow, Footer, Heading, Note, RowItem, Rows, TextLink } from './Coral';
import { FitSummary } from './Fit';

/** Triage level as a coloured dot (same colours as the staff screens). */
const LEVEL_DOT = { ok: '#3FA36B', advise: '#E8A23A', refer: '#C8321A' } as const;

/** "6/19 or better (logMAR ≤ 0.5)": on a narrow screen, wrap before the parenthesis, never inside it. */
function NoBreakParen({ text }: { text: string }) {
  const i = text.indexOf(' (');
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)} <span className="whitespace-nowrap">{text.slice(i + 1)}</span></>;
}

/** Rule-based lens suggestions (lib/recommend): category, ZEISS family, reasons and notes. */
function LensSuggestions({ rec, lang }: { rec: Recommendation; lang: Lang }) {
  return (
    <section className="border-t border-line pt-4">
      <h3 className="text-lg font-extrabold tracking-[-0.3px]">{RESULTS.lensTitle[lang]}</h3>
      <p className="mt-1 text-sm text-muted">{STATUS_TEXTS[rec.status][lang]}</p>
      {rec.items.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {rec.items.map((it) => (
            <li key={it.category} className="py-3">
              <p className="text-xs font-semibold text-muted">{KIND_NAME[it.kind][lang]}</p>
              <p className="font-bold">{it.category}</p>
              {it.zeissFamily && <p className="text-sm font-semibold text-ocean" lang="en">{it.zeissFamily}</p>}
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">{it.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </li>
          ))}
        </ul>
      )}
      {rec.notes.length > 0 && (
        <Note className="mt-2"><ul className="space-y-1 text-muted">{rec.notes.map((n) => <li key={n}>{n}</li>)}</ul></Note>
      )}
      <p className="mt-3 text-xs text-muted">{RESULTS.lensDisclaimer[lang]}</p>
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
  // Same arguments as lib/history sessionEntry (including the usual-wear answers), so the levels agree.
  const t = lang === 'en' ? stored : triage(session.safetyFlags, session.results, session.targetMm, lang, session);
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
    <div className="space-y-5">
      <div>
        <p className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_DOT[t.level] }} />
          <Eyebrow tone="ocean">{T.yourResult[lang]}</Eyebrow>
        </p>
        <Heading className="mt-1 text-[26px]">{t.headline}</Heading>
        {t.reasons.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{t.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
      </div>
      {/* Each eye's near acuity side by side as big numbers (right eye in coral), with the full value under it. */}
      <div className="grid grid-cols-2 border-y border-line py-3">
        {(['right', 'left'] as Eye[]).map((eye, i) => {
          const r = session.results[eye];
          const sn = snellenOf(r.logMAR, lang);
          const full = acuityText(r.logMAR, r.limited, lang);
          return (
            <div key={eye} className={`min-w-0 ${i ? 'border-l border-line pl-3' : 'pr-3'}`}>
              <p className="text-xs font-semibold text-muted">{EYE[eye][lang]}</p>
              {/* Big only for a plain 6/x value; "worse than 6/60" in words stays at text size. */}
              {/^\d+\/[\d.]+$/.test(sn)
                ? <BigNumber value={sn} tone={eye === 'right' ? 'coral' : 'ink'} />
                : <p className="text-lg font-extrabold leading-tight">{sn}</p>}
              {full !== sn && <p className="mt-0.5 text-xs text-muted"><NoBreakParen text={full} /></p>}
            </div>
          );
        })}
      </div>
      {/* Informational only (they do not change the level), so a neutral style, not a warning. */}
      {t.notes.length > 0 && (
        <Note>
          <h3 className="font-bold text-ink">{T.alsoNoted[lang]}</h3>
          <ul className="mt-1 space-y-1 text-muted">{t.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </Note>
      )}
      <LensSuggestions rec={rec} lang={lang} />
      <div className="border-t border-line pt-3 text-sm text-muted">
        <p>{fmt(T.chart[lang], { chart: session.chart ? CHART_NAME[session.chart][lang] : T.notRecorded[lang] })}</p>
        <p>{testedWithText(session.testedWith, lang)}</p>
        <p>{usualWearText(session.correction, lang)}</p>
      </div>
      {(['right', 'left'] as Eye[]).map((eye) => {
        const r = session.results[eye];
        return (
          <section key={eye} className="border-t border-line pt-3">
            <h3 className="text-base font-extrabold capitalize tracking-[-0.3px]">{EYE[eye][lang]}</h3>
            <Rows className="mt-1">
              <RowItem label={fmt(T.near[lang], { cm })}><NoBreakParen text={acuityText(r.logMAR, r.limited, lang)} /></RowItem>
              <RowItem label={T.dial[lang]}><NoBreakParen text={dialText(r.astigmatism, lang)} /></RowItem>
              <RowItem label={T.redGreen[lang]}>{r.duochrome ? DUO_ANSWER[r.duochrome][lang] : '—'}</RowItem>
              {/* PROVISIONAL estimate (lib/farpoint.ts); measured with contact lenses in when the person kept them in. */}
              <RowItem label={(session.testedWith === 'contacts' ? T.farPointContacts : T.farPoint)[lang]}>{farPointText(r.farPoint ?? null, lang)}</RowItem>
            </Rows>
            {r.limited && <p className="mt-1 text-sm text-muted">{T.limited[lang]}</p>}
          </section>
        );
      })}
      <p className="text-sm text-muted">{fmt(T.nearNote[lang], { cm })}</p>
      {session.fit?.status === 'captured' && <div className="border-t border-line pt-4"><FitSummary fit={session.fit} lang={lang} /></div>}
      {session.fit?.status === 'skipped' && <p className="text-sm text-muted">{T.fitSkipped[lang]}</p>}
      {session.demo && <Note tone="warn">{T.demo[lang]}</Note>}
      <p className="text-xs text-muted">{T.provisional[lang]}</p>
      <Footer left={<>
        <TextLink onClick={onStaff}>{T.staff[lang]}</TextLink>
        <TextLink onClick={copy}>{copied === 'yes' ? T.copied[lang] : T.copy[lang]}</TextLink>
      </>}>
        <Bloom size={72} onClick={onRestart}>{T.newTest[lang]}</Bloom>
      </Footer>
      {!saved && <p className="text-xs text-muted">{T.notSaved[lang]}</p>}
      <details className="text-sm" open={copied === 'failed'}>
        <summary className="al-focus flex min-h-11 cursor-pointer items-center rounded-md font-semibold text-ocean">{copied === 'failed' ? T.copyFailed[lang] : T.showData[lang]}</summary>
        {/* The report itself: always English (staff, export and history). */}
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-white/70 p-3 text-xs" lang="en">{json}</pre>
      </details>
    </div>
  );
}
