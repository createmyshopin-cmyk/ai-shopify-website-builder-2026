import type { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function windowMs(): number {
  return Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 60_000);
}

function maxRequests(): number {
  return Number(process.env.API_RATE_LIMIT_MAX ?? 120);
}

function clientKey(request: Request): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? request.ip ?? "unknown";
  }
  return request.ip ?? "unknown";
}

export function rateLimitMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!request.path.startsWith("/api/projects")) {
    next();
    return;
  }

  const key = clientKey(request);
  const now = Date.now();
  const window = windowMs();
  const max = maxRequests();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + window };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  response.setHeader("X-RateLimit-Limit", String(max));
  response.setHeader(
    "X-RateLimit-Remaining",
    String(Math.max(0, max - bucket.count)),
  );
  response.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > max) {
    response.status(429).json({
      message: "Too many requests — rate limit exceeded",
      retryAfterMs: bucket.resetAt - now,
    });
    return;
  }

  next();
}
