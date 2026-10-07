/**
 * Runs in an Electron utilityProcess so a long render never blocks the main
 * process. Receives one job over parentPort, streams progress back, exits.
 */
import type { RenderOptions, VideoProject } from '@guidedreel/schema';
import { serializeError, createLogger } from '@guidedreel/engine';
import { LocalRemotionRenderer } from '@guidedreel/renderer';

type StartMessage = {
  type: 'start';
  project: VideoProject;
  options: RenderOptions;
  assetPaths: Record<string, string>;
  bundleDir: string;
  prebuiltBundleDir?: string;
  entryPoint?: string;
  browserExecutable?: string;
};
type CancelMessage = { type: 'cancel' };

const port = process.parentPort;
const log = createLogger('render-worker', { level: 'info' });
const controller = new AbortController();

port.on('message', (e: { data: StartMessage | CancelMessage }) => {
  const msg = e.data;
  if (msg.type === 'cancel') {
    controller.abort();
    return;
  }
  if (msg.type === 'start') void run(msg);
});

async function run(msg: StartMessage) {
  const renderer = new LocalRemotionRenderer({
    bundleDir: msg.bundleDir,
    prebuiltBundleDir: msg.prebuiltBundleDir,
    entryPoint: msg.entryPoint,
    browserExecutable: msg.browserExecutable,
    locateAsset: async (asset) => {
      const p = msg.assetPaths[asset.id];
      if (!p) throw new Error(`No local file for asset "${asset.name}"`);
      return { path: p };
    },
    logger: log,
    onBundleProgress: (percent) =>
      port.postMessage({
        type: 'progress',
        progress: {
          status: 'preparing',
          progress: 0.01 * Math.min(1, percent / 100),
          message: `Preparing renderer ${percent}%`,
        },
      }),
  });
  try {
    const result = await renderer.render(msg.project, msg.options, {
      signal: controller.signal,
      onProgress: (progress) => port.postMessage({ type: 'progress', progress }),
    });
    port.postMessage({ type: 'done', result });
  } catch (err) {
    port.postMessage({ type: 'error', error: serializeError(err) });
  } finally {
    setTimeout(() => process.exit(0), 50);
  }
}
