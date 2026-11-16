import { describe, expect, it } from 'vitest';
import { openClips, type AudioLike } from './clipPlayer';

/** A fake audio element: records calls; tests fire its events by hand. */
class FakeAudio implements AudioLike {
  src = '';
  muted = false;
  preload = '';
  paused = true;
  plays: string[] = [];
  loads = 0;
  rejectPlay = false;
  private fns = new Map<string, Set<() => void>>();
  play() {
    this.plays.push(this.src);
    this.paused = false;
    return this.rejectPlay ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve();
  }
  pause() { this.paused = true; }
  load() { this.loads++; }
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
  addEventListener(type: string, fn: () => void) {
    if (!this.fns.has(type)) this.fns.set(type, new Set());
    this.fns.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: () => void) { this.fns.get(type)?.delete(fn); }
  fire(type: string) { for (const fn of [...(this.fns.get(type) ?? [])]) fn(); }
  listeners() { let n = 0; for (const s of this.fns.values()) n += s.size; return n; }
}

function setup(urls: string[], muted = false) {
  const audio = new FakeAudio();
  const calls: boolean[] = [];
  const player = openClips(urls, { muted, makeAudio: () => audio, onCanPlay: (ok) => calls.push(ok) });
  return { audio, calls, player };
}

describe('openClips', () => {
  it('loads the first clip and plays it at once unless muted', () => {
    const { audio } = setup(['/audio/en/q2.mp3']);
    expect(audio.preload).toBe('auto');
    expect(audio.src).toBe('/audio/en/q2.mp3');
    expect(audio.plays).toEqual(['/audio/en/q2.mp3']);
    const m = setup(['/audio/en/q2.mp3'], true);
    expect(m.audio.muted).toBe(true);
    expect(m.audio.plays).toEqual([]);
  });
  it('reports canPlay only after canplay or canplaythrough, once', () => {
    const { audio, calls } = setup(['/a.mp3']);
    expect(calls).toEqual([]);
    audio.fire('canplaythrough');
    audio.fire('canplay');
    expect(calls).toEqual([true]);
  });
  it('reports false when the only clip fails (missing file or HTML fallback), and stays silent', () => {
    const { audio, calls } = setup(['/audio/en/q1.mp3']);
    audio.fire('error');
    expect(calls).toEqual([false]);
    expect(audio.plays).toEqual(['/audio/en/q1.mp3']);
    audio.fire('error');
    expect(calls).toEqual([false]);
  });
  it('swallows a rejected play() promise', async () => {
    const audio = new FakeAudio();
    audio.rejectPlay = true;
    openClips(['/a.mp3'], { muted: false, makeAudio: () => audio, onCanPlay: () => {} });
    await new Promise((r) => setTimeout(r, 0));
    expect(audio.plays).toEqual(['/a.mp3']);
  });
  it('plays a list in order: the next clip when one ends, skipping one that fails', () => {
    const { audio, calls } = setup(['/intro.mp3', '/q1.mp3']);
    audio.fire('canplay');
    audio.fire('ended');
    expect(audio.src).toBe('/q1.mp3');
    expect(audio.plays).toEqual(['/intro.mp3', '/q1.mp3']);
    audio.fire('ended');
    expect(audio.plays.length).toBe(2);
    const s = setup(['/intro.mp3', '/q1.mp3']);
    s.audio.fire('error');
    expect(s.audio.src).toBe('/q1.mp3');
    expect(s.audio.plays).toEqual(['/intro.mp3', '/q1.mp3']);
    s.audio.fire('canplay');
    expect(s.calls).toEqual([true]);
    expect(calls).toEqual([true]);
  });
  it('reports false only when every clip of a list failed', () => {
    const { audio, calls } = setup(['/intro.mp3', '/q1.mp3']);
    audio.fire('error');
    expect(calls).toEqual([]);
    audio.fire('error');
    expect(calls).toEqual([false]);
  });
  it('replay starts again from the first clip that has not failed', () => {
    const { audio, player } = setup(['/intro.mp3', '/q1.mp3']);
    audio.fire('error');
    audio.fire('canplay');
    audio.fire('ended');
    player.replay();
    expect(audio.src).toBe('/q1.mp3');
    expect(audio.plays).toEqual(['/intro.mp3', '/q1.mp3', '/q1.mp3']);
  });
  it('muting pauses and stops the list; unmuting does not restart it; replay while muted does nothing', () => {
    const { audio, player } = setup(['/intro.mp3', '/q1.mp3']);
    player.setMuted(true);
    expect(audio.muted).toBe(true);
    expect(audio.paused).toBe(true);
    audio.fire('ended');
    expect(audio.plays).toEqual(['/intro.mp3']);
    player.replay();
    expect(audio.plays).toEqual(['/intro.mp3']);
    player.setMuted(false);
    expect(audio.plays).toEqual(['/intro.mp3']);
    player.replay();
    expect(audio.plays).toEqual(['/intro.mp3', '/intro.mp3']);
  });
  it('stop pauses and does not go on to the next clip', () => {
    const { audio, player } = setup(['/intro.mp3', '/q1.mp3']);
    player.stop();
    expect(audio.paused).toBe(true);
    audio.fire('ended');
    expect(audio.plays).toEqual(['/intro.mp3']);
  });
  it('close stops, releases the element and removes every listener', () => {
    const { audio, calls, player } = setup(['/a.mp3']);
    player.close();
    expect(audio.paused).toBe(true);
    expect(audio.src).toBe('');
    expect(audio.loads).toBe(1);
    expect(audio.listeners()).toBe(0);
    player.replay();
    expect(audio.plays).toEqual(['/a.mp3']);
    expect(calls).toEqual([]);
  });
  it('reports false at once for an empty list', () => {
    const { audio, calls } = setup([]);
    expect(calls).toEqual([false]);
    expect(audio.plays).toEqual([]);
  });
});

describe('recorded clips only', () => {
  it('no source file uses text-to-speech', () => {
    const files = import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });
    const banned = ['speech' + 'Synthesis', 'Speech' + 'SynthesisUtterance'];
    expect(Object.keys(files).length).toBeGreaterThan(10);
    for (const [path, text] of Object.entries(files)) {
      for (const word of banned) expect(text.includes(word), `${path} uses ${word}`).toBe(false);
    }
  });
});
