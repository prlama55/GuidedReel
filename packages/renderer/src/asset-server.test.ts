import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalAssetServer } from './asset-server';
import { sanitizeFileName } from './local-renderer';
import { estimateOutputBytes, freeDiskBytes } from './disk';

describe('LocalAssetServer', () => {
  const server = new LocalAssetServer();
  let filePath: string;
  let url: string;

  beforeAll(async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'vc-assets-'));
    filePath = path.join(dir, 'clip.mp4');
    await writeFile(filePath, Buffer.from('0123456789'));
    await server.start();
    url = server.add('a1', filePath);
  });
  afterAll(() => server.stop());

  it('serves allowlisted files with the right type', async () => {
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('video/mp4');
    expect(await res.text()).toBe('0123456789');
  });

  it('supports range requests', async () => {
    const res = await fetch(url, { headers: { Range: 'bytes=2-5' } });
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 2-5/10');
    expect(await res.text()).toBe('2345');
    const open = await fetch(url, { headers: { Range: 'bytes=7-' } });
    expect(await open.text()).toBe('789');
    const bad = await fetch(url, { headers: { Range: 'bytes=50-' } });
    expect(bad.status).toBe(416);
  });

  it('refuses anything not in the allowlist', async () => {
    const res = await fetch(`${server.url}/other`);
    expect(res.status).toBe(404);
    const traversal = await fetch(`${server.url}/..%2F..%2Fetc%2Fpasswd`);
    expect(traversal.status).toBe(404);
  });
});

describe('helpers', () => {
  it('sanitizes file names', () => {
    expect(sanitizeFileName('My: video/final?.mp4 ')).toBe('My videofinal.mp4');
  });
  it('estimates output size and reads free space', async () => {
    expect(estimateOutputBytes(300, 30, 1920, 1080)).toBeGreaterThan(200 * 1024 * 1024);
    const free = await freeDiskBytes(os.tmpdir());
    expect(free === null || free > 0).toBe(true);
  });
});
