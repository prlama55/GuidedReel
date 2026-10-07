import { z } from 'zod';
import { ENTER_ANIMATIONS, ENTER_ANIMATION_OPTIONS, ExitAnimationSchema } from '../animation';
import { defineScene } from './definition';
import {
  backgroundFields,
  backgroundProps,
  TextSizeSchema,
  TEXT_SIZE_OPTIONS,
  exitAnimationField,
} from './common';

export const HookPropsSchema = z.object({
  text: z.string().min(1).max(200),
  /** Words to highlight with the accent colour. Case-insensitive. */
  highlightWords: z.array(z.string()).default([]),
  size: TextSizeSchema.default('lg'),
  animation: z.enum(['word-by-word', ...ENTER_ANIMATIONS]).default('word-by-word'),
  exitAnimation: ExitAnimationSchema.default('fade'),
  ...backgroundProps,
});
export type HookProps = z.infer<typeof HookPropsSchema>;

export const hookScene = defineScene<HookProps>({
  type: 'hook',
  label: 'Hook',
  description: 'Attention-grabbing statement with animated text',
  icon: 'zap',
  propsSchema: HookPropsSchema,
  defaultProps: () => ({
    text: 'Too much news, no time to read?',
    highlightWords: [],
    size: 'lg',
    animation: 'word-by-word',
    exitAnimation: 'fade',
  }),
  defaultDurationSeconds: 4,
  minDurationSeconds: 1.5,
  scriptKey: 'text',
  assetKeys: ['backgroundAssetId'],
  inspector: [
    { key: 'text', label: 'Text', kind: 'textarea', group: 'Content', rows: 3, maxLength: 200 },
    {
      key: 'highlightWords',
      label: 'Highlight words',
      kind: 'list',
      group: 'Content',
      itemLabel: 'word',
    },
    {
      key: 'animation',
      label: 'Entrance',
      kind: 'select',
      group: 'Style',
      options: [{ label: 'Word by word', value: 'word-by-word' }, ...ENTER_ANIMATION_OPTIONS],
    },
    exitAnimationField,
    { key: 'size', label: 'Text size', kind: 'select', group: 'Style', options: TEXT_SIZE_OPTIONS },
    ...backgroundFields,
  ],
});
