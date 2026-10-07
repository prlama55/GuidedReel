import type { RenderJob, VideoProject } from '@guidedreel/schema';
import type {
  AssetStore,
  ProjectRepository,
  RenderJobRepository,
  StorageProvider,
  StoredAssetMeta,
} from '../types';
import { summarizeProject } from '../types';

/** In-memory implementations for tests and server-side ephemeral state. */

export class MemoryProjectRepository implements ProjectRepository {
  private items = new Map<string, VideoProject>();
  async list() {
    return [...this.items.values()]
      .map((p) => summarizeProject(p))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id: string) {
    return this.items.get(id) ?? null;
  }
  async save(project: VideoProject) {
    this.items.set(project.id, structuredClone(project));
  }
  async delete(id: string) {
    this.items.delete(id);
  }
}

/** Object URL in browsers; an opaque placeholder elsewhere. */
function defaultObjectUrl(blob: Blob): string {
  const u =
    typeof URL !== 'undefined'
      ? (URL as unknown as { createObjectURL?: (b: Blob) => string })
      : undefined;
  return u?.createObjectURL ? u.createObjectURL(blob) : `memory://${blob.size}`;
}

export class MemoryAssetStore implements AssetStore {
  private blobs = new Map<string, { blob: Blob; meta: StoredAssetMeta }>();
  private urls = new Map<string, string>();
  constructor(private readonly createUrl: (blob: Blob) => string = defaultObjectUrl) {}
  async put(key: string, data: Blob, meta: Omit<StoredAssetMeta, 'key' | 'size' | 'createdAt'>) {
    const full: StoredAssetMeta = {
      ...meta,
      key,
      size: data.size,
      createdAt: new Date().toISOString(),
    };
    this.blobs.set(key, { blob: data, meta: full });
    return full;
  }
  async get(key: string) {
    return this.blobs.get(key)?.blob ?? null;
  }
  async getMeta(key: string) {
    return this.blobs.get(key)?.meta ?? null;
  }
  async getUrl(key: string) {
    const cached = this.urls.get(key);
    if (cached) return cached;
    const entry = this.blobs.get(key);
    if (!entry) throw new Error(`Asset "${key}" not found`);
    const url = this.createUrl(entry.blob);
    this.urls.set(key, url);
    return url;
  }
  async delete(key: string) {
    this.blobs.delete(key);
    this.urls.delete(key);
  }
  async list() {
    return [...this.blobs.values()].map((e) => e.meta);
  }
}

export class MemoryStorageProvider implements StorageProvider {
  private objects = new Map<string, Blob>();
  async upload(key: string, data: Blob | Uint8Array, options?: { contentType?: string }) {
    const blob =
      data instanceof Blob ? data : new Blob([data as BlobPart], { type: options?.contentType });
    this.objects.set(key, blob);
    return { key };
  }
  async download(key: string) {
    const b = this.objects.get(key);
    if (!b) throw new Error(`Object "${key}" not found`);
    return b;
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
  async getUrl(key: string) {
    return `memory://${key}`;
  }
}

export class MemoryRenderJobRepository implements RenderJobRepository {
  private jobs = new Map<string, RenderJob>();
  async list() {
    return [...this.jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async get(id: string) {
    return this.jobs.get(id) ?? null;
  }
  async save(job: RenderJob) {
    this.jobs.set(job.id, structuredClone(job));
  }
  async delete(id: string) {
    this.jobs.delete(id);
  }
}
