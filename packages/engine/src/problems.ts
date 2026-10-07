import type { VideoProject } from '@guidedreel/schema';
import { getSceneDefinition, isSceneType, sceneAssetIds } from '@guidedreel/schema';
import { missingAssetIds } from './assets';
import { resolveSceneDuration } from './durations';
import { calculateTimeline } from './timeline';

export type ProblemSeverity = 'error' | 'warning';

export type Problem = {
  id: string;
  severity: ProblemSeverity;
  code:
    | 'missing-asset'
    | 'empty-media'
    | 'short-duration'
    | 'long-text'
    | 'no-scenes'
    | 'missing-font'
    | 'audio-mismatch';
  message: string;
  sceneId?: string;
  assetId?: string;
};

/**
 * Non-fatal analysis for the editor's Problems panel. Schema validation
 * catches structural errors; this catches things that will look wrong.
 */
export function analyzeProject(project: VideoProject): Problem[] {
  const problems: Problem[] = [];
  const fps = project.format.fps;

  if (project.scenes.filter((s) => !s.hidden).length === 0) {
    problems.push({
      id: 'no-scenes',
      severity: 'error',
      code: 'no-scenes',
      message: 'Add at least one scene to render a video.',
    });
  }

  for (const id of missingAssetIds(project)) {
    problems.push({
      id: `missing:${id}`,
      severity: 'error',
      code: 'missing-asset',
      assetId: id,
      message: `Asset "${id}" is referenced but not in the project.`,
    });
  }

  const assetById = new Map(project.assets.map((a) => [a.id, a]));
  const timeline = calculateTimeline(project);

  for (const scene of project.scenes) {
    if (scene.hidden || !isSceneType(scene.type)) continue;
    const def = getSceneDefinition(scene.type);
    const label = scene.title ?? def.label;

    // Media scenes without media
    if (
      (scene.type === 'image' && !scene.props.imageAssetId) ||
      (scene.type === 'video' && !scene.props.videoAssetId)
    ) {
      problems.push({
        id: `empty:${scene.id}`,
        severity: 'warning',
        code: 'empty-media',
        sceneId: scene.id,
        message: `${label}: no media selected.`,
      });
    }

    // Reading-speed heuristic: ~3 words/second comfortable.
    if (def.scriptKey) {
      const text = scene.props[def.scriptKey];
      if (typeof text === 'string') {
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        const seconds = resolveSceneDuration(scene, project.assets, fps) / fps;
        if (words > 0 && words / seconds > 3.5) {
          problems.push({
            id: `long:${scene.id}`,
            severity: 'warning',
            code: 'long-text',
            sceneId: scene.id,
            message: `${label}: ${words} words in ${seconds.toFixed(1)}s may be too fast to read.`,
          });
        }
      }
    }

    // Voiceover longer than the scene when duration is fixed
    if (scene.voiceoverAssetId && scene.durationMode === 'fixed') {
      const vo = assetById.get(scene.voiceoverAssetId);
      const item = timeline.scenes[scene.id];
      if (vo?.duration && item && vo.duration * fps > item.durationInFrames) {
        problems.push({
          id: `audio:${scene.id}`,
          severity: 'warning',
          code: 'audio-mismatch',
          sceneId: scene.id,
          message: `${label}: voiceover (${vo.duration.toFixed(1)}s) is longer than the scene.`,
        });
      }
    }

    // Referenced assets that exist but have no usable source
    for (const id of sceneAssetIds(scene)) {
      const a = assetById.get(id);
      if (a && a.source.kind === 'local' && a.source.path.length === 0) {
        problems.push({
          id: `badsrc:${id}`,
          severity: 'error',
          code: 'missing-asset',
          sceneId: scene.id,
          assetId: id,
          message: `${label}: asset "${a.name}" has an empty path.`,
        });
      }
    }
  }

  for (const font of project.brand?.fonts ?? []) {
    if (font.assetId && !assetById.has(font.assetId)) {
      problems.push({
        id: `font:${font.family}`,
        severity: 'warning',
        code: 'missing-font',
        message: `Font "${font.family}" references a missing file; a fallback will be used.`,
      });
    }
  }

  return problems;
}
