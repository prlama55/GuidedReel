import type { SceneType, TransitionConfig, VideoProject, VideoScene } from '@guidedreel/schema';
import {
  createProject,
  createScene,
  type CreateSceneOptions,
  type TemplateContext,
} from '@guidedreel/engine';

export type SceneSpec = { type: SceneType } & CreateSceneOptions;

/** Builds a project from an ordered list of scene specs, applying a default transition between scenes. */
export function buildProject(
  ctx: TemplateContext,
  templateId: string,
  specs: SceneSpec[],
  options: {
    defaultTransition?: TransitionConfig;
    backgroundColor?: string;
    musicVolume?: number;
  } = {},
): VideoProject {
  const fps = ctx.format.fps;
  const transition = options.defaultTransition ?? { type: 'fade', durationInFrames: 12 };
  const scenes: VideoScene[] = specs.map((spec, i) => {
    const { type, ...rest } = spec;
    return createScene(type, fps, {
      ...rest,
      transitionIn: i === 0 ? undefined : (rest.transitionIn ?? transition),
    });
  });
  const project = createProject({
    id: ctx.projectId,
    name: ctx.name,
    templateId,
    format: ctx.format,
    scenes,
    source: 'template',
  });
  return {
    ...project,
    settings: {
      ...project.settings,
      defaultTransition: transition,
      ...(options.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
    },
    audio: {
      ...project.audio,
      ...(options.musicVolume !== undefined ? { musicVolume: options.musicVolume } : {}),
    },
  };
}
