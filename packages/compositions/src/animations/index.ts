import { interpolate, spring, Easing } from 'remotion';
import type { CSSProperties } from 'react';

const clampOpts = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export type Range = { start?: number; duration?: number };

export function fadeIn(frame: number, { start = 0, duration = 15 }: Range = {}): number {
  return interpolate(frame, [start, start + duration], [0, 1], clampOpts);
}

/** Opacity going to 0 so that it reaches 0 exactly at `end`. */
export function fadeOut(frame: number, end: number, duration = 15): number {
  return interpolate(frame, [end - duration, end], [1, 0], clampOpts);
}

/** Combined in/out opacity for a scene of `total` frames. */
export function fadeInOut(frame: number, total: number, inFrames = 12, outFrames = 12): number {
  return Math.min(fadeIn(frame, { duration: inFrames }), fadeOut(frame, total, outFrames));
}

export type SlideDirection = 'left' | 'right' | 'up' | 'down';

export function slideIn(
  frame: number,
  {
    start = 0,
    duration = 20,
    from = 'up',
    distance = 60,
    easing = Easing.out(Easing.cubic),
  }: Range & { from?: SlideDirection; distance?: number; easing?: (t: number) => number } = {},
): CSSProperties {
  const p = interpolate(frame, [start, start + duration], [1, 0], { ...clampOpts, easing });
  const d = p * distance;
  const translate =
    from === 'up'
      ? `translateY(${d}px)`
      : from === 'down'
        ? `translateY(${-d}px)`
        : from === 'left'
          ? `translateX(${-d}px)`
          : `translateX(${d}px)`;
  return { transform: translate, opacity: 1 - p };
}

export function scaleIn(
  frame: number,
  fps: number,
  {
    start = 0,
    from = 0.85,
    damping = 14,
    stiffness = 120,
  }: { start?: number; from?: number; damping?: number; stiffness?: number } = {},
): number {
  const s = spring({ frame: frame - start, fps, config: { damping, stiffness, mass: 0.8 } });
  return from + (1 - from) * s;
}

/** Spring 0→1 with a slight overshoot, good for pops. */
export function pop(frame: number, fps: number, start = 0): number {
  return spring({ frame: frame - start, fps, config: { damping: 10, stiffness: 160, mass: 0.6 } });
}

/** Slow zoom over a whole scene: 1 → 1 + amount. */
export function zoom(frame: number, total: number, amount = 0.08): number {
  return interpolate(frame, [0, total], [1, 1 + amount], clampOpts);
}

export type KenBurnsOptions = { zoomFrom?: number; zoomTo?: number; panX?: number; panY?: number };

/** Ken Burns transform for an image filling the frame. pan values are fractions of the frame. */
export function kenBurns(
  frame: number,
  total: number,
  { zoomFrom = 1.05, zoomTo = 1.18, panX = 0.03, panY = -0.02 }: KenBurnsOptions = {},
): CSSProperties {
  const t = interpolate(frame, [0, Math.max(1, total)], [0, 1], clampOpts);
  const scale = zoomFrom + (zoomTo - zoomFrom) * t;
  return {
    transform: `scale(${scale}) translate(${panX * t * 100}%, ${panY * t * 100}%)`,
    transformOrigin: 'center',
  };
}

export function blurIn(
  frame: number,
  { start = 0, duration = 15, from = 12 }: Range & { from?: number } = {},
): CSSProperties {
  const blur = interpolate(frame, [start, start + duration], [from, 0], clampOpts);
  return { filter: `blur(${blur}px)`, opacity: fadeIn(frame, { start, duration }) };
}

/** Characters visible at `frame`. */
export function typewriter(
  text: string,
  frame: number,
  { start = 0, charsPerFrame = 0.8 }: { start?: number; charsPerFrame?: number } = {},
): string {
  const count = Math.max(0, Math.floor((frame - start) * charsPerFrame));
  return text.slice(0, Math.min(text.length, count));
}

/** Per-word reveal: returns style for the word at `index`. */
export function wordReveal(
  frame: number,
  index: number,
  fps: number,
  { start = 0, stagger = 3 }: { start?: number; stagger?: number } = {},
): CSSProperties {
  const s = spring({
    frame: frame - start - index * stagger,
    fps,
    config: { damping: 14, stiffness: 140, mass: 0.7 },
  });
  return { opacity: s, transform: `translateY(${(1 - s) * 24}px)`, display: 'inline-block' };
}

/** Stagger helper for lists: style for item `index`. */
export function staggerIn(
  frame: number,
  index: number,
  fps: number,
  {
    start = 0,
    stagger = 6,
    distance = 40,
  }: { start?: number; stagger?: number; distance?: number } = {},
): CSSProperties {
  const s = spring({
    frame: frame - start - index * stagger,
    fps,
    config: { damping: 16, stiffness: 120, mass: 0.8 },
  });
  return { opacity: s, transform: `translateY(${(1 - s) * distance}px)` };
}

/** Frames of a total to use for an exit animation (never more than a third). */
export function exitFrames(total: number, wanted = 12): number {
  return Math.max(1, Math.min(wanted, Math.floor(total / 3)));
}

/** Splits text into words while keeping punctuation attached; works for any script. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function isHighlighted(word: string, highlights: readonly string[]): boolean {
  const norm = word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  return highlights.some(
    (h) => h.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase() === norm && norm.length > 0,
  );
}
