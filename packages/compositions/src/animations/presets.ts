import { Easing, interpolate, spring } from 'remotion';
import type { EnterAnimation, ExitAnimation, LoopAnimation, ImageMotion } from '@guidedreel/schema';

export type AnimStyle = {
  opacity?: number;
  transform?: string;
  filter?: string;
  clipPath?: string;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.cubic);

/** Entrance preset at `frame` (0 = start of the element) over `duration` frames. */
export function enterPreset(
  preset: EnterAnimation | 'default' | 'word-by-word',
  frame: number,
  fps: number,
  duration: number,
  distance = 60,
): AnimStyle {
  if (
    preset === 'none' ||
    preset === 'default' ||
    preset === 'typewriter' ||
    preset === 'word-by-word'
  )
    return {};
  const p = easeOut(clamp01(frame / Math.max(1, duration)));
  switch (preset) {
    case 'fade':
      return { opacity: p };
    case 'slide-up':
      return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
    case 'slide-down':
      return { opacity: p, transform: `translateY(${-(1 - p) * distance}px)` };
    case 'slide-left':
      return { opacity: p, transform: `translateX(${(1 - p) * distance}px)` };
    case 'slide-right':
      return { opacity: p, transform: `translateX(${-(1 - p) * distance}px)` };
    case 'zoom-in':
      return { opacity: p, transform: `scale(${0.6 + 0.4 * p})` };
    case 'zoom-out':
      return { opacity: p, transform: `scale(${1.4 - 0.4 * p})` };
    case 'pop': {
      const s = spring({ frame, fps, config: { damping: 10, stiffness: 160, mass: 0.6 } });
      return { opacity: clamp01(s * 1.5), transform: `scale(${s})` };
    }
    case 'bounce': {
      const s = spring({ frame, fps, config: { damping: 6, stiffness: 120, mass: 0.8 } });
      return { opacity: clamp01(frame / 4), transform: `translateY(${-(1 - s) * distance * 2}px)` };
    }
    case 'drop': {
      const s = spring({ frame, fps, config: { damping: 12, stiffness: 140, mass: 1 } });
      return {
        opacity: clamp01(s * 2),
        transform: `translateY(${-(1 - s) * distance * 3}px) scale(${1 + (1 - s) * 0.15})`,
      };
    }
    case 'flip':
      return { opacity: p, transform: `perspective(1200px) rotateX(${(1 - p) * 90}deg)` };
    case 'rotate':
      return { opacity: p, transform: `rotate(${(1 - p) * -20}deg) scale(${0.8 + 0.2 * p})` };
    case 'blur':
      return { opacity: p, filter: `blur(${(1 - p) * 16}px)` };
    case 'wipe':
      return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    default:
      return {};
  }
}

/**
 * Exit preset. `frame` is relative to the element start and `total` is its
 * length; the animation runs over the last `duration` frames.
 */
export function exitPreset(
  preset: ExitAnimation,
  frame: number,
  total: number,
  duration: number,
  distance = 60,
): AnimStyle {
  if (preset === 'none') return {};
  const start = Math.max(0, total - duration);
  const q = easeIn(clamp01((frame - start) / Math.max(1, Math.min(duration, total))));
  if (q <= 0) return {};
  switch (preset) {
    case 'fade':
      return { opacity: 1 - q };
    case 'slide-up':
      return { opacity: 1 - q, transform: `translateY(${-q * distance}px)` };
    case 'slide-down':
      return { opacity: 1 - q, transform: `translateY(${q * distance}px)` };
    case 'slide-left':
      return { opacity: 1 - q, transform: `translateX(${-q * distance}px)` };
    case 'slide-right':
      return { opacity: 1 - q, transform: `translateX(${q * distance}px)` };
    case 'zoom-in':
      return { opacity: 1 - q, transform: `scale(${1 + 0.4 * q})` };
    case 'zoom-out':
      return { opacity: 1 - q, transform: `scale(${1 - 0.4 * q})` };
    case 'pop':
      return { opacity: 1 - q, transform: `scale(${1 + 0.15 * Math.sin(q * Math.PI) - q})` };
    case 'blur':
      return { opacity: 1 - q, filter: `blur(${q * 16}px)` };
    case 'wipe':
      return { clipPath: `inset(0 0 0 ${q * 100}%)` };
    case 'spin':
      return { opacity: 1 - q, transform: `rotate(${q * 180}deg) scale(${1 - q})` };
    default:
      return {};
  }
}

