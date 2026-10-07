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

export const FeaturePropsSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  mediaAssetId: z.string().optional(),
  ...mediaFramingProps,
  layout: z
    .enum(['media-top', 'media-bottom', 'media-left', 'media-right', 'text-only'])
    .default('media-top'),
  badge: z.string().max(30).optional(),
  ...backgroundProps,
  ...sceneAnimationProps,
});
export type FeatureProps = z.infer<typeof FeaturePropsSchema>;

export const featureScene = defineScene<FeatureProps>({
  type: 'feature',
  label: 'Feature',
  description: 'Highlight one feature with a title, description and media',
  icon: 'star',
  propsSchema: FeaturePropsSchema,
  defaultProps: () => ({
    ...DEFAULT_SCENE_ANIMATION,
    title: 'Feature title',
    description: 'Explain the benefit in one sentence.',
    layout: 'media-top',
    ...DEFAULT_MEDIA_FRAMING,
  }),
  defaultDurationSeconds: 5,
  minDurationSeconds: 2,
  scriptKey: 'description',
  mediaKey: 'mediaAssetId',
  assetKeys: ['mediaAssetId', 'backgroundAssetId'],
  inspector: [
    {
      key: 'badge',
      label: 'Badge',
      kind: 'text',
      group: 'Content',
      maxLength: 30,
      placeholder: 'NEW',
    },
    { key: 'title', label: 'Title', kind: 'text', group: 'Content', maxLength: 100 },
    {
      key: 'description',
      label: 'Description',
      kind: 'textarea',
      group: 'Content',
      rows: 3,
      maxLength: 300,
    },
    {
      key: 'mediaAssetId',
      label: 'Media',
      kind: 'asset',
      group: 'Media',
      assetTypes: ['image', 'video'],
    },
    ...mediaFramingFields('Media'),
    {
      key: 'layout',
      label: 'Layout',
      kind: 'select',
      group: 'Style',
      options: [
        { label: 'Media on top', value: 'media-top' },
        { label: 'Media on bottom', value: 'media-bottom' },
        { label: 'Media left', value: 'media-left' },
        { label: 'Media right', value: 'media-right' },
        { label: 'Text only', value: 'text-only' },
      ],
    },
    ...backgroundFields,
    ...sceneAnimationFields,
  ],
});
