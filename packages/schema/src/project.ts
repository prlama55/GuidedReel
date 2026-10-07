import { z } from 'zod';
import { VideoFormatSchema } from './format';
import { AssetSchema } from './asset';
import { BrandConfigSchema } from './brand';
import { VideoSceneSchema } from './scene';
import { TransitionConfigSchema } from './transition';
import { getSceneDefinition, isSceneType } from './scenes/index';

/** Bump when the stored shape changes; add a step in migrations.ts. */
export const CURRENT_SCHEMA_VERSION = 2 as const;

export const ProjectSourceSchema = z.enum(['manual', 'template', 'import', 'ai']);
export type ProjectSource = z.infer<typeof ProjectSourceSchema>;

export const ProjectMetadataSchema = z.object({
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  source: ProjectSourceSchema.default('manual'),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
  /** Free-form; e.g. the AI generator name/version or import file name. */
  origin: z.record(z.string(), z.unknown()).optional(),
});
export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;

export const AudioSettingsSchema = z.object({
  musicAssetId: z.string().optional(),
  musicVolume: z.number().min(0).max(1).default(0.25),
  /** Lower music while a voiceover plays. */
  duckMusic: z.boolean().default(true),
  voiceoverVolume: z.number().min(0).max(1).default(1),
  fadeOutFrames: z.number().int().nonnegative().default(30),
});
export type AudioSettings = z.infer<typeof AudioSettingsSchema>;

export const VideoSettingsSchema = z.object({
  backgroundColor: z.string().default('#0B0F19'),
  defaultTransition: TransitionConfigSchema.default({ type: 'fade', durationInFrames: 12 }),
  /** Heading/body font family; a brand font overrides this. */
  fontFamily: z.string().default('Inter'),
  /** Show platform-safe margins in the editor only (no render effect). */
  safeZones: z.boolean().default(true),
});
export type VideoSettings = z.infer<typeof VideoSettingsSchema>;

export const VideoProjectSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    /** Document revision; incremented on every save. */
    revision: z.number().int().nonnegative().default(0),
    format: VideoFormatSchema,
    templateId: z.string().min(1),
    brand: BrandConfigSchema.optional(),
    scenes: z.array(VideoSceneSchema).max(200),
    assets: z.array(AssetSchema).default([]),
    audio: AudioSettingsSchema.prefault({}),
    settings: VideoSettingsSchema.prefault({}),
    metadata: ProjectMetadataSchema,
  })
  .superRefine((project, ctx) => {
    const assetIds = new Set(project.assets.map((a) => a.id));
    const sceneIds = new Set<string>();

    project.scenes.forEach((scene, index) => {
      if (sceneIds.has(scene.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenes', index, 'id'],
          message: `Duplicate scene id "${scene.id}"`,
        });
      }
      sceneIds.add(scene.id);

      if (!isSceneType(scene.type)) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenes', index, 'type'],
          message: `Unknown scene type "${scene.type}"`,
        });
        return;
      }
      const def = getSceneDefinition(scene.type);
      const result = def.propsSchema.safeParse(scene.props);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ ...issue, path: ['scenes', index, 'props', ...issue.path] });
        }
      }
      const minFrames = Math.ceil(def.minDurationSeconds * project.format.fps);
      if (scene.durationInFrames < minFrames) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenes', index, 'durationInFrames'],
          message: `${def.label} scenes must be at least ${def.minDurationSeconds}s (${minFrames} frames)`,
        });
      }
      if (scene.voiceoverAssetId && !assetIds.has(scene.voiceoverAssetId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenes', index, 'voiceoverAssetId'],
          message: `Voiceover asset "${scene.voiceoverAssetId}" does not exist in the project`,
        });
      }
      scene.overlays.forEach((o, oi) => {
        if (o.kind === 'media' && !assetIds.has(o.assetId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['scenes', index, 'overlays', oi, 'assetId'],
            message: `Overlay asset "${o.assetId}" does not exist in the project`,
          });
        }
      });
      if (scene.transitionIn && index === 0 && scene.transitionIn.type !== 'none') {
        // Allowed (transition from black) — no issue, documented behaviour.
      }
      if (scene.transitionIn && scene.transitionIn.durationInFrames >= scene.durationInFrames) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenes', index, 'transitionIn', 'durationInFrames'],
          message: 'Transition must be shorter than the scene',
        });
      }
    });

    if (project.audio.musicAssetId && !assetIds.has(project.audio.musicAssetId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['audio', 'musicAssetId'],
        message: `Music asset "${project.audio.musicAssetId}" does not exist in the project`,
      });
    }
    const seenAssets = new Set<string>();
    project.assets.forEach((asset, index) => {
      if (seenAssets.has(asset.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['assets', index, 'id'],
          message: `Duplicate asset id "${asset.id}"`,
        });
      }
      seenAssets.add(asset.id);
    });
  });

export type VideoProject = z.infer<typeof VideoProjectSchema>;
export type VideoProjectInput = z.input<typeof VideoProjectSchema>;

/**
 * A partial project as produced by importers or (later) AI generators. It is
 * turned into a full VideoProject by `engine.finalizeDraft`.
 */
export const VideoProjectDraftSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  format: VideoFormatSchema.optional(),
  templateId: z.string().optional(),
  brand: BrandConfigSchema.optional(),
  scenes: z
    .array(
      z.object({
        type: z.string(),
        title: z.string().optional(),
        durationSeconds: z.number().positive().optional(),
        props: z.record(z.string(), z.unknown()).default({}),
        voiceoverAssetId: z.string().optional(),
        transitionIn: TransitionConfigSchema.optional(),
      }),
    )
    .default([]),
  assets: z.array(AssetSchema).default([]),
  audio: AudioSettingsSchema.partial().optional(),
  settings: VideoSettingsSchema.partial().optional(),
  metadata: ProjectMetadataSchema.partial().optional(),
});
export type VideoProjectDraft = z.infer<typeof VideoProjectDraftSchema>;
export type VideoProjectDraftInput = z.input<typeof VideoProjectDraftSchema>;
