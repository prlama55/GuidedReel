import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { RenderJob, VideoProject } from '@guidedreel/schema';
import { parseProjectDocument } from '@guidedreel/schema';
import type { AssetStore, ProjectRepository, RenderJobRepository, StoredAssetMeta } from '../types';
import { summarizeProject } from '../types';

interface VideoCreatorDB extends DBSchema {
  projects: {
    key: string;
    value: { id: string; updatedAt: string; doc: unknown };
    indexes: { byUpdated: string };
  };
  // Bytes are stored as ArrayBuffer (not Blob) for cross-browser reliability.
  assets: { key: string; value: { meta: StoredAssetMeta; bytes: ArrayBuffer } };
  renderJobs: { key: string; value: RenderJob; indexes: { byCreated: string } };
}

const DB_NAME = 'guidedreel';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<VideoCreatorDB>> | null = null;

export function openVideoCreatorDB(): Promise<IDBPDatabase<VideoCreatorDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VideoCreatorDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const projects = db.createObjectStore('projects', { keyPath: 'id' });
        projects.createIndex('byUpdated', 'updatedAt');
        db.createObjectStore('assets', { keyPath: 'meta.key' });
        const jobs = db.createObjectStore('renderJobs', { keyPath: 'id' });
        jobs.createIndex('byCreated', 'createdAt');
      },
    });
  }
  return dbPromise;
}

/** Local-first project storage in the browser. */
export class IndexedDBProjectRepository implements ProjectRepository {
  async list() {
    const db = await openVideoCreatorDB();
    const rows = await db.getAll('projects');
    const summaries = rows
      .map((row) => {
        const parsed = parseProjectDocument(row.doc);
        return parsed.success ? summarizeProject(parsed.data) : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id: string) {
    const db = await openVideoCreatorDB();
    const row = await db.get('projects', id);
    if (!row) return null;
    const parsed = parseProjectDocument(row.doc);
    if (!parsed.success)
      throw new Error(
        `Stored project "${id}" is invalid: ${parsed.issues[0]?.message ?? 'unknown'}`,
      );
    return parsed.data;
  }
  async save(project: VideoProject) {
    const db = await openVideoCreatorDB();
    await db.put('projects', {
      id: project.id,
      updatedAt: project.metadata.updatedAt,
      doc: project,
    });
  }
  async delete(id: string) {
    const db = await openVideoCreatorDB();
    await db.delete('projects', id);
  }
}

/** Asset bytes as Blobs in IndexedDB; URLs are object URLs cached per session. */
export class IndexedDBAssetStore implements AssetStore {
  private urls = new Map<string, string>();
  async put(key: string, data: Blob, meta: Omit<StoredAssetMeta, 'key' | 'size' | 'createdAt'>) {
    const db = await openVideoCreatorDB();
    const full: StoredAssetMeta = {
      ...meta,
      key,
      size: data.size,
      createdAt: new Date().toISOString(),
    };
    await db.put('assets', { meta: full, bytes: await data.arrayBuffer() });
    this.revoke(key);
    return full;
  }
  async get(key: string) {
    const db = await openVideoCreatorDB();
    const row = await db.get('assets', key);
    return row ? new Blob([row.bytes], { type: row.meta.mimeType }) : null;
  }
  async getMeta(key: string) {
    const db = await openVideoCreatorDB();
    return (await db.get('assets', key))?.meta ?? null;
  }
  async getUrl(key: string) {
    const cached = this.urls.get(key);
    if (cached) return cached;
    const blob = await this.get(key);
    if (!blob) throw new Error(`Asset "${key}" not found`);
    const url = URL.createObjectURL(blob);
    this.urls.set(key, url);
    return url;
  }
  async delete(key: string) {
    const db = await openVideoCreatorDB();
    await db.delete('assets', key);
    this.revoke(key);
  }
  async list() {
    const db = await openVideoCreatorDB();
    return (await db.getAll('assets')).map((r) => r.meta);
  }
  private revoke(key: string) {
    const url = this.urls.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      this.urls.delete(key);
    }
  }
}

export class IndexedDBRenderJobRepository implements RenderJobRepository {
  async list() {
    const db = await openVideoCreatorDB();
    return (await db.getAll('renderJobs')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async get(id: string) {
    const db = await openVideoCreatorDB();
    return (await db.get('renderJobs', id)) ?? null;
  }
  async save(job: RenderJob) {
    const db = await openVideoCreatorDB();
    await db.put('renderJobs', job);
  }
  async delete(id: string) {
    const db = await openVideoCreatorDB();
    await db.delete('renderJobs', id);
  }
}
