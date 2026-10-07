import { z } from 'zod';

export const AspectRatioSchema = z.enum(['9:16', '16:9', '1:1', '4:5']);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

export const VideoFormatSchema = z.object({
  width: z.number().int().min(16).max(7680),
  height: z.number().int().min(16).max(7680),
  fps: z.number().int().min(1).max(120),
});
export type VideoFormat = z.infer<typeof VideoFormatSchema>;

export type FormatPreset = {
  id: AspectRatio;
  label: string;
  description: string;
  format: VideoFormat;
};

export const FORMAT_PRESETS: Record<AspectRatio, FormatPreset> = {
  '9:16': {
    id: '9:16',
    label: 'Vertical',
    description: 'Reels, Shorts, TikTok, Stories',
    format: { width: 1080, height: 1920, fps: 30 },
  },
  '16:9': {
    id: '16:9',
    label: 'Landscape',
    description: 'YouTube, presentations, web',
    format: { width: 1920, height: 1080, fps: 30 },
  },
  '1:1': {
    id: '1:1',
    label: 'Square',
    description: 'Feed posts',
    format: { width: 1080, height: 1080, fps: 30 },
  },
  '4:5': {
    id: '4:5',
    label: 'Portrait',
    description: 'Instagram / Facebook feed',
    format: { width: 1080, height: 1350, fps: 30 },
  },
};

export const FORMAT_PRESET_LIST: FormatPreset[] = Object.values(FORMAT_PRESETS);

export function getFormatPreset(id: AspectRatio): FormatPreset {
  return FORMAT_PRESETS[id];
}

/** Returns the closest aspect ratio preset for an arbitrary format. */
export function aspectRatioOf(format: Pick<VideoFormat, 'width' | 'height'>): AspectRatio {
  const r = format.width / format.height;
  let best: AspectRatio = '16:9';
  let bestDiff = Infinity;
  for (const preset of FORMAT_PRESET_LIST) {
    const pr = preset.format.width / preset.format.height;
    const diff = Math.abs(pr - r);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = preset.id;
    }
  }
  return best;
}
