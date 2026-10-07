import { z } from 'zod';

export const TransitionTypeSchema = z.enum([
  'none',
  'fade',
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'zoom',
  'wipe',
  'wipe-right',
  'wipe-up',
  'wipe-down',
  'flip',
  'clock-wipe',
  'iris',
]);
export type TransitionType = z.infer<typeof TransitionTypeSchema>;

export const TransitionConfigSchema = z.object({
  type: TransitionTypeSchema,
  /** Overlap between the two scenes. 0 for `none`. */
  durationInFrames: z.number().int().nonnegative().max(300),
});
export type TransitionConfig = z.infer<typeof TransitionConfigSchema>;

export const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide-left', label: 'Slide left' },
  { value: 'slide-right', label: 'Slide right' },
  { value: 'slide-up', label: 'Slide up' },
  { value: 'slide-down', label: 'Slide down' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'wipe', label: 'Wipe left' },
  { value: 'wipe-right', label: 'Wipe right' },
  { value: 'wipe-up', label: 'Wipe up' },
  { value: 'wipe-down', label: 'Wipe down' },
  { value: 'flip', label: 'Flip' },
  { value: 'clock-wipe', label: 'Clock wipe' },
  { value: 'iris', label: 'Iris' },
];

export const NO_TRANSITION: TransitionConfig = { type: 'none', durationInFrames: 0 };

export function effectiveTransitionFrames(t: TransitionConfig | undefined): number {
  if (!t || t.type === 'none') return 0;
  return t.durationInFrames;
}
