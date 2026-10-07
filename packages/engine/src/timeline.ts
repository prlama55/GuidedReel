import type { TransitionConfig, VideoProject, VideoScene } from '@guidedreel/schema';
import { effectiveTransitionFrames } from '@guidedreel/schema';
import { resolveSceneDuration, visibleScenes } from './durations';

export type TimelineTrackKind = 'scene' | 'voiceover' | 'music' | 'overlay' | 'sfx';

export type TimelineItem = {
  id: string;
  /** Scene id or asset id depending on the track. */
  refId: string;
  startFrame: number;
  durationInFrames: number;
  endFrame: number;
  /** Scene track only: the transition into this item (absent on the first item / hard cuts). */
  transitionIn?: TransitionConfig;
  /** Scene track only: exact frames of overlap with the previous item (may be clamped below transitionIn.durationInFrames). */
  transitionFrames: number;
  /** Voice/music tracks only. */
  volume?: number;
};

export type TimelineTrack = {
  id: string;
  kind: TimelineTrackKind;
  items: TimelineItem[];
};

export type Timeline = {
  fps: number;
  totalFrames: number;
  tracks: TimelineTrack[];
  /** Convenience lookup: sceneId → scene item. */
  scenes: Record<string, TimelineItem>;
  /** Ordered scene items (visible scenes only). */
  sceneOrder: TimelineItem[];
};

/**
 * Derives absolute positions from scene order, durations and transition overlaps.
 * A transition of N frames into scene B makes B start N frames before A ends,
 * so total = Σ durations − Σ transitions.
 */
export function calculateTimeline(project: VideoProject): Timeline {
  const fps = project.format.fps;
  const scenes = visibleScenes(project);

  const sceneItems: TimelineItem[] = [];
  let cursor = 0;
  scenes.forEach((scene, index) => {
    const duration = resolveSceneDuration(scene, project.assets, fps);
    const overlap =
      index === 0
        ? 0
        : Math.min(effectiveTransitionFrames(scene.transitionIn), Math.max(0, duration - 1));
    const startFrame = Math.max(0, cursor - overlap);
    const item: TimelineItem = {
      id: `scene:${scene.id}`,
      refId: scene.id,
      startFrame,
      durationInFrames: duration,
      endFrame: startFrame + duration,
      transitionFrames: overlap,
      ...(index > 0 && overlap > 0 && scene.transitionIn
        ? { transitionIn: scene.transitionIn }
        : {}),
    };
    sceneItems.push(item);
    cursor = item.endFrame;
  });

  const totalFrames = Math.max(1, cursor);

  const voiceItems: TimelineItem[] = scenes
    .map((scene, i) => ({ scene, item: sceneItems[i]! }))
    .filter(({ scene }) => Boolean(scene.voiceoverAssetId))
    .map(({ scene, item }) => ({
      id: `voice:${scene.id}`,
      refId: scene.voiceoverAssetId!,
      startFrame: item.startFrame,
      durationInFrames: item.durationInFrames,
      endFrame: item.endFrame,
      transitionFrames: 0,
      volume: project.audio.voiceoverVolume,
    }));

  const musicItems: TimelineItem[] = project.audio.musicAssetId
    ? [
        {
          id: 'music:main',
          refId: project.audio.musicAssetId,
          startFrame: 0,
          durationInFrames: totalFrames,
          endFrame: totalFrames,
          transitionFrames: 0,
          volume: project.audio.musicVolume,
        },
      ]
    : [];

  const scenesById: Record<string, TimelineItem> = {};
  for (const item of sceneItems) scenesById[item.refId] = item;

  return {
    fps,
    totalFrames,
    tracks: [
      { id: 'scenes', kind: 'scene', items: sceneItems },
      { id: 'voiceover', kind: 'voiceover', items: voiceItems },
      { id: 'music', kind: 'music', items: musicItems },
    ],
    scenes: scenesById,
    sceneOrder: sceneItems,
  };
}

/** The scene whose range contains `frame` (later scene wins inside a transition overlap). */
export function sceneAtFrame(timeline: Timeline, frame: number): TimelineItem | undefined {
  let found: TimelineItem | undefined;
  for (const item of timeline.sceneOrder) {
    if (frame >= item.startFrame && frame < item.endFrame) found = item;
  }
  return found ?? timeline.sceneOrder[timeline.sceneOrder.length - 1];
}

export function projectDurationFrames(project: VideoProject): number {
  return calculateTimeline(project).totalFrames;
}

/** Index of a scene in the visible order, or -1. */
export function sceneIndex(project: VideoProject, sceneId: string): number {
  return project.scenes.findIndex((s: VideoScene) => s.id === sceneId);
}
