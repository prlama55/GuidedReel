import { z } from 'zod';
import { defineScene } from './definition';
import {
  backgroundFields,
  backgroundProps,
  sceneAnimationProps,
  sceneAnimationFields,
  DEFAULT_SCENE_ANIMATION,
} from './common';

export const IntroPropsSchema = z.object({
  title: z.string().max(120),
  subtitle: z.string().max(200).optional(),
  logoAssetId: z.string().optional(),
  showLogo: z.boolean().default(true),
  ...backgroundProps,
  ...sceneAnimationProps,
});
export type IntroProps = z.infer<typeof IntroPropsSchema>;

export const introScene = defineScene<IntroProps>({
  type: 'intro',
  label: 'Intro',
  description: 'Opening title with optional logo and subtitle',
  icon: 'sparkles',
  propsSchema: IntroPropsSchema,
  defaultProps: () => ({
    ...DEFAULT_SCENE_ANIMATION,
    title: 'Your title here',
    subtitle: '',
    showLogo: true,
  }),
  defaultDurationSeconds: 3,
  minDurationSeconds: 1,
  scriptKey: 'title',
  assetKeys: ['logoAssetId', 'backgroundAssetId'],
  inspector: [
    { key: 'title', label: 'Title', kind: 'text', group: 'Content', maxLength: 120 },
    { key: 'subtitle', label: 'Subtitle', kind: 'text', group: 'Content', maxLength: 200 },
    { key: 'showLogo', label: 'Show brand logo', kind: 'toggle', group: 'Media' },
    {
      key: 'logoAssetId',
      label: 'Logo override',
      kind: 'asset',
      group: 'Media',
      assetTypes: ['logo', 'image'],
    },
    ...backgroundFields,
    ...sceneAnimationFields,
  ],
});
