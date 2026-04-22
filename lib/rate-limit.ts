import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

function createLimiter(requests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`, prefix: string): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
  });
}

let _evidence: Ratelimit | null | undefined;
let _webhook: Ratelimit | null | undefined;

function evidenceLimiter(): Ratelimit | null {
  if (_evidence === undefined) _evidence = createLimiter(120, '1 m', 'ts:evidence');
  return _evidence;
}

function webhookLimiter(): Ratelimit | null {
  if (_webhook === undefined) _webhook = createLimiter(60, '1 m', 'ts:webhook');
  return _webhook;
}

async function applyRateLimit(limiter: Ratelimit | null, identifier: string): Promise<NextResponse | null> {
  if (!limiter) return null;

  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      },
    );
  }

  return null;
}

export { evidenceLimiter, webhookLimiter, applyRateLimit };
