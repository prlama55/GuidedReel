import { z } from 'zod';
import { ImageMotionSchema, IMAGE_MOTION_OPTIONS, ExitAnimationSchema } from '../animation';
import { defineScene } from './definition';
import {
  OptionalColor,
  mediaFramingProps,
  mediaFramingFields,
  DEFAULT_MEDIA_FRAMING,
  exitAnimationField,
} from './common';

export const ImagePropsSchema = z.object({
  imageAssetId: z.string().optional(),
  caption: z.string().max(200).optional(),
  ...mediaFramingProps,
  motion: ImageMotionSchema.default('ken-burns'),
  exitAnimation: ExitAnimationSchema.default('fade'),
  backgroundColor: OptionalColor,
});
export type ImageProps = z.infer<typeof ImagePropsSchema>;

export const imageScene = defineScene<ImageProps>({
  type: 'image',
  label: 'Image',
  description: 'Full-frame image with optional caption and Ken Burns motion',
  icon: 'image',
  propsSchema: ImagePropsSchema,
  defaultProps: () => ({ ...DEFAULT_MEDIA_FRAMING, motion: 'ken-burns', exitAnimation: 'fade' }),
  defaultDurationSeconds: 4,
  minDurationSeconds: 1,
  scriptKey: 'caption',
  mediaKey: 'imageAssetId',
  assetKeys: ['imageAssetId'],
  inspector: [
    { key: 'imageAssetId', label: 'Image', kind: 'asset', group: 'Media', assetTypes: ['image'] },
    { key: 'caption', label: 'Caption', kind: 'text', group: 'Content', maxLength: 200 },
    ...mediaFramingFields('Image'),
    {
      key: 'motion',
      label: 'Motion',
      kind: 'select',
      group: 'Style',
      options: IMAGE_MOTION_OPTIONS,
    },
    exitAnimationField,
    { key: 'backgroundColor', label: 'Background colour', kind: 'color', group: 'Style' },
  ],
});
