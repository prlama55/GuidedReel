import type { Asset, AssetType, RenderJob, VideoFormat, VideoProject } from '@guidedreel/schema';

export type ProjectSummary = {
  id: string;
  name: string;
  templateId: string;
  format: VideoFormat;
  sceneCount: number;
  createdAt: string;
  updatedAt: string;
  /** Data URL or object URL of a poster frame, when available. */
  thumbnailUrl?: string;
};

/** Where project documents live (IndexedDB, filesystem, Postgres, ...). */
export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<VideoProject | null>;
  save(project: VideoProject): Promise<void>;
  delete(id: string): Promise<void>;
}

export type StoredAssetMeta = {
  key: string;
  name: string;
  type: AssetType;
  mimeType: string;
  size: number;
  createdAt: string;
};

/**
 * Where asset bytes live for `store`-kind sources. Browser: IndexedDB blobs.
 * Desktop: the app's data directory. Cloud: a bucket.
 */
export interface AssetStore {
  put(
    key: string,
    data: Blob,
    meta: Omit<StoredAssetMeta, 'key' | 'size' | 'createdAt'>,
  ): Promise<StoredAssetMeta>;
  get(key: string): Promise<Blob | null>;
  getMeta(key: string): Promise<StoredAssetMeta | null>;
  /** A URL usable by <img>/<video>/<audio> in the current environment. */
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  list(): Promise<StoredAssetMeta[]>;
}

/** Generic cloud/object storage contract (Supabase Storage, S3, ...). */
export interface StorageProvider {
  upload(
    key: string,
    data: Blob | Uint8Array,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ key: string }>;
  download(key: string): Promise<Blob>;
  delete(key: string): Promise<void>;
  getUrl(key: string, options?: { expiresInSeconds?: number }): Promise<string>;
}

export interface RenderJobRepository {
  list(): Promise<RenderJob[]>;
  get(id: string): Promise<RenderJob | null>;
  save(job: RenderJob): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Everything the editor needs from its host, bundled. */
export type StorageContext = {
  projects: ProjectRepository;
  assets: AssetStore;
  renderJobs?: RenderJobRepository;
};

export function summarizeProject(project: VideoProject, thumbnailUrl?: string): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    templateId: project.templateId,
    format: project.format,
    sceneCount: project.scenes.length,
    createdAt: project.metadata.createdAt,
    updatedAt: project.metadata.updatedAt,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
  };
}

export function assetFromStored(meta: StoredAssetMeta, extra: Partial<Asset> = {}): Asset {
  return {
    id: extra.id ?? meta.key,
    type: meta.type,
    name: meta.name,
    source: { kind: 'store', key: meta.key },
    mimeType: meta.mimeType,
    size: meta.size,
    ...extra,
  };
}
