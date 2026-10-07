import type {
  Asset,
  RenderOptions,
  RenderProgress,
  RenderResult,
  VideoProject,
} from '@guidedreel/schema';

export type RenderCallbacks = {
  onProgress?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
};

/**
 * The only rendering contract the apps depend on. Implementations:
 * LocalRemotionRenderer (desktop + web server), later CloudRemotionRenderer.
 */
export interface VideoRenderer {
  render(
    project: VideoProject,
    options: RenderOptions,
    callbacks?: RenderCallbacks,
  ): Promise<RenderResult>;
}

/**
 * Host-provided lookup for `store` and `cloud` asset sources. Return a local
 * file path (served by the loopback asset server) or a URL the headless
 * browser can fetch.
 */
export type HostAssetLocator = (asset: Asset) => Promise<{ path: string } | { url: string }>;
