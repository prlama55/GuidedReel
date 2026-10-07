import { describe, expect, it } from 'vitest';
import { createProject, createScene, touchProject } from '@guidedreel/engine';
import { IndexedDBAssetStore, IndexedDBProjectRepository } from './browser/indexeddb';
import { MemoryAssetStore, MemoryProjectRepository } from './memory/index';
import { createStoreAssetResolver } from './resolver';
import { assetFromStored } from './types';

const sample = () =>
  createProject({ id: 'p1', name: 'One', templateId: 'blank', scenes: [createScene('text', 30)] });

describe.each([
  ['memory', () => new MemoryProjectRepository()],
  ['indexeddb', () => new IndexedDBProjectRepository()],
])('%s ProjectRepository', (_name, make) => {
  it('saves, lists, gets and deletes', async () => {
    const repo = make();
    const p = sample();
    await repo.save(p);
    const later = touchProject({ ...p, id: 'p2', name: 'Two' });
    await repo.save(later);
    const list = await repo.list();
    expect(list.map((s) => s.id)).toEqual(['p2', 'p1']);
    expect(list[0]?.sceneCount).toBe(1);
    expect(await repo.get('p1')).toEqual(p);
    await repo.delete('p1');
    expect(await repo.get('p1')).toBeNull();
    await repo.delete('p2');
  });
});

describe.each([
  ['memory', () => new MemoryAssetStore(() => 'blob:memory')],
  ['indexeddb', () => new IndexedDBAssetStore()],
])('%s AssetStore', (_name, make) => {
  it('stores blobs with metadata and builds assets', async () => {
    const store = make();
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const meta = await store.put('k1', blob, {
      name: 'hello.txt',
      type: 'image',
      mimeType: 'text/plain',
    });
    expect(meta.size).toBe(5);
    expect((await store.getMeta('k1'))?.name).toBe('hello.txt');
    expect((await store.get('k1'))!.size).toBe(5);
    expect((await store.list()).length).toBe(1);
    const asset = assetFromStored(meta);
    expect(asset.source).toEqual({ kind: 'store', key: 'k1' });
    const resolver = createStoreAssetResolver(store);
    expect(typeof (await resolver.resolve(asset))).toBe('string');
    await expect(
      resolver.resolve({ ...asset, source: { kind: 'local', path: '/x' } }),
    ).rejects.toThrow();
    await store.delete('k1');
    expect(await store.get('k1')).toBeNull();
  });
});
