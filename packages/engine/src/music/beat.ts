import type { VideoProject } from '@guidedreel/schema';
import { minSceneFrames } from '../durations';

export type BeatAlignOptions = {
  /** Snap to whole beats (default) or whole bars. */
  unit?: 'beat' | 'bar';
  beatsPerBar?: number;
  /** nearest: round; up: never shorten a scene. */
  mode?: 'nearest' | 'up';
};

export function framesPerBeat(bpm: number, fps: number): number {
  return (60 / bpm) * fps;
}

/**
 * Snaps every visible scene's duration to a multiple of the beat (or bar) so
 * cuts land on the music. Transition overlaps are counted so that scene
 * *starts* fall on beats. Durations never go below the scene type's minimum.
 */
export function alignScenesToBeat(
  project: VideoProject,
  bpm: number,
  options: BeatAlignOptions = {},
): VideoProject {
  const fps = project.format.fps;
  const unit = framesPerBeat(bpm, fps) * (options.unit === 'bar' ? (options.beatsPerBar ?? 4) : 1);
  const mode = options.mode ?? 'nearest';
  if (!(unit > 0)) return project;

  const scenes = project.scenes.map((scene, index) => {
    if (scene.hidden || scene.durationMode === 'fromAudio') return scene;
    const overlap = index === 0 ? 0 : (scene.transitionIn?.durationInFrames ?? 0);
    // The visible advance of the timeline for this scene is duration − overlap of the *next* transition;
    // we approximate by aligning this scene's own advance (duration − its incoming overlap).
    const advance = scene.durationInFrames - overlap;
    const beats = mode === 'up' ? Math.ceil(advance / unit) : Math.round(advance / unit);
    const snapped = Math.max(1, beats) * unit + overlap;
    const duration = Math.max(minSceneFrames(scene, fps), Math.round(snapped));
    return duration === scene.durationInFrames ? scene : { ...scene, durationInFrames: duration };
  });
  return { ...project, scenes };
}
