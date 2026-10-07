import { z } from 'zod';

const HexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Expected a hex colour');

export const FontConfigSchema = z.object({
  family: z.string().min(1),
  /** Asset id of an uploaded font file, or undefined for a system/web font. */
  assetId: z.string().optional(),
  weight: z.number().int().min(100).max(900).default(400),
  role: z.enum(['heading', 'body']).default('body'),
});
export type FontConfig = z.infer<typeof FontConfigSchema>;

export const BrandColorsSchema = z.object({
  primary: HexColor,
  secondary: HexColor.optional(),
  accent: HexColor.optional(),
  background: HexColor.optional(),
  text: HexColor.optional(),
});
export type BrandColors = z.infer<typeof BrandColorsSchema>;

export const WatermarkConfigSchema = z.object({
  assetId: z.string(),
  position: z
    .enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
    .default('bottom-right'),
  opacity: z.number().min(0).max(1).default(0.8),
  /** Fraction of video width. */
  size: z.number().min(0.02).max(0.5).default(0.12),
});
export type WatermarkConfig = z.infer<typeof WatermarkConfigSchema>;

export const BrandConfigSchema = z.object({
  name: z.string().min(1).max(120),
  logoAssetId: z.string().optional(),
  colors: BrandColorsSchema,
  fonts: z.array(FontConfigSchema).default([]),
  watermark: WatermarkConfigSchema.optional(),
  ctaStyle: z.enum(['solid', 'outline', 'pill']).default('solid'),
});
export type BrandConfig = z.infer<typeof BrandConfigSchema>;

export const DEFAULT_BRAND: BrandConfig = {
  name: 'Default',
  colors: {
    primary: '#6366F1',
    secondary: '#EC4899',
    accent: '#F59E0B',
    background: '#0B0F19',
    text: '#FFFFFF',
  },
  fonts: [],
  ctaStyle: 'solid',
};

export { HexColor as HexColorSchema };
