/** Fixed-window in-memory rate limiter (per process). Swap for Redis/Upstash behind a load balancer. */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (key: string): { ok: boolean; retryAfterSeconds: number } => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return { ok: true, retryAfterSeconds: 0 };
    }
    entry.count += 1;
    if (entry.count > limit)
      return { ok: false, retryAfterSeconds: Math.ceil((entry.reset - now) / 1000) };
    return { ok: true, retryAfterSeconds: 0 };
  };
}
