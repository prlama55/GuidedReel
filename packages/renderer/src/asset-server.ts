import http from 'node:http';
import fs from 'node:fs';
import { stat } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { createLogger, type Logger } from '@guidedreel/engine';
import { mimeFromPath } from './mime';

/**
 * Loopback HTTP server that exposes an explicit allowlist of local files to the
 * headless browser during a render. Supports Range requests so video seeking
 * works. Nothing outside the allowlist is reachable.
 */
export class LocalAssetServer {
  private server: http.Server | null = null;
  private files = new Map<string, string>();
  private baseUrl = '';
  private readonly log: Logger;

  constructor(logger?: Logger) {
    this.log = logger ?? createLogger('asset-server', { level: 'warn' });
  }

  /** Registers a file and returns its URL (valid once started). */
  add(id: string, filePath: string): string {
    const safeId = encodeURIComponent(id);
    this.files.set(safeId, filePath);
    return `${this.baseUrl}/${safeId}`;
  }

  get url(): string {
    return this.baseUrl;
  }

  async start(): Promise<string> {
    if (this.server) return this.baseUrl;
    this.server = http.createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(0, '127.0.0.1', () => resolve());
    });
    const { port } = this.server.address() as AddressInfo;
    this.baseUrl = `http://127.0.0.1:${port}`;
    this.log.debug('started', { url: this.baseUrl });
    return this.baseUrl;
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = null;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    server.closeAllConnections?.();
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const id = (req.url ?? '/').slice(1).split('?')[0] ?? '';
      const filePath = this.files.get(id);
      if (!filePath || (req.method !== 'GET' && req.method !== 'HEAD')) {
        res.writeHead(404).end();
        return;
      }
      const info = await stat(filePath);
      const total = info.size;
      const type = mimeFromPath(filePath);
      const range = req.headers.range;
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', type);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');

      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m?.[1] ? parseInt(m[1], 10) : 0;
        let end = m?.[2] ? parseInt(m[2], 10) : total - 1;
        if (Number.isNaN(start) || start >= total) {
          res.writeHead(416, { 'Content-Range': `bytes */${total}` }).end();
          return;
        }
        if (Number.isNaN(end) || end >= total) end = total - 1;
        if (end < start) [start, end] = [end, start];
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Content-Length': end - start + 1,
        });
        if (req.method === 'HEAD') return void res.end();
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, { 'Content-Length': total });
      if (req.method === 'HEAD') return void res.end();
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      this.log.warn('request failed', { url: req.url, error: String(err) });
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  }
}
