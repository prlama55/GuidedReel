import type { TransitionPresentation, TransitionTiming } from '@remotion/transitions';
import { linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { flip } from '@remotion/transitions/flip';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { iris } from '@remotion/transitions/iris';
import type { TransitionConfig } from '@guidedreel/schema';
import { zoomPresentation } from './zoom';

export type ResolvedTransition = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presentation: TransitionPresentation<any>;
  timing: TransitionTiming;
  durationInFrames: number;
};

/**
 * Maps our TransitionConfig onto @remotion/transitions. `durationInFrames`
 * is the exact overlap the timeline used, so the Remotion series and our
 * timeline math always agree.
 */
export function resolveTransition(
  config: TransitionConfig,
  durationInFrames: number,
  size: { width: number; height: number } = { width: 1080, height: 1920 },
): ResolvedTransition | null {
  if (config.type === 'none' || durationInFrames <= 0) return null;
  const linear = linearTiming({ durationInFrames });
  switch (config.type) {
    case 'fade':
      return { presentation: fade(), timing: linear, durationInFrames };
    case 'slide-left':
      return { presentation: slide({ direction: 'from-right' }), timing: linear, durationInFrames };
    case 'slide-right':
      return { presentation: slide({ direction: 'from-left' }), timing: linear, durationInFrames };
    case 'slide-up':
      return {
        presentation: slide({ direction: 'from-bottom' }),
        timing: linear,
        durationInFrames,
      };
    case 'slide-down':
      return { presentation: slide({ direction: 'from-top' }), timing: linear, durationInFrames };
    case 'wipe':
      return { presentation: wipe({ direction: 'from-left' }), timing: linear, durationInFrames };
    case 'wipe-right':
      return { presentation: wipe({ direction: 'from-right' }), timing: linear, durationInFrames };
    case 'wipe-up':
      return { presentation: wipe({ direction: 'from-bottom' }), timing: linear, durationInFrames };
    case 'wipe-down':
      return { presentation: wipe({ direction: 'from-top' }), timing: linear, durationInFrames };
    case 'flip':
      return { presentation: flip({ direction: 'from-left' }), timing: linear, durationInFrames };
    case 'clock-wipe':
      return {
        presentation: clockWipe({ width: size.width, height: size.height }),
        timing: linear,
        durationInFrames,
      };
    case 'iris':
      return {
        presentation: iris({ width: size.width, height: size.height }),
        timing: linear,
        durationInFrames,
      };
    case 'zoom':
      return {
        presentation: zoomPresentation({ amount: 0.2 }),
        timing: springTiming({
          durationInFrames,
          config: { damping: 200 },
          durationRestThreshold: 0.001,
        }),
        durationInFrames,
      };
    default:
      return { presentation: fade(), timing: linear, durationInFrames };
  }
}

export { zoomPresentation } from './zoom';
