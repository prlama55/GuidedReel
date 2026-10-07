import type { Asset, AssetSource, AssetType, VideoProject } from '@guidedreel/schema';
import { sceneAssetIds } from '@guidedreel/schema';
import { createId } from './ids';

/**
 * Turns an abstract asset source into something a <Img>/<Video>/<Audio> tag can load
 * in the current environment. Implemented per host (browser, Electron, render server).
 */
export interface AssetResolver {
  resolve(asset: Asset): Promise<string>;
}

/** assetId → URL */
export type ResolvedAssetMap = Record<string, string>;

export async function resolveProjectAssets(
  project: VideoProject,
  resolver: AssetResolver,
): Promise<ResolvedAssetMap> {
  const entries = await Promise.all(
    project.assets.map(async (asset) => [asset.id, await resolver.resolve(asset)] as const),
  );
  return Object.fromEntries(entries);
}

/** A resolver for projects whose assets are all plain URLs (tests, remote-only projects). */
export const urlOnlyResolver: AssetResolver = {
  async resolve(asset) {
    if (asset.source.kind === 'url') return asset.source.url;
    throw new Error(
      `urlOnlyResolver cannot resolve asset "${asset.id}" with source kind "${asset.source.kind}"`,
    );
  },
};

/** Every asset id referenced anywhere in the project. */
export function referencedAssetIds(project: VideoProject): Set<string> {
  const ids = new Set<string>();
  for (const scene of project.scenes) for (const id of sceneAssetIds(scene)) ids.add(id);
  if (project.audio.musicAssetId) ids.add(project.audio.musicAssetId);
  if (project.brand?.logoAssetId) ids.add(project.brand.logoAssetId);
  if (project.brand?.watermark?.assetId) ids.add(project.brand.watermark.assetId);
  for (const font of project.brand?.fonts ?? []) if (font.assetId) ids.add(font.assetId);
  return ids;
}

/** Referenced ids that have no matching asset entry. */
export function missingAssetIds(project: VideoProject): string[] {
  const have = new Set(project.assets.map((a) => a.id));
  return [...referencedAssetIds(project)].filter((id) => !have.has(id));
}

/** How many places reference each asset. */
export function assetUsageCounts(project: VideoProject): Record<string, number> {
  const counts: Record<string, number> = {};
  const bump = (id: string | undefined) => {
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  };
  for (const scene of project.scenes) for (const id of sceneAssetIds(scene)) bump(id);
  bump(project.audio.musicAssetId);
  bump(project.brand?.logoAssetId);
  bump(project.brand?.watermark?.assetId);
  return counts;
}

export type CreateAssetOptions = {
  id?: string;
  type: AssetType;
  name: string;
  source: AssetSource;
  mimeType?: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  fontFamily?: string;
};

export function createAsset(options: CreateAssetOptions): Asset {
  return { id: options.id ?? createId('ast'), ...options };
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}
