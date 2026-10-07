import { useEffect } from 'react';
import { continueRender, delayRender } from 'remotion';
import { loadFont } from '@remotion/fonts';
import type { VideoProject } from '@guidedreel/schema';
import type { AssetUrlMap } from './context';

/**
 * Loads brand fonts that reference uploaded font assets before the first frame
 * renders. System/web fonts without an asset need no loading.
 */
export function useProjectFonts(project: VideoProject, assetUrls: AssetUrlMap): void {
  const fonts = project.brand?.fonts ?? [];
  const key = fonts
    .map((f) => `${f.family}:${f.assetId ?? ''}:${f.weight}:${assetUrls[f.assetId ?? ''] ?? ''}`)
    .join('|');

  useEffect(() => {
    const jobs = fonts
      .filter((f) => f.assetId && assetUrls[f.assetId])
      .map((f) => ({ family: f.family, url: assetUrls[f.assetId!]!, weight: String(f.weight) }));
    if (jobs.length === 0) return;
    const handle = delayRender('Loading brand fonts');
    let cancelled = false;
    Promise.all(jobs.map((j) => loadFont({ family: j.family, url: j.url, weight: j.weight })))
      .catch((err) => {
        // A missing font must not block the render; the fallback stack is used.
        console.warn('[compositions] font load failed, using fallback', err);
      })
      .finally(() => {
        if (!cancelled) continueRender(handle);
      });
    return () => {
      cancelled = true;
      continueRender(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
