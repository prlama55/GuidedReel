import type { SceneType, VideoFormat } from '@guidedreel/schema';

export type Size = { width: number; height: number };

export type FeatureLayout =
  'media-top' | 'media-bottom' | 'media-left' | 'media-right' | 'text-only';

/** Landscape frames turn stacked feature layouts into side-by-side ones so media stays large. */
export function resolveFeatureLayout(layout: FeatureLayout, format: Size): FeatureLayout {
  const landscape = format.width > format.height;
  if (layout === 'text-only') return layout;
  if (landscape && layout === 'media-top') return 'media-left';
  if (landscape && layout === 'media-bottom') return 'media-right';
  return layout;
}

/**
 * Pixel size of the primary media slot for a scene type in a given format.
 * Shared by the scene components (to size the slot) and the editor's crop
 * mode (to map pointer movement onto media offsets). Returns null when the
 * scene type has no framed media.
 */
export function mediaSlotSize(
  type: SceneType,
  props: Record<string, unknown>,
  format: Pick<VideoFormat, 'width' | 'height'>,
): Size | null {
  const { width, height } = format;
  switch (type) {
    case 'image':
    case 'video':
      return { width, height };
    case 'feature': {
      const layout = resolveFeatureLayout((props.layout as FeatureLayout) ?? 'media-top', format);
      if (layout === 'text-only') return null;
      const horizontal = layout === 'media-left' || layout === 'media-right';
      return horizontal
        ? { width: width * 0.42, height: height * 0.6 }
        : { width: width * 0.84, height: Math.min(height * 0.42, width * 0.84 * 0.75) };
    }
    case 'product': {
      const landscape = width > height;
      return landscape
        ? { width: width * 0.4, height: height * 0.66 }
        : { width: width * 0.78, height: Math.min(height * 0.4, width * 0.78) };
    }
    default:
      return null;
  }
}
