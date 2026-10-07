import { z } from 'zod';
import { animatedElementProps, EnterAnimationSchema, ENTER_ANIMATION_OPTIONS } from './animation';

const HexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Expected a hex colour');

/** @deprecated use EnterAnimationSchema */
export const OverlayAnimationSchema = EnterAnimationSchema;
export type OverlayAnimation = z.infer<typeof EnterAnimationSchema>;

/**
 * Free-positioned element drawn on top of a scene. Positions and sizes are
 * fractions of the frame so overlays stay in place across 9:16, 16:9 and 1:1.
 */
const OverlayBase = {
  id: z.string().min(1),
  /** Centre, 0..1 of frame width/height. */
  x: z.number().min(-0.5).max(1.5).default(0.5),
  y: z.number().min(-0.5).max(1.5).default(0.5),
  /** Fraction of frame width. */
  width: z.number().min(0.02).max(2).default(0.6),
  rotation: z.number().min(-180).max(180).default(0),
  opacity: z.number().min(0).max(1).default(1),
  /** Frames after the scene starts before the overlay appears. */
  startOffsetFrames: z.number().int().nonnegative().default(0),
  /** Visible length; omitted = until the scene ends. */
  durationInFrames: z.number().int().positive().optional(),
  ...animatedElementProps,
  locked: z.boolean().default(false),
};

export const TextOverlaySchema = z.object({
  ...OverlayBase,
  kind: z.literal('text'),
  text: z.string().max(500),
  /** Design px at a 1080 short side; scaled with the format. */
  fontSize: z.number().min(12).max(300).default(56),
  weight: z.number().int().min(300).max(900).default(700),
  align: z.enum(['left', 'center', 'right']).default('center'),
  color: HexColor.optional(),
  /** Pill/box behind the text; omitted = none. */
  background: HexColor.optional(),
  fontFamily: z.string().optional(),
});
export type TextOverlay = z.infer<typeof TextOverlaySchema>;

export const MediaOverlaySchema = z.object({
  ...OverlayBase,
  kind: z.literal('media'),
  assetId: z.string().min(1),
  /** Fraction of frame height. */
  height: z.number().min(0.02).max(2).default(0.3),
  fit: z.enum(['cover', 'contain']).default('cover'),
  /** Corner radius as a fraction of the overlay's short side. */
  radius: z.number().min(0).max(0.5).default(0.06),
  shadow: z.boolean().default(true),
  muted: z.boolean().default(true),
});
export type MediaOverlay = z.infer<typeof MediaOverlaySchema>;

/** Emoji sticker from the Noto set; animated versions play as GIFs. */
export const EmojiOverlaySchema = z.object({
  ...OverlayBase,
  kind: z.literal('emoji'),
  /** Noto codepoint id, e.g. "1f600" or "1f44d_200d_1f525". */
  codepoint: z.string().regex(/^[0-9a-f]{4,6}(_[0-9a-f]{4,6})*$/i),
  /** Play the animated version (requires network at render time) or show the static vector. */
  animated: z.boolean().default(true),
  /** 1 = normal speed. */
  playbackRate: z.number().min(0.25).max(3).default(1),
});
export type EmojiOverlay = z.infer<typeof EmojiOverlaySchema>;

export const OverlaySchema = z.discriminatedUnion('kind', [
  TextOverlaySchema,
  MediaOverlaySchema,
  EmojiOverlaySchema,
]);
export type Overlay = z.infer<typeof OverlaySchema>;
export type OverlayInput = z.input<typeof OverlaySchema>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** Overlay input without an id (one is generated), keeping the text/media discrimination. */
export type OverlayDraft = DistributiveOmit<OverlayInput, 'id'> & { id?: string };

/** @deprecated use ENTER_ANIMATION_OPTIONS */
export const OVERLAY_ANIMATION_OPTIONS = ENTER_ANIMATION_OPTIONS;
