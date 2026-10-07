import type { Asset } from '@guidedreel/schema';
import type { AssetResolver } from '@guidedreel/engine';
import type { AssetStore } from './types';

/**
 * AssetResolver for hosts that keep `store` assets in an AssetStore and can
 * load `url` assets directly. `local` and `cloud` go through optional hooks
 * (desktop maps local paths to a custom protocol; web signs cloud URLs).
 */
export function createStoreAssetResolver(
  store: AssetStore,
  hooks: {
    local?: (path: string, asset: Asset) => Promise<string> | string;
    cloud?: (asset: Asset) => Promise<string> | string;
  } = {},
): AssetResolver {
  return {
    async resolve(asset) {
      const src = asset.source;
      switch (src.kind) {
        case 'url':
          return src.url;
        case 'store':
          return store.getUrl(src.key);
        case 'local':
          if (!hooks.local)
            throw new Error(`Local file assets are not available here ("${asset.name}")`);
          return hooks.local(src.path, asset);
        case 'cloud':
          if (!hooks.cloud) throw new Error(`Cloud assets are not configured ("${asset.name}")`);
          return hooks.cloud(asset);
      }
    },
  };
}
