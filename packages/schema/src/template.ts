import { z } from 'zod';
import { AspectRatioSchema } from './format';

export const TemplateCategorySchema = z.enum([
  'promotional',
  'advertisement',
  'social',
  'educational',
  'news',
  'event',
  'testimonial',
  'explainer',
  'other',
]);
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;

/** Serializable description of a template. The factory itself lives in @guidedreel/templates. */
export const TemplateMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(400),
  category: TemplateCategorySchema,
  supportedFormats: z.array(AspectRatioSchema).min(1),
  /** Rough target length in seconds, for the gallery. */
  typicalDurationSeconds: z.number().positive(),
  tags: z.array(z.string()).default([]),
  /** Accent colour for the gallery card when no thumbnail exists. */
  accentColor: z.string().optional(),
  thumbnailUrl: z.string().optional(),
});
export type TemplateMeta = z.infer<typeof TemplateMetaSchema>;
