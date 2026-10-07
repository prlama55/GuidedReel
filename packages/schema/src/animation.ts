import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Animation catalogue shared by overlays, scene content and text scenes.      */
/* Implementations live in @guidedreel/compositions/animations/presets.               */
/* -------------------------------------------------------------------------- */

export const ENTER_ANIMATIONS = [
  'none',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom-in',
  'zoom-out',
  'pop',
  'bounce',
  'drop',
  'flip',
  'rotate',
  'blur',
  'wipe',
  'typewriter',
] as const;
export const EnterAnimationSchema = z.enum(ENTER_ANIMATIONS);
export type EnterAnimation = z.infer<typeof EnterAnimationSchema>;

export const EXIT_ANIMATIONS = [
  'none',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom-in',
  'zoom-out',
  'pop',
  'blur',
  'wipe',
  'spin',
] as const;
export const ExitAnimationSchema = z.enum(EXIT_ANIMATIONS);
export type ExitAnimation = z.infer<typeof ExitAnimationSchema>;

export const LOOP_ANIMATIONS = [
  'none',
  'pulse',
  'float',
  'wiggle',
  'spin',
  'blink',
  'swing',
  'heartbeat',
  'shake',
] as const;
export const LoopAnimationSchema = z.enum(LOOP_ANIMATIONS);
export type LoopAnimation = z.infer<typeof LoopAnimationSchema>;

/** Whole-scene entrance: `default` keeps the scene's own choreography. */
export const SCENE_ENTER_ANIMATIONS = [
  'default',
  ...ENTER_ANIMATIONS.filter((a) => a !== 'typewriter'),
] as [string, ...string[]];
export const SceneEnterAnimationSchema = z.enum(
  SCENE_ENTER_ANIMATIONS as [EnterAnimation | 'default', ...(EnterAnimation | 'default')[]],
);
export type SceneEnterAnimation = z.infer<typeof SceneEnterAnimationSchema>;

export const IMAGE_MOTIONS = [
  'none',
  'ken-burns',
  'zoom-in',
  'zoom-out',
  'pan-left',
  'pan-right',
  'pan-up',
  'pan-down',
  'drift',
] as const;
export const ImageMotionSchema = z.enum(IMAGE_MOTIONS);
export type ImageMotion = z.infer<typeof ImageMotionSchema>;

const label = (v: string) => v.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const ENTER_ANIMATION_OPTIONS = ENTER_ANIMATIONS.map((value) => ({
  value,
  label: label(value),
}));
export const EXIT_ANIMATION_OPTIONS = EXIT_ANIMATIONS.map((value) => ({
  value,
  label: label(value),
}));
export const LOOP_ANIMATION_OPTIONS = LOOP_ANIMATIONS.map((value) => ({
  value,
  label: label(value),
}));
export const SCENE_ENTER_ANIMATION_OPTIONS = SCENE_ENTER_ANIMATIONS.map((value) => ({
  value,
  label: value === 'default' ? 'Scene default' : label(value),
}));
export const IMAGE_MOTION_OPTIONS = IMAGE_MOTIONS.map((value) => ({
  value,
  label: value === 'none' ? 'None (still)' : label(value),
}));

/** Enter/exit/loop + durations, for overlays. */
export const animatedElementProps = {
  animation: EnterAnimationSchema.default('fade'),
  exitAnimation: ExitAnimationSchema.default('none'),
  loopAnimation: LoopAnimationSchema.default('none'),
  enterDurationFrames: z.number().int().min(1).max(120).default(15),
  exitDurationFrames: z.number().int().min(1).max(120).default(15),
};

/** Whole-scene enter override + exit, for every scene type. */
export const sceneAnimationProps = {
  animation: SceneEnterAnimationSchema.default('default'),
  exitAnimation: ExitAnimationSchema.default('fade'),
};
