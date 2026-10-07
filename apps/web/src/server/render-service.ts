import path from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import type { Asset, RenderJob, RenderOptions, VideoProject } from '@guidedreel/core';
import { TERMINAL_RENDER_STATUSES } from '@guidedreel/core';
import {
  createId,
  createLogger,
  jsonSink,
  parseLogLevel,
  serializeError,
  type Logger,
} from '@guidedreel/core';
import { LocalRemotionRenderer } from '@guidedreel/core/render';
import { env } from './env';

type Entry = {
  job: RenderJob;
  project: VideoProject;
  assetPaths: Map<string, string>;
  controller: AbortController;
  dir: string;
};

/**
 * In-process render queue: the V1 web "worker". The job model and statuses are
 * the production shape; replacing this class with a pg-boss/Lambda-backed one
 * does not change the API routes or the UI.
 */
export class RenderService {
  private jobs = new Map<string, Entry>();
  private queue: string[] = [];
  private active = 0;
  private readonly renderer: LocalRemotionRenderer;
  private readonly log: Logger;

  constructor() {
    this.log = createLogger('render-service', {
      level: parseLogLevel(env.logLevel),
      sink: process.env.NODE_ENV === 'production' ? jsonSink : undefined,
    });
    this.renderer = new LocalRemotionRenderer({
      bundleDir: path.join(env.workDir, 'bundle'),
      outputDir: path.join(env.workDir, 'outputs'),
      locateAsset: async (asset: Asset) => {
        const entry = [...this.jobs.values()].find(
          (e) => e.assetPaths.has(asset.id) && !TERMINAL_RENDER_STATUSES.includes(e.job.status),
        );
        const p = entry?.assetPaths.get(asset.id);
        if (!p) throw new Error(`No uploaded file for asset "${asset.name}"`);
        return { path: p };
      },
      logger: this.log.child('remotion'),
    });
  }

  list(): RenderJob[] {
    return [...this.jobs.values()]
      .map((e) => e.job)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): RenderJob | undefined {
    return this.jobs.get(id)?.job;
  }

  outputPath(id: string): string | undefined {
    const e = this.jobs.get(id);
    return e?.job.status === 'completed' ? e.job.result?.outputPath : undefined;
  }

  async create(
    project: VideoProject,
    options: RenderOptions,
    uploads: { assetId: string; name: string; bytes: Uint8Array }[],
  ): Promise<RenderJob> {
    const id = createId('job');
    const dir = path.join(env.workDir, 'jobs', id);
    await mkdir(dir, { recursive: true });
    const assetPaths = new Map<string, string>();
    for (const u of uploads) {
      const safe = u.name.replace(/[^\w.-]+/g, '_').slice(-80) || 'asset';
      const filePath = path.join(dir, `${u.assetId}-${safe}`);
      await writeFile(filePath, u.bytes);
      assetPaths.set(u.assetId, filePath);
    }
    const job: RenderJob = {
      id,
      projectId: project.id,
      projectName: project.name,
      status: 'queued',
      progress: 0,
      options,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(id, { job, project, assetPaths, controller: new AbortController(), dir });
    this.queue.push(id);
    this.log.info('job queued', { id, project: project.id, assets: uploads.length });
    void this.pump();
    return job;
  }

  cancel(id: string): void {
    const e = this.jobs.get(id);
    if (!e || TERMINAL_RENDER_STATUSES.includes(e.job.status)) return;
    e.controller.abort();
    if (e.job.status === 'queued') {
      this.queue = this.queue.filter((q) => q !== id);
      this.update(id, { status: 'cancelled', finishedAt: new Date().toISOString() });
      void this.cleanup(e);
    }
  }

  async remove(id: string): Promise<void> {
    const e = this.jobs.get(id);
    if (!e) return;
    if (!TERMINAL_RENDER_STATUSES.includes(e.job.status)) this.cancel(id);
    this.jobs.delete(id);
    await this.cleanup(e);
    if (e.job.result?.outputPath)
      await rm(e.job.result.outputPath, { force: true }).catch(() => undefined);
  }

  private update(id: string, patch: Partial<RenderJob>): void {
    const e = this.jobs.get(id);
    if (e) e.job = { ...e.job, ...patch };
  }

  private async pump(): Promise<void> {
    while (this.active < env.concurrency && this.queue.length > 0) {
      const id = this.queue.shift()!;
      const e = this.jobs.get(id);
      if (!e) continue;
      this.active += 1;
      void this.run(e).finally(() => {
        this.active -= 1;
        void this.pump();
      });
    }
  }

  private async run(e: Entry): Promise<void> {
    const id = e.job.id;
    this.update(id, { status: 'preparing', startedAt: new Date().toISOString() });
    try {
      const result = await this.renderer.render(
        e.project,
        {
          ...e.job.options,
          outputPath: path.join(
            env.workDir,
            'outputs',
            `${id}.${e.job.options.codec === 'prores' ? 'mov' : e.job.options.codec.startsWith('vp') ? 'webm' : 'mp4'}`,
          ),
        },
        {
          signal: e.controller.signal,
          onProgress: (p) =>
            this.update(id, {
              status: p.status === 'completed' ? 'encoding' : p.status,
              progress: p.progress,
              renderedFrames: p.renderedFrames,
              totalFrames: p.totalFrames,
            }),
        },
      );
      this.update(id, {
        status: 'completed',
        progress: 1,
        finishedAt: new Date().toISOString(),
        result: { ...result, outputUrl: `/api/render/${id}/output` },
      });
      this.log.info('job completed', { id, ms: result.durationMs });
    } catch (err) {
      const s = serializeError(err);
      const cancelled = s.code === 'RENDER_CANCELLED' || e.controller.signal.aborted;
      this.update(id, {
        status: cancelled ? 'cancelled' : 'failed',
        finishedAt: new Date().toISOString(),
        error: { code: s.code, message: s.message },
      });
      this.log[cancelled ? 'info' : 'error']('job ended', { id, code: s.code, message: s.message });
    } finally {
      await this.cleanup(e);
    }
  }

  private async cleanup(e: Entry): Promise<void> {
    await rm(e.dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

// Survive Next.js dev HMR: keep one instance per process.
const g = globalThis as unknown as { __vcRenderService?: RenderService };
export function getRenderService(): RenderService {
  if (!g.__vcRenderService) g.__vcRenderService = new RenderService();
  return g.__vcRenderService;
}
