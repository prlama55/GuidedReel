import type { Asset, VideoProject, VideoScene } from '@guidedreel/schema';
import { getSceneDefinition, isSceneType } from '@guidedreel/schema';
import { secondsToFrames } from './time';

/**
 * The effective duration of a scene in frames.
 * - fixed: the stored durationInFrames
 * - fromAudio: voiceover duration + padding, falling back to stored duration
 *   when the asset has no known duration.
 */
export function resolveSceneDuration(
  scene: VideoScene,
  assets: readonly Asset[],
  fps: number,
): number {
  const minFrames = minSceneFrames(scene, fps);
  if (scene.durationMode === 'fromAudio' && scene.voiceoverAssetId) {
    const asset = assets.find((a) => a.id === scene.voiceoverAssetId);
    if (asset?.duration && asset.duration > 0) {
      return Math.max(minFrames, secondsToFrames(asset.duration, fps) + scene.audioPaddingFrames);
    }
  }
  return Math.max(minFrames, scene.durationInFrames);
}

export function minSceneFrames(scene: Pick<VideoScene, 'type'>, fps: number): number {
  if (!isSceneType(scene.type)) return 1;
  return Math.max(1, Math.ceil(getSceneDefinition(scene.type).minDurationSeconds * fps));
}

export function defaultSceneFrames(type: VideoScene['type'], fps: number): number {
  if (!isSceneType(type)) return secondsToFrames(4, fps);
  return secondsToFrames(getSceneDefinition(type).defaultDurationSeconds, fps);
}

export function visibleScenes(project: Pick<VideoProject, 'scenes'>): VideoScene[] {
  return project.scenes.filter((s) => !s.hidden);
}
