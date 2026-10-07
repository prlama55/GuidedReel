import { z } from 'zod';
import { EnterAnimationSchema, ENTER_ANIMATION_OPTIONS, ExitAnimationSchema } from '../animation';
import { defineScene } from './definition';
import {
  AlignmentSchema,
  backgroundFields,
  backgroundProps,
  TextSizeSchema,
  TEXT_SIZE_OPTIONS,
  exitAnimationField,
} from './common';

export const TextPropsSchema = z.object({
  text: z.string().min(1).max(600),
  align: AlignmentSchema.default('center'),
  size: TextSizeSchema.default('md'),
  animation: EnterAnimationSchema.default('fade'),
  exitAnimation: ExitAnimationSchema.default('fade'),
  ...backgroundProps,
});
export type TextProps = z.infer<typeof TextPropsSchema>;

export const textScene = defineScene<TextProps>({
  type: 'text',
  label: 'Text',
  description: 'A paragraph of text on a background',
  icon: 'type',
  propsSchema: TextPropsSchema,
  defaultProps: () => ({
    text: 'Your message here',
    align: 'center',
    size: 'md',
    animation: 'fade',
    exitAnimation: 'fade',
  }),
  defaultDurationSeconds: 4,
  minDurationSeconds: 1,
  scriptKey: 'text',
  assetKeys: ['backgroundAssetId'],
  inspector: [
    { key: 'text', label: 'Text', kind: 'textarea', group: 'Content', rows: 4, maxLength: 600 },
    { key: 'align', label: 'Alignment', kind: 'alignment', group: 'Style' },
    { key: 'size', label: 'Text size', kind: 'select', group: 'Style', options: TEXT_SIZE_OPTIONS },
    {
      key: 'animation',
      label: 'Entrance',
      kind: 'select',
      group: 'Style',
      options: ENTER_ANIMATION_OPTIONS,
    },
    exitAnimationField,
    ...backgroundFields,
  ],
});
