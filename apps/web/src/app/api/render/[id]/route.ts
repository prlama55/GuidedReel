import { NextResponse, type NextRequest } from 'next/server';
import { getRenderService } from '@/server/render-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const job = getRenderService().get(id);
  if (!job)
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Job not found' } },
      { status: 404 },
    );
  return NextResponse.json(job);
}

/** Cancels a running job; with ?purge=1 also removes it and its output. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const service = getRenderService();
  if (!service.get(id))
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Job not found' } },
      { status: 404 },
    );
  if (req.nextUrl.searchParams.get('purge') === '1') await service.remove(id);
  else service.cancel(id);
  return NextResponse.json({ ok: true });
}
