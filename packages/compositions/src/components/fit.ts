import type { MediaFit } from '@guidedreel/schema';

export type ResolvedFit = 'cover' | 'contain';

/**
 * Decides how media fills a box. In `auto` mode the media covers the box when
 * its aspect ratio is within ~20% of the box ratio (a crop nobody notices);
 * otherwise it is shown whole, and the caller draws a blurred copy behind it so
 * there are never black bars. Unknown media dimensions fall back to `contain`.
 */
export function resolveFit(
  fit: MediaFit | undefined,
  media: { width?: number; height?: number } | undefined,
  box: { width: number; height: number },
  tolerance = 1.2,
): ResolvedFit {
  if (fit === 'cover' || fit === 'contain') return fit;
  if (!media?.width || !media?.height || box.width <= 0 || box.height <= 0) return 'contain';
  const mediaRatio = media.width / media.height;
  const boxRatio = box.width / box.height;
  const diff = Math.max(mediaRatio, boxRatio) / Math.min(mediaRatio, boxRatio);
  return diff <= tolerance ? 'cover' : 'contain';
}
