import path from 'node:path';
import os from 'node:os';
import { mkdir, stat } from 'node:fs/promises';
import {
  ensureBrowser,
  makeCancelSignal,
  renderMedia,
  selectComposition,
  type LogLevel,
} from '@remotion/renderer';
import type {
  Asset,
  RenderOptions,
  RenderProgress,
  RenderResult,
  VideoProject,
} from '@guidedreel/schema';
import { QUALITY_PRESETS, RenderOptionsSchema, validateProject } from '@guidedreel/schema';
import {
  VideoCreatorError,
  createLogger,
  missingAssetIds,
  toVideoCreatorError,
  type Logger,
} from '@guidedreel/engine';
// React-free subpath: the renderer runs in server bundles where React component modules are not allowed.
import { COMPOSITION_ID, computeCompositionMetadata } from '@guidedreel/compositions/metadata';
import type { HostAssetLocator, RenderCallbacks, VideoRenderer } from './types';
import { LocalAssetServer } from './asset-server';
import { ensureBundle } from './bundle';
import { assertDiskSpace, estimateOutputBytes } from './disk';

export type LocalRemotionRendererOptions = {
  /** Where to cache the dev bundle. */
  bundleDir?: string;
  /** Prebuilt bundle directory (production). */
  prebuiltBundleDir?: string;
  /** Explicit compositions entry file (hosts that cannot resolve the package, e.g. a bundled Electron main). */
  entryPoint?: string;
  /** Default output directory when options.outputPath is omitted. */
  outputDir?: string;
  /** Resolves `store` / `cloud` assets to a path or URL. Required if the project uses them. */
  locateAsset?: HostAssetLocator;
  /** Path to a Chromium binary; omitted → Remotion downloads its headless shell. */
  browserExecutable?: string;
  logger?: Logger;
  logLevel?: LogLevel;
  onBundleProgress?: (percent: number) => void;
};

const EXT: Record<RenderOptions['codec'], string> = {
  h264: 'mp4',
  h265: 'mp4',
  vp8: 'webm',
  vp9: 'webm',
  prores: 'mov',
};

/**
 * Renders with @remotion/renderer on the local machine. Used by the Electron
 * main process (via a child process) and by the web server's render worker.
 */
export class LocalRemotionRenderer implements VideoRenderer {
  private readonly log: Logger;

  constructor(private readonly opts: LocalRemotionRendererOptions = {}) {
    this.log = opts.logger ?? createLogger('renderer', { level: 'info' });
  }

  async prepare(): Promise<string> {
    await ensureBrowser();
    return ensureBundle({
      outDir: this.opts.bundleDir ?? path.join(os.tmpdir(), 'guidedreel', 'remotion-bundle'),
      prebuiltDir: this.opts.prebuiltBundleDir,
      entryPoint: this.opts.entryPoint,
      onProgress: this.opts.onBundleProgress,
      logger: this.log.child('bundle'),
    });
  }

