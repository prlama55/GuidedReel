import type { RenderJob, RenderOptionsInput, VideoProject } from '@guidedreel/schema';
import type { AssetStore } from '@guidedreel/storage';
import { pollingSubscribe, type RenderClient } from '@guidedreel/ui';

/**
 * Talks to /api/render. Assets stored in the browser are uploaded with the
 * request so the server can render them; URL assets are fetched by the renderer.
 */
export class HttpRenderClient implements RenderClient {
  readonly subscribe: RenderClient['subscribe'];

  constructor(private readonly assets: AssetStore) {
    this.subscribe = pollingSubscribe((id) => this.get(id), 750);
  }

  async start(project: VideoProject, options: RenderOptionsInput): Promise<RenderJob> {
    const form = new FormData();
    form.set('project', JSON.stringify(project));
    form.set('options', JSON.stringify(options));
    for (const asset of project.assets) {
      if (asset.source.kind === 'store') {
        const blob = await this.assets.get(asset.source.key);
        if (!blob) throw new Error(`Asset "${asset.name}" is missing from local storage`);
        form.append(`asset:${asset.id}`, blob, asset.name);
      }
      if (asset.source.kind === 'local')
        throw new Error(
          `Asset "${asset.name}" references a local file path, which the web app cannot upload`,
        );
    }
    const res = await fetch('/api/render', { method: 'POST', body: form });
    if (!res.ok)
      throw new Error(
        (await safeJson(res))?.error?.message ?? `Render request failed (${res.status})`,
      );
    return (await res.json()) as RenderJob;
  }

  async get(jobId: string): Promise<RenderJob | null> {
    const res = await fetch(`/api/render/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load job (${res.status})`);
    return (await res.json()) as RenderJob;
  }

  async list(): Promise<RenderJob[]> {
    const res = await fetch('/api/render', { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as RenderJob[];
  }

  async cancel(jobId: string): Promise<void> {
    await fetch(`/api/render/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
  }

  async remove(jobId: string): Promise<void> {
    await fetch(`/api/render/${encodeURIComponent(jobId)}?purge=1`, { method: 'DELETE' });
  }

  async openOutput(job: RenderJob): Promise<void> {
    if (!job.result?.outputUrl) return;
    const a = document.createElement('a');
    a.href = job.result.outputUrl;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

async function safeJson(res: Response): Promise<{ error?: { message?: string } } | null> {
  try {
    return (await res.json()) as { error?: { message?: string } };
  } catch {
    return null;
  }
}
