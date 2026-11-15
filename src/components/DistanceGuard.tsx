import type { ReactNode } from 'react';
import type { Iris } from '../hooks/useIrisDistance';
import { fmt, GUARD, type Lang } from '../lib/i18n';
import { inRange } from '../lib/optics';

/** Shows its children only while the face is at the target distance (iris-measured). */
export function DistanceGuard({ lang, iris, targetMm, children }: { lang: Lang; iris: Iris; targetMm: number; children: ReactNode }) {
  const T = GUARD;
  const d = iris.distanceMm;
  const ok = iris.faceFound && inRange(d, targetMm);
  const cm = (targetMm / 10).toFixed(0);
  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className={`rounded-full px-3 py-1 font-medium ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
          {fmt(T.badge[lang], { distance: d ? `${(d / 10).toFixed(0)} cm` : T.noFace[lang], cm })}
        </span>
      </div>
      {ok ? (
        children
      ) : (
        <div className="card text-center">
          <p className="text-lg font-semibold">
            {(!iris.faceFound ? T.notFound : d! > targetMm ? T.closer : T.back)[lang]}
          </p>
          <p className="mt-1 text-sm text-muted">
            {!iris.faceFound ? T.look[lang] : fmt(T.hold[lang], { cm })}
          </p>
        </div>
      )}
    </div>
  );
}
