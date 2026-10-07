import type { Asset } from '@guidedreel/schema';
import { getSceneDefinition, type VideoScene } from '@guidedreel/schema';
import { useHost } from '../host/HostContext';
import { useAssetUrls } from '../hooks/useAssetUrls';
import { useEditorStore } from '../store/editor-store';
import { ASSET_ICONS } from '../primitives/icons';
import { cn } from '../lib/cn';

/** Thumbnail for an asset: image/logo as <img>, video poster via <video>, icon otherwise. */
export const AssetThumb: React.FC<{
  asset: Asset;
  url?: string;
  className?: string;
  fit?: 'contain' | 'cover';
}> = ({ asset, url, className, fit = 'contain' }) => {
  const Icon = ASSET_ICONS[asset.type];
  const isVisual = asset.type === 'image' || asset.type === 'logo' || asset.type === 'video';
  const media = fit === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain';
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded bg-surface-3 text-fg-subtle',
        className,
      )}
    >
      {url && isVisual ? (
        asset.type === 'video' ? (
          <video src={url} muted preload="metadata" className={media} />
        ) : (
          <img src={url} alt="" className={media} />
        )
      ) : (
        <Icon className="h-5 w-5" />
      )}
    </div>
  );
};

/**
 * Thumbnail of a project asset by id, resolved through the host's asset resolver.
 * Renders the fallback (or nothing) when the id is empty or unknown.
 */
export const AssetPreview: React.FC<{
  assetId?: string;
  className?: string;
  fit?: 'contain' | 'cover';
  fallback?: React.ReactNode;
}> = ({ assetId, className, fit, fallback = null }) => {
  const { assetResolver } = useHost();
  const assets = useEditorStore((s) => s.project?.assets ?? EMPTY);
  const urls = useAssetUrls(assets, assetResolver);
  const asset = assetId ? assets.find((a) => a.id === assetId) : undefined;
  if (!asset) return <>{fallback}</>;
  return <AssetThumb asset={asset} url={urls[asset.id]} className={className} fit={fit} />;
};
const EMPTY: Asset[] = [];

/** The asset id a scene's thumbnail should show: its framed media, else its background media. */
export function scenePreviewAssetId(scene: VideoScene): string | undefined {
  const def = getSceneDefinition(scene.type);
  const primary = def.mediaKey ? scene.props[def.mediaKey] : undefined;
  if (typeof primary === 'string' && primary) return primary;
  const bg = scene.props.backgroundAssetId;
  return typeof bg === 'string' && bg ? bg : undefined;
}
