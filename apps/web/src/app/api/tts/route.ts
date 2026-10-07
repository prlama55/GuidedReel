import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createCloudTtsProvider } from '@guidedreel/core/providers';
import { createRateLimiter } from '@/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = createRateLimiter(60, 60_000);

const Body = z.object({
  provider: z.enum(['openai', 'elevenlabs', 'google']),
  apiKey: z.string().min(1, 'Add your API key in Settings'),
  voiceId: z.string().min(1),
  text: z.string().min(1).max(5000),
  speed: z.number().min(0.5).max(2).optional(),
  language: z.string().optional(),
});

/**
 * Proxies a speech request to the chosen provider with the key the browser
 * sent. The key is used for this request only and never stored or logged.
 */
export async function POST(req: NextRequest) {
  const rl = limiter(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local');
  if (!rl.ok)
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      { status: 429 },
    );
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
  const { provider, apiKey, voiceId, text, speed, language } = parsed.data;
  try {
    const speech = await createCloudTtsProvider(provider, apiKey).synthesize(text, {
      voiceId,
      speed,
      language,
    });
    return new Response(new Uint8Array(speech.bytes), {
      headers: { 'Content-Type': speech.mimeType, 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /401|403/.test(message) ? 401 : /429/.test(message) ? 429 : 502;
    return NextResponse.json({ error: { code: 'TTS_FAILED', message } }, { status });
  }
}
