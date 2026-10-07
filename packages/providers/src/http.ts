import { VideoCreatorError } from '@guidedreel/engine';

export type FetchLike = typeof fetch;

/** Throws a structured error for non-2xx responses, including the provider's message when present. */
export async function assertOk(res: Response, provider: string): Promise<Response> {
  if (res.ok) return res;
  let detail = '';
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as {
        error?: { message?: string } | string;
        detail?: { message?: string } | string;
        message?: string;
      };
      const e = json.error ?? json.detail ?? json.message;
      detail = typeof e === 'string' ? e : (e?.message ?? text.slice(0, 200));
    } catch {
      detail = text.slice(0, 200);
    }
  } catch {
    /* ignore */
  }
  const code =
    res.status === 401 || res.status === 403
      ? 'VALIDATION_FAILED'
      : res.status === 429
        ? 'IO_ERROR'
        : 'IO_ERROR';
  throw new VideoCreatorError(code, `${provider}: ${res.status}${detail ? ` – ${detail}` : ''}`, {
    details: { status: res.status },
    retryable: res.status === 429 || res.status >= 500,
  });
}

export function requireKey(provider: string, key: string | undefined): string {
  if (!key || !key.trim())
    throw new VideoCreatorError('VALIDATION_FAILED', `${provider}: an API key is required`);
  return key.trim();
}
