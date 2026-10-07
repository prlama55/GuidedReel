import { z } from 'zod';
import { defineScene } from './definition';
import {
  backgroundProps,
  backgroundFields,
  sceneAnimationProps,
  sceneAnimationFields,
  DEFAULT_SCENE_ANIMATION,
} from './common';

export const QuotePropsSchema = z.object({
  quote: z.string().min(1).max(400),
  author: z.string().max(80).optional(),
  role: z.string().max(80).optional(),
  avatarAssetId: z.string().optional(),
  rating: z.number().int().min(0).max(5).optional(),
  ...backgroundProps,
  ...sceneAnimationProps,
});
export type QuoteProps = z.infer<typeof QuotePropsSchema>;

export const quoteScene = defineScene<QuoteProps>({
  type: 'quote',
  label: 'Quote',
  description: 'Testimonial or quote with author attribution',
  icon: 'quote',
  propsSchema: QuotePropsSchema,
  defaultProps: () => ({
    ...DEFAULT_SCENE_ANIMATION,
    quote: 'This changed the way we work.',
    author: 'Customer name',
    role: '',
  }),
  defaultDurationSeconds: 5,
  minDurationSeconds: 2,
  scriptKey: 'quote',
  assetKeys: ['avatarAssetId', 'backgroundAssetId'],
  inspector: [
    { key: 'quote', label: 'Quote', kind: 'textarea', group: 'Content', rows: 4, maxLength: 400 },
    { key: 'author', label: 'Author', kind: 'text', group: 'Content', maxLength: 80 },
    { key: 'role', label: 'Role / company', kind: 'text', group: 'Content', maxLength: 80 },
    {
      key: 'rating',
      label: 'Star rating',
      kind: 'number',
      group: 'Content',
      min: 0,
      max: 5,
      step: 1,
      slider: true,
    },
    { key: 'avatarAssetId', label: 'Avatar', kind: 'asset', group: 'Media', assetTypes: ['image'] },
    ...backgroundFields,
    ...sceneAnimationFields,
  ],
});
