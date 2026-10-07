import { z } from 'zod';
import { defineScene } from './definition';
import {
  backgroundProps,
  backgroundFields,
  mediaFramingProps,
  mediaFramingFields,
  DEFAULT_MEDIA_FRAMING,
  sceneAnimationProps,
  sceneAnimationFields,
  DEFAULT_SCENE_ANIMATION,
} from './common';

export const ProductPropsSchema = z.object({
  name: z.string().min(1).max(100),
  tagline: z.string().max(160).optional(),
  price: z.string().max(30).optional(),
  imageAssetId: z.string().optional(),
  ...mediaFramingProps,
  bullets: z.array(z.string().max(80)).max(5).default([]),
  ...backgroundProps,
  ...sceneAnimationProps,
});
export type ProductProps = z.infer<typeof ProductPropsSchema>;

export const productScene = defineScene<ProductProps>({
  type: 'product',
  label: 'Product',
  description: 'Product showcase with image, price and bullet points',
  icon: 'package',
  propsSchema: ProductPropsSchema,
  defaultProps: () => ({
    ...DEFAULT_SCENE_ANIMATION,
    name: 'Product name',
    tagline: '',
    bullets: [],
    ...DEFAULT_MEDIA_FRAMING,
  }),
  defaultDurationSeconds: 6,
  minDurationSeconds: 2,
  scriptKey: 'tagline',
  mediaKey: 'imageAssetId',
  assetKeys: ['imageAssetId', 'backgroundAssetId'],
  inspector: [
    { key: 'name', label: 'Product name', kind: 'text', group: 'Content', maxLength: 100 },
    { key: 'tagline', label: 'Tagline', kind: 'text', group: 'Content', maxLength: 160 },
    {
      key: 'price',
      label: 'Price',
      kind: 'text',
      group: 'Content',
      maxLength: 30,
      placeholder: '$29',
    },
    {
      key: 'bullets',
      label: 'Bullet points',
      kind: 'list',
      group: 'Content',
      itemLabel: 'point',
      maxItems: 5,
    },
    {
      key: 'imageAssetId',
      label: 'Product image',
      kind: 'asset',
      group: 'Media',
      assetTypes: ['image'],
    },
    ...mediaFramingFields('Image'),
    ...backgroundFields,
    ...sceneAnimationFields,
  ],
});