  async render(
    projectInput: VideoProject,
    optionsInput: RenderOptions,
    callbacks: RenderCallbacks = {},
  ): Promise<RenderResult> {
    const started = Date.now();
    const report = (p: RenderProgress) => callbacks.onProgress?.(p);
    const validation = validateProject(projectInput);
    if (!validation.success) {
      throw new VideoCreatorError('VALIDATION_FAILED', 'Project is not valid', {
        details: { issues: validation.issues },
      });
    }
    const project = validation.data;
    const options = RenderOptionsSchema.parse(optionsInput);
    const missing = missingAssetIds(project);
    if (missing.length > 0) {
      throw new VideoCreatorError(
        'MISSING_ASSET',
        `Project references ${missing.length} missing asset(s)`,
        { details: { missing } },
      );
    }
    if (callbacks.signal?.aborted)
      throw new VideoCreatorError('RENDER_CANCELLED', 'Render was cancelled');

    report({ status: 'preparing', progress: 0, message: 'Preparing renderer' });
    const serveUrl = await this.prepare();

    const metadata = computeCompositionMetadata(project);
    const preset = QUALITY_PRESETS[options.quality];
    const scale = options.scale !== 1 ? options.scale : preset.scale;
    const crf = options.crf ?? preset.crf;

    const outputDir = this.opts.outputDir ?? path.join(os.tmpdir(), 'guidedreel', 'renders');
    const fileName = sanitizeFileName(options.fileName ?? project.name) || 'video';
    const outputPath =
      options.outputPath ??
      path.join(/* turbopackIgnore: true */ outputDir, `${fileName}.${EXT[options.codec]}`);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await assertDiskSpace(
      outputPath,
      estimateOutputBytes(
        metadata.durationInFrames,
        metadata.fps,
        metadata.width * scale,
        metadata.height * scale,
      ),
    );

    const assetServer = new LocalAssetServer(this.log.child('assets'));
    const { cancelSignal, cancel } = makeCancelSignal();
    const onAbort = () => cancel();
    callbacks.signal?.addEventListener('abort', onAbort, { once: true });

    try {
      await assetServer.start();
      const assetUrls = await this.resolveAssets(project.assets, assetServer);
      const inputProps = { project, assetUrls };

      report({
        status: 'preparing',
        progress: 0.02,
        message: 'Opening composition',
        totalFrames: metadata.durationInFrames,
      });
      const composition = await selectComposition({
        serveUrl,
        id: COMPOSITION_ID,
        inputProps,
        logLevel: this.opts.logLevel ?? 'warn',
        ...(this.opts.browserExecutable ? { browserExecutable: this.opts.browserExecutable } : {}),
      });

      let lastStatus: RenderProgress['status'] = 'rendering';
      await renderMedia({
        composition,
        serveUrl,
        codec: options.codec,
        outputLocation: outputPath,
        inputProps,
        crf: options.codec === 'prores' ? undefined : crf,
        scale,
        muted: options.muted,
        concurrency: options.concurrency ?? null,
        cancelSignal,
        logLevel: this.opts.logLevel ?? 'warn',
        overwrite: true,
        ...(this.opts.browserExecutable ? { browserExecutable: this.opts.browserExecutable } : {}),
        onProgress: ({ progress, renderedFrames, encodedFrames, stitchStage }) => {
          const total = composition.durationInFrames;
          const status: RenderProgress['status'] =
            stitchStage === 'muxing' || (renderedFrames >= total && encodedFrames < total)
              ? 'encoding'
              : 'rendering';
          lastStatus = status;
          report({
            status,
            progress: Math.min(0.99, 0.02 + progress * 0.97),
            renderedFrames,
            totalFrames: total,
            message:
              status === 'encoding'
                ? `Encoding ${encodedFrames}/${total}`
                : `Rendering ${renderedFrames}/${total}`,
          });
        },
      });
      void lastStatus;

      const info = await stat(/* turbopackIgnore: true */ outputPath);
      const result: RenderResult = {
        outputPath,
        sizeBytes: info.size,
        durationMs: Date.now() - started,
        totalFrames: composition.durationInFrames,
      };
      report({
        status: 'completed',
        progress: 1,
        renderedFrames: composition.durationInFrames,
        totalFrames: composition.durationInFrames,
        message: 'Done',
      });
      this.log.info('render complete', { outputPath, sizeBytes: info.size, ms: result.durationMs });
      return result;
    } catch (err) {
      if (callbacks.signal?.aborted)
        throw new VideoCreatorError('RENDER_CANCELLED', 'Render was cancelled', { cause: err });
      const wrapped = toVideoCreatorError(err, 'RENDER_FAILED');
      this.log.error('render failed', { code: wrapped.code, message: wrapped.message });
      throw wrapped;
    } finally {
      callbacks.signal?.removeEventListener('abort', onAbort);
      await assetServer.stop();
    }
  }

  private async resolveAssets(
    assets: Asset[],
    server: LocalAssetServer,
  ): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const asset of assets) {
      const src = asset.source;
      if (src.kind === 'url') {
        out[asset.id] = src.url;
      } else if (src.kind === 'local') {
        await assertReadable(src.path, asset);
        out[asset.id] = server.add(asset.id, src.path);
      } else {
        if (!this.opts.locateAsset) {
          throw new VideoCreatorError(
            'MISSING_ASSET',
            `No asset locator configured for "${asset.name}" (${src.kind})`,
            { details: { assetId: asset.id } },
          );
        }
        const located = await this.opts.locateAsset(asset);
        if ('url' in located) out[asset.id] = located.url;
        else {
          await assertReadable(located.path, asset);
          out[asset.id] = server.add(asset.id, located.path);
        }
      }
    }
    return out;
  }
}

async function assertReadable(filePath: string, asset: Asset): Promise<void> {
  try {
    const s = await stat(filePath);
    if (!s.isFile()) throw new Error('not a file');
  } catch (err) {
    throw new VideoCreatorError('MISSING_ASSET', `Asset file for "${asset.name}" was not found`, {
      details: { assetId: asset.id, path: filePath },
      cause: err,
    });
  }
}

/* eslint-disable no-control-regex */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}
/* eslint-enable no-control-regex */
