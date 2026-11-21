import type { ReactNode } from 'react';
import type { Iris } from '../hooks/useIrisDistance';
import { fmt, GUARD, type Lang } from '../lib/i18n';
import { inRange } from '../lib/optics';

/**
 * Shows its children only while the face is at the target distance (iris-measured). Still: no animation.
 * `outside(ok)` is rendered after it either way (e.g. a link that must stay available when the children are hidden).
 */
export function DistanceGuard({ lang, iris, targetMm, children, outside }: {
  lang: Lang; iris: Iris; targetMm: number; children: ReactNode; outside?: (ok: boolean) => ReactNode;
}) {
  const T = GUARD;
  const d = iris.distanceMm;
  const ok = iris.faceFound && inRange(d, targetMm);
  const cm = (targetMm / 10).toFixed(0);
  return (
    <div className="relative">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        {/* Green in range, amber otherwise (the same dot colours as the staff triage levels). */}
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ok ? '#3FA36B' : '#E8A23A' }} />
        {fmt(T.badge[lang], { distance: d ? `${(d / 10).toFixed(0)} cm` : T.noFace[lang], cm })}
      </p>
      {ok ? (
        children
      ) : (
        <div className="border-y border-line py-8 text-center">
          <p className="text-[22px] font-extrabold tracking-[-0.4px]">
            {(!iris.faceFound ? T.notFound : d! > targetMm ? T.closer : T.back)[lang]}
          </p>
          <p className="mt-1 text-sm text-muted">
            {!iris.faceFound ? T.look[lang] : fmt(T.hold[lang], { cm })}
          </p>
        </div>
      )}
      {outside?.(ok)}
    </div>
  );
}
