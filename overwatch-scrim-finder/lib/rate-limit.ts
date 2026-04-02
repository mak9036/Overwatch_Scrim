/**
 * Simple in-memory sliding-window rate limiter.
 * Works per-process; suitable for single-instance deployments.
 * For multi-instance deployments, swap the Map for a Redis store.
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitBucket>();

// Prune expired buckets every 10 minutes to prevent unbounded memory growth.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of store) {
      if (bucket.resetAt < now) store.delete(key);
    }
  },
  10 * 60 * 1000,
).unref?.(); // .unref() so this timer doesn't prevent Node process exit

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check (and increment) a rate-limit bucket.
 * @param key     Unique identifier — typically `"<route>:<ip>"`.
 * @param limit   Max allowed requests per window.
 * @param windowMs Window duration in milliseconds.
 */
export const checkRateLimit = (key: string, limit: number, windowMs: number): RateLimitResult => {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
};

/** Extract the best available client IP from a request's headers. */
export const getClientIp = (request: Request): string => {
  const forwarded = (request as { headers: { get: (k: string) => string | null } }).headers.get(
    "x-forwarded-for",
  );
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
};
