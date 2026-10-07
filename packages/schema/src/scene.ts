import { z } from 'zod';
import { TransitionConfigSchema } from './transition';
import { OverlaySchema } from './overlay';
import { getSceneDefinition, isSceneType, SCENE_TYPES, type SceneType } from './scenes/index';

export const SceneTypeSchema = z.enum(SCENE_TYPES as [SceneType, ...SceneType[]]);

export const DurationModeSchema = z.enum(['fixed', 'fromAudio']);
export type DurationMode = z.infer<typeof DurationModeSchema>;

/**
 * Base scene shape. `props` is validated against the scene type's propsSchema
 * by `validateScene` / the project superRefine, so the base stays generic.
 */
export const VideoSceneSchema = z.object({
  id: z.string().min(1),
  type: SceneTypeSchema,
  /** Optional editor label; falls back to the scene type label. */
  title: z.string().max(120).optional(),
  durationInFrames: z.number().int().positive(),
  durationMode: DurationModeSchema.default('fixed'),
  /** Extra frames added after the voiceover ends when durationMode = fromAudio. */
  audioPaddingFrames: z.number().int().nonnegative().default(15),
  props: z.record(z.string(), z.unknown()),
  voiceoverAssetId: z.string().optional(),
  transitionIn: TransitionConfigSchema.optional(),
  /** Hidden scenes are kept in the document but skipped by the timeline. */
  hidden: z.boolean().default(false),
  /** Free-positioned text/media drawn over the scene, in z-order. */
  overlays: z.array(OverlaySchema).max(50).default([]),
});
export type VideoScene = z.infer<typeof VideoSceneSchema>;
export type VideoSceneInput = z.input<typeof VideoSceneSchema>;

/**
 * Validates scene props against the type's propsSchema and returns the scene
 * with parsed (defaulted) props. Throws ZodError on failure.
 */
export function parseSceneProps(scene: VideoScene): VideoScene {
  if (!isSceneType(scene.type)) {
    throw new Error(`Unknown scene type "${scene.type}"`);
  }
  const def = getSceneDefinition(scene.type);
  const props = def.propsSchema.parse(scene.props) as Record<string, unknown>;
  return { ...scene, props };
}

/** Collects every asset id referenced by a scene (props + voiceover). */
export function sceneAssetIds(scene: VideoScene): string[] {
  const ids: string[] = [];
  if (isSceneType(scene.type)) {
    const def = getSceneDefinition(scene.type);
    for (const key of def.assetKeys) {
      const v = scene.props[key];
      if (typeof v === 'string' && v.length > 0) ids.push(v);
    }
  }
  if (scene.voiceoverAssetId) ids.push(scene.voiceoverAssetId);
  for (const o of scene.overlays ?? []) if (o.kind === 'media') ids.push(o.assetId);
  return ids;
}
