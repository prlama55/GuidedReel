import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { net, protocol } from 'electron';
import { mimeFromPath } from '@guidedreel/renderer';
import { ASSET_PROTOCOL } from '../shared/ipc';
import type { FileAssetStore } from './storage';

/**
 * vc-asset://store/<key>        → file in the app's asset store
 * vc-asset://local/<encoded>    → a user-picked local file (allowlisted only)
 * Streams with Range support so <video> seeking works in the renderer.
 */
export class AssetProtocol {
  private allowedLocal = new Set<string>();

  constructor(private readonly store: FileAssetStore) {}

  static registerScheme(): void {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: ASSET_PROTOCOL,
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true,
          stream: true,
          corsEnabled: true,
        },
      },
    ]);
  }

  allowLocal(paths: string[]): void {
    for (const p of paths) this.allowedLocal.add(path.resolve(p));
  }

  urlForStore(key: string): string {
    return `${ASSET_PROTOCOL}://store/${encodeURIComponent(key)}`;
  }

  urlForLocal(filePath: string): string {
    return `${ASSET_PROTOCOL}://local/${encodeURIComponent(path.resolve(filePath))}`;
  }

  install(): void {
    protocol.handle(ASSET_PROTOCOL, async (request) => {
      try {
        const url = new URL(request.url);
        const kind = url.hostname;
        const id = decodeURIComponent(url.pathname.replace(/^\//, ''));
        let filePath: string | null = null;
        if (kind === 'store') filePath = this.store.pathFor(id);
        else if (kind === 'local') {
          const resolved = path.resolve(id);
          if (this.allowedLocal.has(resolved)) filePath = resolved;
        }
        if (!filePath) return new Response('Not found', { status: 404 });
        const info = await stat(filePath).catch(() => null);
        if (!info?.isFile()) return new Response('Not found', { status: 404 });

        const headers: Record<string, string> = {
          'Content-Type': mimeFromPath(filePath),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store',
        };
        const range = request.headers.get('range');
        if (range) {
          const m = /bytes=(\d*)-(\d*)/.exec(range);
          let start = m?.[1] ? parseInt(m[1], 10) : 0;
          let end = m?.[2] ? parseInt(m[2], 10) : info.size - 1;
          if (Number.isNaN(start) || start >= info.size)
            return new Response(null, {
              status: 416,
              headers: { 'Content-Range': `bytes */${info.size}` },
            });
          if (Number.isNaN(end) || end >= info.size) end = info.size - 1;
          if (end < start) [start, end] = [end, start];
          headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
          headers['Content-Length'] = String(end - start + 1);
          return new Response(
            Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream,
            { status: 206, headers },
          );
        }
        headers['Content-Length'] = String(info.size);
        return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
          status: 200,
          headers,
        });
      } catch {
        return new Response('Error', { status: 500 });
      }
    });
    // Keep `net` referenced for environments that need it for fetch fallbacks.
    void net;
  }
}
