import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { NextResponse, type NextRequest } from 'next/server';
import { getRenderService } from '@/server/render-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = getRenderService();
  const job = service.get(id);
  const filePath = service.outputPath(id);
  if (!job || !filePath)
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Output not available' } },
      { status: 404 },
    );
  const info = await stat(filePath).catch(() => null);
  if (!info)
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Output file missing' } },
      { status: 404 },
    );
  const ext = path.extname(filePath);
  const name = `${(job.options.fileName ?? job.projectName).replace(/[^\w.-]+/g, '_')}${ext}`;
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Content-Length': String(info.size),
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
