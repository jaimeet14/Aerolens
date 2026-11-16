import { useCallback, useEffect, useRef, useState } from 'react';
import { openClips, type ClipPlayer } from '../lib/clipPlayer';

/**
 * Plays recorded clip(s) for the screen being shown (lib/clipPlayer.ts; recorded human clips only, no
 * text-to-speech). One HTMLAudioElement for the url (a list plays in order); it starts playing at once unless muted, and is stopped
 * and released when the url changes or the component unmounts. `canPlay` is true only after a clip loaded
 * (canplay / canplaythrough) and false after every clip failed (missing file, HTML fallback). Never touches storage.
 */
export function useClipPlayer(url: string | readonly string[] | null, muted: boolean) {
  const [canPlay, setCanPlay] = useState(false);
  const player = useRef<ClipPlayer | null>(null);
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  });
  const key = url === null ? '' : typeof url === 'string' ? url : url.join('\n');

  useEffect(() => {
    setCanPlay(false);
    const urls = key ? key.split('\n') : [];
    if (!urls.length || typeof Audio === 'undefined') return;
    const p = openClips(urls, { muted: mutedRef.current, makeAudio: () => new Audio(), onCanPlay: setCanPlay });
    player.current = p;
    return () => {
      p.close();
      if (player.current === p) player.current = null;
    };
  }, [key]);

  useEffect(() => {
    player.current?.setMuted(muted);
  }, [muted]);

  const replay = useCallback(() => player.current?.replay(), []);
  const stop = useCallback(() => player.current?.stop(), []);
  return { canPlay, replay, stop };
}
