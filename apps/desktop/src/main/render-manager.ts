import path from 'node:path';
import { app, utilityProcess, type UtilityProcess, type BrowserWindow } from 'electron';
import type {
  Asset,
  RenderJob,
  RenderOptions,
  RenderProgress,
  RenderResult,
  VideoProject,
} from '@guidedreel/core';
import { RenderOptionsSchema, TERMINAL_RENDER_STATUSES } from '@guidedreel/core';
import { createId, createLogger, type SerializedError } from '@guidedreel/core';
import type { FileAssetStore } from './storage';

const log = createLogger('desktop:render', { level: 'info' });

type WorkerMessage =
  | { type: 'progress'; progress: RenderProgress }
  | { type: 'done'; result: RenderResult }
  | { type: 'error'; error: SerializedError };

/** One utilityProcess per job; progress is forwarded to the window via `render:update`. */
export class RenderManager {
  private jobs = new Map<string, RenderJob>();
  private workers = new Map<string, UtilityProcess>();

  constructor(
    private readonly assets: FileAssetStore,
    private readonly getWindow: () => BrowserWindow | null,
  ) {}

  list(): RenderJob[] {
    return [...this.jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  get(id: string): RenderJob | null {
    return this.jobs.get(id) ?? null;
  }

  async start(
    project: VideoProject,
    optionsInput: Partial<RenderOptions>,
    outputPath?: string,
  ): Promise<RenderJob> {
    const options = RenderOptionsSchema.parse({
      ...optionsInput,
      outputPath: outputPath ?? optionsInput.outputPath,
    });
    const id = createId('job');
    const job: RenderJob = {
      id,
      projectId: project.id,
      projectName: project.name,
      status: 'queued',
      progress: 0,
      options,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(id, job);
    this.emit(job);

    const assetPaths: Record<string, string> = {};
    for (const asset of project.assets as Asset[]) {
      if (asset.source.kind === 'store')
        assetPaths[asset.id] = this.assets.pathFor(asset.source.key);
      if (asset.source.kind === 'local') assetPaths[asset.id] = asset.source.path;
    }

    // __dirname is out/main both in `electron-vite dev` and when launched with an explicit entry file,
    // so paths are resolved from it rather than from app.getAppPath() (which differs between the two).
    const isPackaged = app.isPackaged;
    const appRoot = path.resolve(__dirname, '../..');
    const prebuiltBundleDir = isPackaged
      ? path.join(process.resourcesPath, 'remotion-bundle')
      : undefined;
    const entryPoint = isPackaged
      ? undefined
      : path.resolve(appRoot, '../../packages/compositions/src/entry.tsx');
    const workerPath = path.join(__dirname, 'render-worker.js');
    const worker = utilityProcess.fork(workerPath, [], {
      serviceName: `render-${id}`,
      stdio: 'inherit',
    });
    this.workers.set(id, worker);

    const finalOptions: RenderOptions = {
      ...options,
      outputPath:
        options.outputPath ??
        path.join(
          app.getPath('videos'),
          `${sanitize(options.fileName ?? project.name)}.${ext(options.codec)}`,
        ),
    };

    worker.on('message', (raw: WorkerMessage) => {
      const current = this.jobs.get(id);
      if (!current) return;
      if (raw.type === 'progress') {
        this.update(id, {
          status: raw.progress.status === 'completed' ? 'encoding' : raw.progress.status,
          progress: raw.progress.progress,
          renderedFrames: raw.progress.renderedFrames,
          totalFrames: raw.progress.totalFrames,
          startedAt: current.startedAt ?? new Date().toISOString(),
        });
      } else if (raw.type === 'done') {
        this.update(id, {
          status: 'completed',
          progress: 1,
          result: raw.result,
          finishedAt: new Date().toISOString(),
        });
      } else if (raw.type === 'error') {
        this.update(id, {
          status: raw.error.code === 'RENDER_CANCELLED' ? 'cancelled' : 'failed',
          error: { code: raw.error.code, message: raw.error.message },
          finishedAt: new Date().toISOString(),
        });
      }
    });
    worker.on('exit', (code) => {
      this.workers.delete(id);
      const current = this.jobs.get(id);
      if (current && !TERMINAL_RENDER_STATUSES.includes(current.status)) {
        this.update(id, {
          status: 'failed',
          error: {
            code: 'RENDER_FAILED',
            message: `Render process exited unexpectedly (code ${code})`,
          },
          finishedAt: new Date().toISOString(),
        });
      }
    });
    worker.postMessage({
      type: 'start',
      project,
      options: finalOptions,
      assetPaths,
      bundleDir: path.join(app.getPath('userData'), 'remotion-bundle'),
      prebuiltBundleDir,
      entryPoint,
    });
    log.info('render started', { id, output: finalOptions.outputPath });
    return job;
  }

  cancel(id: string): void {
    const w = this.workers.get(id);
    const job = this.jobs.get(id);
    if (!job || TERMINAL_RENDER_STATUSES.includes(job.status)) return;
    if (w) w.postMessage({ type: 'cancel' });
    else this.update(id, { status: 'cancelled', finishedAt: new Date().toISOString() });
  }

  remove(id: string): void {
    this.cancel(id);
    this.jobs.delete(id);
  }

  private update(id: string, patch: Partial<RenderJob>) {
    const job = this.jobs.get(id);
    if (!job) return;
    const next = { ...job, ...patch };
    this.jobs.set(id, next);
    this.emit(next);
  }

  private emit(job: RenderJob) {
    const win = this.getWindow();
    if (win && !win.isDestroyed()) win.webContents.send('render:update', job);
  }
}

function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '').trim() || 'video';
}
function ext(codec: RenderOptions['codec']) {
  return codec === 'prores' ? 'mov' : codec.startsWith('vp') ? 'webm' : 'mp4';
}
