import { z } from 'zod';
import { ExitAnimationSchema } from '../animation';
import { defineScene } from './definition';
import {
  OptionalColor,
  mediaFramingProps,
  mediaFramingFields,
  DEFAULT_MEDIA_FRAMING,
  exitAnimationField,
} from './common';

export const VideoPropsSchema = z.object({
  videoAssetId: z.string().optional(),
  caption: z.string().max(200).optional(),
  ...mediaFramingProps,
  muted: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(1),
  /** Seconds into the source clip to start from. */
  startFromSeconds: z.number().nonnegative().default(0),
  backgroundColor: OptionalColor,
  exitAnimation: ExitAnimationSchema.default('fade'),
});
export type VideoProps = z.infer<typeof VideoPropsSchema>;

export const videoScene = defineScene<VideoProps>({
  type: 'video',
  label: 'Video',
  description: 'Full-frame video clip with optional caption',
  icon: 'film',
  propsSchema: VideoPropsSchema,
  defaultProps: () => ({
    exitAnimation: 'fade',
    ...DEFAULT_MEDIA_FRAMING,
    muted: false,
    volume: 1,
    startFromSeconds: 0,
  }),
  defaultDurationSeconds: 5,
  minDurationSeconds: 1,
  scriptKey: 'caption',
  mediaKey: 'videoAssetId',
  assetKeys: ['videoAssetId'],
  inspector: [
    { key: 'videoAssetId', label: 'Video', kind: 'asset', group: 'Media', assetTypes: ['video'] },
    { key: 'caption', label: 'Caption', kind: 'text', group: 'Content', maxLength: 200 },
    {
      key: 'startFromSeconds',
      label: 'Start from (s)',
      kind: 'number',
      group: 'Timing',
      min: 0,
      step: 0.1,
    },
    { key: 'muted', label: 'Mute clip audio', kind: 'toggle', group: 'Media' },
    {
      key: 'volume',
      label: 'Clip volume',
      kind: 'number',
      group: 'Media',
      min: 0,
      max: 1,
      step: 0.05,
      slider: true,
    },
    ...mediaFramingFields('Video'),
    { key: 'backgroundColor', label: 'Background colour', kind: 'color', group: 'Style' },
    exitAnimationField,
  ],
});
