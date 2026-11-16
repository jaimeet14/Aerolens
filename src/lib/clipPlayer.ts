/*
 * Plays the interview's pre-recorded clips (lib/interview.ts audioPath) on one audio element. Recorded human
 * clips only: there is deliberately no text-to-speech fallback anywhere in the app. A clip that is missing or
 * fails to load (404, or an SPA fallback serving HTML, which the element rejects with an `error` event) is
 * skipped in silence. hooks/useClipPlayer.ts wraps this for React; the element is injected so it is testable.
 */

/** The part of HTMLAudioElement used here. */
export interface AudioLike {
  src: string;
  muted: boolean;
  preload: string;
  play(): Promise<void> | void;
  pause(): void;
  load(): void;
  removeAttribute(name: string): void;
  addEventListener(type: string, fn: () => void): void;
  removeEventListener(type: string, fn: () => void): void;
}

export interface ClipPlayer {
  /** Plays the clips again from the first one that has not failed (also when they had finished). */
  replay(): void;
  /** Muting also stops the clip; unmuting does not restart it (replay does). */
  setMuted(muted: boolean): void;
  /** Stops playback; the player stays usable (replay). */
  stop(): void;
  /** Stops and releases the element; the player does nothing afterwards. */
  close(): void;
}

export interface ClipOptions {
  muted: boolean;
  makeAudio: () => AudioLike;
  /** true once a clip has loaded enough to play (canplay / canplaythrough); false when every clip failed. */
  onCanPlay: (canPlay: boolean) => void;
}

/**
 * Opens the clips in order on one element and starts playing at once unless muted (the patient has just tapped
 * Start / Next, so autoplay is allowed; a rejected play() is ignored). When a clip ends, the next one plays.
 */
export function openClips(urls: readonly string[], opts: ClipOptions): ClipPlayer {
  const audio = opts.makeAudio();
  audio.preload = 'auto';
  audio.muted = opts.muted;
  const failed = new Set<number>();
  let idx = -1;
  let want = !opts.muted;
  let closed = false;
  let ready = false;

  const tryPlay = () => {
    try {
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      /* autoplay refused or no media: stay silent */
    }
  };
  /** Loads the first clip from `from` that has not failed; false when none is left. */
  const load = (from: number): boolean => {
    let i = from;
    while (i < urls.length && failed.has(i)) i++;
    idx = i;
    if (i >= urls.length) {
      want = false;
      return false;
    }
    audio.src = urls[i];
    if (want) tryPlay();
    return true;
  };

  const onReady = () => {
    if (closed || ready) return;
    ready = true;
    opts.onCanPlay(true);
  };
  const onError = () => {
    if (closed || idx < 0 || idx >= urls.length) return;
    failed.add(idx);
    if (failed.size === urls.length) {
      want = false;
      idx = urls.length;
      ready = false;
      opts.onCanPlay(false);
      return;
    }
    load(idx + 1);
  };
  const onEnded = () => {
    if (closed) return;
    load(idx + 1);
  };

  audio.addEventListener('canplay', onReady);
  audio.addEventListener('canplaythrough', onReady);
  audio.addEventListener('error', onError);
  audio.addEventListener('ended', onEnded);
  if (urls.length) load(0);
  else opts.onCanPlay(false);

  return {
    replay() {
      if (closed) return;
      want = !audio.muted;
      if (!want) return;
      load(0);
    },
    setMuted(muted) {
      if (closed) return;
      audio.muted = muted;
      if (muted) {
        want = false;
        audio.pause();
      }
    },
    stop() {
      if (closed) return;
      want = false;
      audio.pause();
    },
    close() {
      if (closed) return;
      closed = true;
      want = false;
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
  };
}
