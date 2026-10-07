import type { VideoProject } from '@guidedreel/schema';
import { calculateTimeline } from '@guidedreel/engine';

export const COMPOSITION_ID = 'VideoProject';

export type CompositionMetadata = {
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
};

/** Dimensions and length for a project; used by Player, Remotion Studio and the renderer. */
export function computeCompositionMetadata(project: VideoProject): CompositionMetadata {
  const { totalFrames } = calculateTimeline(project);
  return {
    durationInFrames: Math.max(1, totalFrames),
    fps: project.format.fps,
    width: project.format.width,
    height: project.format.height,
  };
}
