import type { NextFunction, Request, Response } from 'express';
import { fail } from './api-response.js';
import { clientIp } from './client-ip.js';

/**
 * Spring filter/RateLimitFilter와 같은 전역 IP 속도 제한 — Bucket4j greedy 리필(capacity, refillTokens / refillSeconds).
 * 설정도 같은 이름: SECURITY_RATE_LIMIT_CAPACITY·SECURITY_RATE_LIMIT_REFILL_TOKENS·SECURITY_RATE_LIMIT_REFILL_SECONDS (기본 100·100·60).
 * OPTIONS(preflight)는 제외. 인스턴스 안 메모리 — 맵이 MAX_KEYS를 넘으면 가득 찬(오래 안 온) 버킷부터 비운다.
 */
const MAX_KEYS = 50_000;

interface Bucket { tokens: number; at: number }

export function rateLimitMiddleware() {
  const capacity = Number(process.env.SECURITY_RATE_LIMIT_CAPACITY ?? 100);
  const refillTokens = Number(process.env.SECURITY_RATE_LIMIT_REFILL_TOKENS ?? 100);
  const refillMs = Number(process.env.SECURITY_RATE_LIMIT_REFILL_SECONDS ?? 60) * 1000;
  const perMs = refillTokens / refillMs;
  const buckets = new Map<string, Bucket>();

  const sweep = (now: number) => {
    for (const [k, b] of buckets) {
      if (b.tokens + (now - b.at) * perMs >= capacity) buckets.delete(k);
    }
    if (buckets.size > MAX_KEYS) buckets.clear();
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS' || capacity <= 0) return next();
    const now = Date.now();
    const key = clientIp(req);
    let b = buckets.get(key);
    if (!b) {
      if (buckets.size >= MAX_KEYS) sweep(now);
      b = { tokens: capacity, at: now };
      buckets.set(key, b);
    } else {
      b.tokens = Math.min(capacity, b.tokens + (now - b.at) * perMs);
      b.at = now;
    }
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return next();
    }
    console.warn(`[RATE_LIMIT] 요청 초과 - URI: ${req.path}`);
    res.status(429).json(fail('R001', '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'));
  };
}
