import { useEffect, useMemo, useRef, useState } from 'react';
import type { Asset } from '@guidedreel/schema';
import type { AssetResolver } from '@guidedreel/engine';

/**
 * Resolves every project asset to a URL, caching per (assetId, source) so the
 * Player's inputProps stay referentially stable while editing text.
 */
export function useAssetUrls(
  assets: readonly Asset[],
  resolver: AssetResolver,
): Record<string, string> {
  const cache = useRef(new Map<string, { sig: string; url: string }>());
  const [version, setVersion] = useState(0);
  const signature = useMemo(
    () => assets.map((a) => `${a.id}:${JSON.stringify(a.source)}`).join('|'),
    [assets],
  );

  useEffect(() => {
    let cancelled = false;
    const missing = assets.filter((a) => cache.current.get(a.id)?.sig !== JSON.stringify(a.source));
    if (missing.length === 0) return;
    void Promise.all(
      missing.map(async (a) => {
        try {
          const url = await resolver.resolve(a);
          cache.current.set(a.id, { sig: JSON.stringify(a.source), url });
        } catch (err) {
          console.warn(`[assets] could not resolve "${a.name}"`, err);
        }
      }),
    ).then(() => {
      if (!cancelled) setVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [signature, assets, resolver]);

  return useMemo(() => {
    const out: Record<string, string> = {};
    for (const a of assets) {
      const hit = cache.current.get(a.id);
      if (hit) out[a.id] = hit.url;
    }
    return out;
    // version forces recompute after async resolution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, version]);
}
