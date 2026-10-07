import type { AssetType } from '@guidedreel/schema';

export type MediaMetadata = { duration?: number; width?: number; height?: number };

/**
 * Reads duration and dimensions of a media Blob in the browser using the
 * built-in media elements. Captured once at import time and stored on the
 * Asset so the engine never probes files.
 */
export async function readMediaMetadata(
  blob: Blob,
  type: AssetType,
  timeoutMs = 8000,
): Promise<MediaMetadata> {
  if (typeof document === 'undefined') return {};
  const url = URL.createObjectURL(blob);
  // Never let a media element that fires neither load nor error hang an import.
  const withTimeout = <T>(p: Promise<T>, fallback: T) =>
    Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), timeoutMs))]);
  try {
    if (type === 'image' || type === 'logo') {
      return await withTimeout(
        new Promise<MediaMetadata>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({});
          img.src = url;
        }),
        {},
      );
    }
    if (type === 'video' || type === 'audio' || type === 'voiceover' || type === 'music') {
      return await withTimeout(
        new Promise<MediaMetadata>((resolve) => {
          const el = document.createElement(type === 'video' ? 'video' : 'audio');
          el.preload = 'metadata';
          const done = (m: MediaMetadata) => {
            el.removeAttribute('src');
            el.load?.();
            resolve(m);
          };
          el.onloadedmetadata = () => {
            const duration = Number.isFinite(el.duration) ? el.duration : undefined;
            const v = el as HTMLVideoElement;
            done({
              duration,
              ...(type === 'video' ? { width: v.videoWidth, height: v.videoHeight } : {}),
            });
          };
          el.onerror = () => done({});
          el.src = url;
        }),
        {},
      );
    }
    return {};
  } finally {
    URL.revokeObjectURL(url);
  }
}
