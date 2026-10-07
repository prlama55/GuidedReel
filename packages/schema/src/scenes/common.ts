import { z } from 'zod';
import type { InspectorField } from './inspector';
import {
  SCENE_ENTER_ANIMATION_OPTIONS,
  EXIT_ANIMATION_OPTIONS,
  sceneAnimationProps,
} from '../animation';

export const AlignmentSchema = z.enum(['left', 'center', 'right']);
export const TextSizeSchema = z.enum(['sm', 'md', 'lg', 'xl']);
/** auto = fill when the aspect ratio is close, otherwise show whole over a blurred backdrop. */
export const FitSchema = z.enum(['auto', 'cover', 'contain']);
export type MediaFit = z.infer<typeof FitSchema>;
export const OptionalColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
  .optional();

export const TEXT_SIZE_OPTIONS = [
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
  { label: 'Extra large', value: 'xl' },
];

export const FIT_OPTIONS = [
  { label: 'Auto (recommended)', value: 'auto' },
  { label: 'Cover (fill, may crop)', value: 'cover' },
  { label: 'Contain (show whole)', value: 'contain' },
];

export const backgroundFields: InspectorField[] = [
  {
    key: 'backgroundAssetId',
    label: 'Background media',
    kind: 'asset',
    group: 'Media',
    assetTypes: ['image', 'video'],
  },
  {
    key: 'backgroundColor',
    label: 'Background colour',
    kind: 'color',
    group: 'Style',
    description: 'Overrides the project background',
  },
];

export const backgroundProps = {
  backgroundAssetId: z.string().optional(),
  backgroundColor: OptionalColor,
};

/** Zoom/pan framing shared by every scene that shows a primary media asset. */
export const mediaFramingProps = {
  fit: FitSchema.default('auto'),
  /** 1 = as fitted; up to 4x closer. */
  mediaZoom: z.number().min(1).max(4).default(1),
  /** -1..1, fraction of half the slot; 0 is centred. */
  mediaOffsetX: z.number().min(-1).max(1).default(0),
  mediaOffsetY: z.number().min(-1).max(1).default(0),
};

export const DEFAULT_MEDIA_FRAMING = {
  fit: 'auto' as const,
  mediaZoom: 1,
  mediaOffsetX: 0,
  mediaOffsetY: 0,
};

export function mediaFramingFields(label = 'Media'): InspectorField[] {
  return [
    { key: 'fit', label: `${label} fit`, kind: 'select', group: 'Media', options: FIT_OPTIONS },
    {
      key: 'mediaZoom',
      label: 'Zoom',
      kind: 'number',
      group: 'Media',
      min: 1,
      max: 4,
      step: 0.05,
      slider: true,
      description: 'Turn on Crop in the preview to drag, scroll-zoom and double-click to reset.',
    },
    {
      key: 'mediaOffsetX',
      label: 'Horizontal position',
      kind: 'number',
      group: 'Media',
      min: -1,
      max: 1,
      step: 0.01,
      slider: true,
    },
    {
      key: 'mediaOffsetY',
      label: 'Vertical position',
      kind: 'number',
      group: 'Media',
      min: -1,
      max: 1,
      step: 0.01,
      slider: true,
    },
  ];
}

export { sceneAnimationProps };
export const DEFAULT_SCENE_ANIMATION = {
  animation: 'default' as const,
  exitAnimation: 'fade' as const,
};

/** Enter/exit selects for scenes whose entrance is choreographed by the scene itself. */
export const sceneAnimationFields: InspectorField[] = [
  {
    key: 'animation',
    label: 'Entrance',
    kind: 'select',
    group: 'Style',
    options: SCENE_ENTER_ANIMATION_OPTIONS,
    description: '"Scene default" keeps the built-in choreography.',
  },
  {
    key: 'exitAnimation',
    label: 'Exit',
    kind: 'select',
    group: 'Style',
    options: EXIT_ANIMATION_OPTIONS,
  },
];
export const exitAnimationField: InspectorField = {
  key: 'exitAnimation',
  label: 'Exit',
  kind: 'select',
  group: 'Style',
  options: EXIT_ANIMATION_OPTIONS,
};
