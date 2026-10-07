import { z } from 'zod';

export const VideoCodecSchema = z.enum(['h264', 'h265', 'vp8', 'vp9', 'prores']);
export type VideoCodec = z.infer<typeof VideoCodecSchema>;

export const RenderQualitySchema = z.enum(['draft', 'standard', 'high']);
export type RenderQuality = z.infer<typeof RenderQualitySchema>;

export const RenderOptionsSchema = z.object({
  codec: VideoCodecSchema.default('h264'),
  quality: RenderQualitySchema.default('standard'),
  /** Explicit CRF overrides the quality preset. */
  crf: z.number().int().min(1).max(51).optional(),
  /** 0.25–2 output scale relative to the project format. */
  scale: z.number().min(0.25).max(2).default(1),
  muted: z.boolean().default(false),
  /** Output file name without extension. */
  fileName: z.string().min(1).max(120).optional(),
  /** Absolute output path (desktop) or omitted to let the renderer choose. */
  outputPath: z.string().optional(),
  concurrency: z.number().int().min(1).max(32).optional(),
});
export type RenderOptions = z.infer<typeof RenderOptionsSchema>;
export type RenderOptionsInput = z.input<typeof RenderOptionsSchema>;

/** Quality preset → encoder settings. */
export const QUALITY_PRESETS: Record<
  RenderQuality,
  { crf: number; scale: number; label: string; hint: string }
> = {
  draft: { crf: 30, scale: 0.5, label: 'Draft', hint: 'Half resolution, fast' },
  standard: { crf: 20, scale: 1, label: 'Standard', hint: 'Full resolution, balanced' },
  high: { crf: 16, scale: 1, label: 'High', hint: 'Full resolution, larger file' },
};

export const RenderJobStatusSchema = z.enum([
  'queued',
  'preparing',
  'rendering',
  'encoding',
  'uploading',
  'completed',
  'failed',
  'cancelled',
]);
export type RenderJobStatus = z.infer<typeof RenderJobStatusSchema>;

export const TERMINAL_RENDER_STATUSES: RenderJobStatus[] = ['completed', 'failed', 'cancelled'];

export const RenderProgressSchema = z.object({
  status: RenderJobStatusSchema,
  /** 0..1 overall. */
  progress: z.number().min(0).max(1),
  renderedFrames: z.number().int().nonnegative().optional(),
  totalFrames: z.number().int().nonnegative().optional(),
  message: z.string().optional(),
});
export type RenderProgress = z.infer<typeof RenderProgressSchema>;

export const RenderResultSchema = z.object({
  /** Local path on desktop / server. */
  outputPath: z.string().optional(),
  /** Downloadable URL on web. */
  outputUrl: z.string().optional(),
  sizeBytes: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  totalFrames: z.number().int().nonnegative(),
});
export type RenderResult = z.infer<typeof RenderResultSchema>;

export const RenderJobSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  projectName: z.string(),
  status: RenderJobStatusSchema,
  progress: z.number().min(0).max(1).default(0),
  renderedFrames: z.number().int().nonnegative().optional(),
  totalFrames: z.number().int().nonnegative().optional(),
  options: RenderOptionsSchema,
  result: RenderResultSchema.optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  createdAt: z.iso.datetime(),
  startedAt: z.iso.datetime().optional(),
  finishedAt: z.iso.datetime().optional(),
});
export type RenderJob = z.infer<typeof RenderJobSchema>;
