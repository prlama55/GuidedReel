import { z } from 'zod';
import { defineScene } from './definition';
import {
  backgroundProps,
  backgroundFields,
  sceneAnimationProps,
  sceneAnimationFields,
  DEFAULT_SCENE_ANIMATION,
} from './common';

export const CtaPropsSchema = z.object({
  headline: z.string().min(1).max(120),
  subline: z.string().max(160).optional(),
  buttonText: z.string().max(40).optional(),
  url: z.string().max(120).optional(),
  showLogo: z.boolean().default(true),
  ...backgroundProps,
  ...sceneAnimationProps,
});
export type CtaProps = z.infer<typeof CtaPropsSchema>;

export const ctaScene = defineScene<CtaProps>({
  type: 'cta',
  label: 'Call to action',
  description: 'Ask the viewer to do something',
  icon: 'mouse-pointer-click',
  propsSchema: CtaPropsSchema,
  defaultProps: () => ({
    ...DEFAULT_SCENE_ANIMATION,
    headline: 'Get started today',
    subline: '',
    buttonText: 'Download now',
    url: '',
    showLogo: true,
  }),
  defaultDurationSeconds: 4,
  minDurationSeconds: 1.5,
  scriptKey: 'headline',
  assetKeys: ['backgroundAssetId'],
  inspector: [
    { key: 'headline', label: 'Headline', kind: 'text', group: 'Content', maxLength: 120 },
    { key: 'subline', label: 'Subline', kind: 'text', group: 'Content', maxLength: 160 },
    { key: 'buttonText', label: 'Button text', kind: 'text', group: 'Content', maxLength: 40 },
    {
      key: 'url',
      label: 'URL / handle',
      kind: 'text',
      group: 'Content',
      maxLength: 120,
      placeholder: 'example.com',
    },
    { key: 'showLogo', label: 'Show brand logo', kind: 'toggle', group: 'Media' },
    ...backgroundFields,
    ...sceneAnimationFields,
  ],
});
