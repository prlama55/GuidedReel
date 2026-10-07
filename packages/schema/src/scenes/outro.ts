import { z } from 'zod';
import { defineScene } from './definition';
import {
  backgroundProps,
  backgroundFields,
  sceneAnimationProps,
  sceneAnimationFields,
  DEFAULT_SCENE_ANIMATION,
} from './common';

export const OutroPropsSchema = z.object({
  text: z.string().max(120).optional(),
  showLogo: z.boolean().default(true),
  handles: z.array(z.string().max(60)).max(4).default([]),
  ...backgroundProps,
  ...sceneAnimationProps,
});
export type OutroProps = z.infer<typeof OutroPropsSchema>;

export const outroScene = defineScene<OutroProps>({
  type: 'outro',
  label: 'Outro',
  description: 'Closing card with logo and social handles',
  icon: 'flag',
  propsSchema: OutroPropsSchema,
  defaultProps: () => ({
    ...DEFAULT_SCENE_ANIMATION,
    text: 'Thanks for watching',
    showLogo: true,
    handles: [],
  }),
  defaultDurationSeconds: 3,
  minDurationSeconds: 1,
  scriptKey: 'text',
  assetKeys: ['backgroundAssetId'],
  inspector: [
    { key: 'text', label: 'Text', kind: 'text', group: 'Content', maxLength: 120 },
    {
      key: 'handles',
      label: 'Social handles',
      kind: 'list',
      group: 'Content',
      itemLabel: 'handle',
      maxItems: 4,
    },
    { key: 'showLogo', label: 'Show brand logo', kind: 'toggle', group: 'Media' },
    ...backgroundFields,
    ...sceneAnimationFields,
  ],
});
