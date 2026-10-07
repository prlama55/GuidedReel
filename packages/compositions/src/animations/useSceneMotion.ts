import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { ExitAnimation, SceneEnterAnimation } from '@guidedreel/schema';
import { animateElement } from './presets';
import { exitFrames } from './index';

/**
 * Whole-scene enter/exit style for a scene's content wrapper. `default`
 * keeps the scene's own choreography (no extra entrance); the exit always
 * runs over the last few frames so scenes hand over cleanly.
 */
export function useSceneMotion(
  props: { animation?: SceneEnterAnimation | string; exitAnimation?: ExitAnimation | string },
  durationInFrames: number,
): React.CSSProperties {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (props.animation ?? 'default') as SceneEnterAnimation;
  const exit = (props.exitAnimation ?? 'fade') as ExitAnimation;
  return animateElement(
    {
      animation: enter,
      exitAnimation: exit,
      enterDurationFrames: 18,
      exitDurationFrames: exitFrames(durationInFrames),
    },
    frame,
    fps,
    durationInFrames,
    80,
  );
}