/** Continuous emphasis loop; `frame` counts from when the element settled. */
export function loopPreset(preset: LoopAnimation, frame: number, fps: number): AnimStyle {
  if (preset === 'none' || frame < 0) return {};
  const t = frame / fps; // seconds
  const w = (period: number) => Math.sin((2 * Math.PI * t) / period);
  switch (preset) {
    case 'pulse':
      return { transform: `scale(${1 + 0.04 * w(1.2)})` };
    case 'float':
      return { transform: `translateY(${8 * w(2.4)}px)` };
    case 'wiggle':
      return { transform: `rotate(${3 * w(0.5)}deg)` };
    case 'spin':
      return { transform: `rotate(${(360 * t) / 4}deg)` };
    case 'blink':
      return { opacity: 0.6 + 0.4 * (w(1) > 0 ? 1 : 0.4) };
    case 'swing':
      return { transform: `rotate(${8 * w(1.6)}deg)` };
    case 'heartbeat': {
      const beat = Math.max(0, w(0.9)) ** 3;
      return { transform: `scale(${1 + 0.1 * beat})` };
    }
    case 'shake':
      return { transform: `translateX(${4 * Math.sin(2 * Math.PI * t * 8)}px)` };
    default:
      return {};
  }
}

/** Merges enter, exit and loop styles: opacities multiply, transforms/filters compose. */
export function mergeAnim(...parts: AnimStyle[]): React.CSSProperties {
  const out: React.CSSProperties = {};
  let opacity = 1;
  let hasOpacity = false;
  const transforms: string[] = [];
  const filters: string[] = [];
  for (const p of parts) {
    if (p.opacity !== undefined) {
      opacity *= p.opacity;
      hasOpacity = true;
    }
    if (p.transform) transforms.push(p.transform);
    if (p.filter) filters.push(p.filter);
    if (p.clipPath) out.clipPath = p.clipPath;
  }
  if (hasOpacity) out.opacity = opacity;
  if (transforms.length) out.transform = transforms.join(' ');
  if (filters.length) out.filter = filters.join(' ');
  return out;
}

export type ElementAnimation = {
  animation: EnterAnimation | 'default' | 'word-by-word';
  exitAnimation: ExitAnimation;
  loopAnimation?: LoopAnimation;
  enterDurationFrames?: number;
  exitDurationFrames?: number;
};

/** Full style for an element of `total` frames at `frame`. */
export function animateElement(
  a: ElementAnimation,
  frame: number,
  fps: number,
  total: number,
  distance = 60,
): React.CSSProperties {
  const enterDur = a.enterDurationFrames ?? 15;
  const exitDur = Math.min(a.exitDurationFrames ?? 15, Math.max(1, Math.floor(total / 3)));
  return mergeAnim(
    enterPreset(a.animation, frame, fps, enterDur, distance),
    exitPreset(a.exitAnimation, frame, total, exitDur, distance),
    loopPreset(a.loopAnimation ?? 'none', frame - enterDur, fps),
  );
}

/** Slow camera motion for a full-frame image over `total` frames. */
export function imageMotion(
  preset: ImageMotion,
  frame: number,
  total: number,
): React.CSSProperties {
  if (preset === 'none') return {};
  const t = interpolate(frame, [0, Math.max(1, total)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const origin = { transformOrigin: 'center' as const };
  switch (preset) {
    case 'ken-burns':
      return { ...origin, transform: `scale(${1.05 + 0.13 * t}) translate(${3 * t}%, ${-2 * t}%)` };
    case 'zoom-in':
      return { ...origin, transform: `scale(${1 + 0.18 * t})` };
    case 'zoom-out':
      return { ...origin, transform: `scale(${1.18 - 0.18 * t})` };
    case 'pan-left':
      return { ...origin, transform: `scale(1.15) translateX(${6 - 12 * t}%)` };
    case 'pan-right':
      return { ...origin, transform: `scale(1.15) translateX(${-6 + 12 * t}%)` };
    case 'pan-up':
      return { ...origin, transform: `scale(1.15) translateY(${6 - 12 * t}%)` };
    case 'pan-down':
      return { ...origin, transform: `scale(1.15) translateY(${-6 + 12 * t}%)` };
    case 'drift':
      return {
        ...origin,
        transform: `scale(${1.1 + 0.05 * Math.sin(t * Math.PI)}) translate(${4 * Math.sin(t * Math.PI * 2)}%, ${3 * Math.cos(t * Math.PI)}%) rotate(${1.5 * t}deg)`,
      };
    default:
      return {};
  }
}
