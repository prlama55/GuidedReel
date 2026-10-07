import { createContext, useContext } from 'react';
import type { Asset, VideoProject } from '@guidedreel/schema';
import type { Timeline } from '@guidedreel/engine';
import type { Theme } from './theme';

export type AssetUrlMap = Record<string, string>;

export type CompositionContextValue = {
  project: VideoProject;
  assetUrls: AssetUrlMap;
  theme: Theme;
  timeline: Timeline;
};

export const CompositionContext = createContext<CompositionContextValue | null>(null);

export function useComposition(): CompositionContextValue {
  const ctx = useContext(CompositionContext);
  if (!ctx) throw new Error('useComposition must be used inside <VideoComposition>');
  return ctx;
}

export function useTheme(): Theme {
  return useComposition().theme;
}

/** Resolves an asset id to a loadable URL and its metadata. */
export function useAsset(assetId: string | undefined): {
  url: string | undefined;
  asset: Asset | undefined;
} {
  const { project, assetUrls } = useComposition();
  if (!assetId) return { url: undefined, asset: undefined };
  const asset = project.assets.find((a) => a.id === assetId);
  return { url: assetUrls[assetId], asset };
}
