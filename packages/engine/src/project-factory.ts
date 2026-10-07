import type {
  AspectRatio,
  BrandConfig,
  TransitionConfig,
  VideoFormat,
  VideoProject,
  VideoProjectDraftInput,
  VideoScene,
  VideoSceneInput,
  SceneType,
} from '@guidedreel/schema';
import {
  CURRENT_SCHEMA_VERSION,
  FORMAT_PRESETS,
  VideoProjectDraftSchema,
  VideoProjectSchema,
  VideoSceneSchema,
  getSceneDefinition,
  isSceneType,
} from '@guidedreel/schema';
import { createId } from './ids';
import { defaultSceneFrames, minSceneFrames } from './durations';
import { secondsToFrames } from './time';
import { VideoCreatorError } from './errors';

export type CreateSceneOptions = {
  id?: string;
  title?: string;
  props?: Record<string, unknown>;
  durationInFrames?: number;
  durationSeconds?: number;
  transitionIn?: TransitionConfig;
  voiceoverAssetId?: string;
  durationMode?: VideoScene['durationMode'];
};

/** Creates a fully-defaulted scene of the given type. */
export function createScene(
  type: SceneType,
  fps: number,
  options: CreateSceneOptions = {},
): VideoScene {
  const def = getSceneDefinition(type);
  const props = def.propsSchema.parse({
    ...def.defaultProps(),
    ...(options.props ?? {}),
  }) as Record<string, unknown>;
  const duration =
    options.durationInFrames ??
    (options.durationSeconds !== undefined
      ? secondsToFrames(options.durationSeconds, fps)
      : defaultSceneFrames(type, fps));

  const input: VideoSceneInput = {
    id: options.id ?? createId('sc'),
    type,
    title: options.title,
    durationInFrames: Math.max(minSceneFrames({ type }, fps), duration),
    durationMode: options.durationMode ?? (options.voiceoverAssetId ? 'fromAudio' : 'fixed'),
    props,
    voiceoverAssetId: options.voiceoverAssetId,
    transitionIn: options.transitionIn,
  };
  return VideoSceneSchema.parse(input);
}

export type CreateProjectOptions = {
  id?: string;
  name: string;
  templateId: string;
  format?: VideoFormat;
  aspectRatio?: AspectRatio;
  brand?: BrandConfig;
  scenes?: VideoScene[];
  assets?: VideoProject['assets'];
  source?: VideoProject['metadata']['source'];
  description?: string;
};

/** Creates an empty-or-seeded, valid project. */
export function createProject(options: CreateProjectOptions): VideoProject {
  const format = options.format ?? FORMAT_PRESETS[options.aspectRatio ?? '9:16'].format;
  const now = new Date().toISOString();
  const project = VideoProjectSchema.parse({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: options.id ?? createId('prj'),
    name: options.name,
    revision: 0,
    format,
    templateId: options.templateId,
    brand: options.brand,
    scenes: options.scenes ?? [],
    assets: options.assets ?? [],
    metadata: {
      createdAt: now,
      updatedAt: now,
      source: options.source ?? 'manual',
      description: options.description,
    },
  });
  return project;
}

/** Marks a project as modified: bumps revision and updatedAt. */
export function touchProject(project: VideoProject): VideoProject {
  return {
    ...project,
    revision: project.revision + 1,
    metadata: { ...project.metadata, updatedAt: new Date().toISOString() },
  };
}

export type FinalizeDraftOptions = {
  defaultFormat?: VideoFormat;
  defaultTemplateId?: string;
  defaultName?: string;
};

/**
 * Turns a VideoProjectDraft (from an importer or AI generator) into a valid
 * project. Unknown scene types and invalid props fail with VALIDATION_FAILED.
 */
export function finalizeDraft(
  input: VideoProjectDraftInput,
  options: FinalizeDraftOptions = {},
): VideoProject {
  const draftResult = VideoProjectDraftSchema.safeParse(input);
  if (!draftResult.success) {
    throw new VideoCreatorError('VALIDATION_FAILED', 'Draft is invalid', {
      details: { issues: draftResult.error.issues },
    });
  }
  const draft = draftResult.data;
  const format = draft.format ?? options.defaultFormat ?? FORMAT_PRESETS['9:16'].format;
  const fps = format.fps;

  const scenes: VideoScene[] = draft.scenes.map((s, i) => {
    if (!isSceneType(s.type)) {
      throw new VideoCreatorError(
        'VALIDATION_FAILED',
        `Scene ${i + 1} has unknown type "${s.type}"`,
        {
          details: { index: i, type: s.type },
        },
      );
    }
    try {
      return createScene(s.type, fps, {
        title: s.title,
        props: s.props,
        durationSeconds: s.durationSeconds,
        voiceoverAssetId: s.voiceoverAssetId,
        transitionIn: s.transitionIn,
      });
    } catch (err) {
      throw new VideoCreatorError(
        'VALIDATION_FAILED',
        `Scene ${i + 1} (${s.type}) has invalid properties`,
        {
          details: { index: i, type: s.type },
          cause: err,
        },
      );
    }
  });

  const base = createProject({
    name: draft.name ?? options.defaultName ?? 'Untitled project',
    templateId: draft.templateId ?? options.defaultTemplateId ?? 'blank',
    format,
    brand: draft.brand,
    scenes,
    assets: draft.assets,
    source: draft.metadata?.source ?? 'import',
    description: draft.metadata?.description,
  });

  const merged = {
    ...base,
    audio: { ...base.audio, ...(draft.audio ?? {}) },
    settings: { ...base.settings, ...(draft.settings ?? {}) },
    metadata: {
      ...base.metadata,
      ...(draft.metadata ?? {}),
      createdAt: base.metadata.createdAt,
      updatedAt: base.metadata.updatedAt,
    },
  };

  const result = VideoProjectSchema.safeParse(merged);
  if (!result.success) {
    throw new VideoCreatorError('VALIDATION_FAILED', 'Imported project is invalid', {
      details: { issues: result.error.issues },
    });
  }
  return result.data;
}
