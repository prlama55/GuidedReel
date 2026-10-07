import { z } from 'zod';

export const AssetTypeSchema = z.enum([
  'image',
  'video',
  'audio',
  'voiceover',
  'music',
  'font',
  'logo',
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * Where the bytes live. The engine never reads files itself; an AssetResolver
 * turns a source into a URL for the current environment.
 */
export const AssetSourceSchema = z.discriminatedUnion('kind', [
  /** Any http(s) URL (CDN, signed URL, remote media). */
  z.object({ kind: z.literal('url'), url: z.url() }),
  /** Absolute path on the local filesystem (desktop). */
  z.object({ kind: z.literal('local'), path: z.string().min(1) }),
  /** Opaque key inside the host app's AssetStore (IndexedDB blob, app data dir, ...). */
  z.object({ kind: z.literal('store'), key: z.string().min(1) }),
  /** Object in a cloud bucket (Supabase Storage, S3, ...). */
  z.object({
    kind: z.literal('cloud'),
    provider: z.string().min(1),
    bucket: z.string().min(1),
    key: z.string().min(1),
  }),
]);
export type AssetSource = z.infer<typeof AssetSourceSchema>;

export const AssetSchema = z.object({
  id: z.string().min(1),
  type: AssetTypeSchema,
  name: z.string().min(1).max(255),
  source: AssetSourceSchema,
  mimeType: z.string().optional(),
  /** Bytes, when known. */
  size: z.number().int().nonnegative().optional(),
  /** Seconds, for time-based media. Captured at import time. */
  duration: z.number().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  /** Font family name for `font` assets. */
  fontFamily: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const VISUAL_ASSET_TYPES: AssetType[] = ['image', 'video', 'logo'];
export const AUDIO_ASSET_TYPES: AssetType[] = ['audio', 'voiceover', 'music'];

export function isTimeBasedAsset(type: AssetType): boolean {
  return type === 'video' || AUDIO_ASSET_TYPES.includes(type);
}

/** Accepted MIME types per asset type. Used by upload validation in both apps. */
export const ACCEPTED_MIME_TYPES: Record<AssetType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'],
  logo: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/aac',
    'audio/mp4',
    'audio/x-m4a',
  ],
  voiceover: [
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/aac',
    'audio/mp4',
    'audio/x-m4a',
  ],
  music: [
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/aac',
    'audio/mp4',
    'audio/x-m4a',
  ],
  font: [
    'font/ttf',
    'font/otf',
    'font/woff',
    'font/woff2',
    'application/font-sfnt',
    'application/x-font-ttf',
  ],
};

/** Infer the asset type from a MIME type, defaulting audio to `audio`. */
export function assetTypeFromMime(mime: string): AssetType | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('font/') || mime.includes('font')) return 'font';
  return null;
}
