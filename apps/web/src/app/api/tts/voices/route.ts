import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createCloudTtsProvider } from '@guidedreel/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  provider: z.enum(['openai', 'elevenlabs', 'google']),
  apiKey: z.string().min(1, 'Add your API key in Settings'),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: parsed.error.issues[0]?.message ?? 'Invalid request',
        },
      },
      { status: 400 },
    );
  try {
    const voices = await createCloudTtsProvider(
      parsed.data.provider,
      parsed.data.apiKey,
    ).listVoices();
    return NextResponse.json(voices, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: { code: 'TTS_FAILED', message } },
      { status: /401|403/.test(message) ? 401 : 502 },
    );
  }
}
