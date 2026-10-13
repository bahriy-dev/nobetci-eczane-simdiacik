type Bucket = { count: number; expiresAt: number };

export type RateLimitDecision = { allowed: boolean; retryAfterSeconds: number };

/** Process-local fallback. A shared edge or Redis limiter is still needed for multi-instance guarantees. */
export function createRequestRateLimiter(options: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
  now?: () => number;
}) {
  const buckets = new Map<string, Bucket>();
  const now = options.now ?? Date.now;
  const maxKeys = options.maxKeys ?? 10_000;

  return (key: string): RateLimitDecision => {
    const timestamp = now();
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.expiresAt <= timestamp) buckets.delete(bucketKey);
    }
    const bucket = buckets.get(key);
    if (!bucket || bucket.expiresAt <= timestamp) {
      if (buckets.size >= maxKeys) buckets.delete(buckets.keys().next().value!);
      buckets.set(key, { count: 1, expiresAt: timestamp + options.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (bucket.count >= options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((bucket.expiresAt - timestamp) / 1000),
        ),
      };
    }
    bucket.count++;
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

export function requestRateLimitKey(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const address =
    forwarded?.at(-1) || request.headers.get("x-real-ip")?.trim() || "unknown";
  return address.slice(0, 128);
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: "Çok sık istek gönderildi. Lütfen biraz bekleyip yeniden dene." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
