import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { fail } from './api-response.js';
import { ErrorCode } from './app-error.js';
import { clientIp } from './client-ip.js';

/**
 * Spring에 있던 요청 단위 보안 처리를 같은 값으로 옮긴 것 (DESIGN_PROMPTS/planning/PROMPT_ts-security-parity.md).
 * 등록 순서(main.ts): 보안 헤더 → IP 차단 → 스캐너 차단 → 전역 속도 제한 — 거절 응답에도 헤더가 붙는다(Spring Security 필터가 먼저 돈다).
 */
const log = new Logger('Security');

const deny = (res: Response, e: { status: number; code: string; message: string }) =>
  res.status(e.status).type('application/json').send(JSON.stringify(fail(e.code, e.message)));

/** Spring SecurityConfig.headers(...) — 앱은 CSP·Referrer-Policy까지, 어드민은 Spring Security 기본값만 */
export function securityHeaders(kind: 'app' | 'admin') {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Spring은 HTTPS 요청에만 HSTS를 붙인다(프록시 뒤에서는 X-Forwarded-Proto 기준)
    const proto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
    if (req.secure || proto === 'https') res.setHeader('Strict-Transport-Security', 'max-age=31536000 ; includeSubDomains');
    if (kind === 'app') {
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'self';");
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
    next();
  };
}

/** Spring IpBlockFilter — Redis `ipblock:{ip}`가 있으면 403(10초 로컬 캐시, Redis 장애 시 통과) */
export function ipBlock(isBlocked: (ip: string) => Promise<boolean>) {
  const cache = new Map<string, number>();
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') return next();
    const ip = clientIp(req);
    const until = cache.get(ip);
    let blocked = until != null && Date.now() < until;
    if (!blocked) {
      if (until != null) cache.delete(ip);
      blocked = await isBlocked(ip);
      if (blocked) cache.set(ip, Date.now() + 10_000);
    }
    if (blocked) {
      log.warn(`[IP_BLOCK] 차단된 IP 접근 - ip=${ip}, URI=${req.originalUrl}`);
      return deny(res, ErrorCode.FORBIDDEN);
    }
    next();
  };
}

/** Spring ApiAccessInterceptor — `/api/**`에서 알려진 스캐너 User-Agent면 403 */
const BLOCKED_AGENTS = ['sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab'];
export function scannerBlock(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/')) return next();
  const ua = String(req.headers['user-agent'] ?? '').toLowerCase();
  if (ua && BLOCKED_AGENTS.some((a) => ua.includes(a))) {
    log.warn(`[SECURITY] 차단된 User-Agent 감지 - agent: ${req.headers['user-agent']}, IP: ${clientIp(req)}`);
    return deny(res, ErrorCode.FORBIDDEN);
  }
  next();
}

export interface Bucket { tokens: number; updated: number }

/**
 * Bucket4j `refillGreedy`와 같은 토큰 버킷 — 시간에 비례해 조금씩 채우고(용량까지), 1개 쓸 수 있으면 true.
 * 순수 함수(시간을 받는다)라 단위 테스트한다.
 */
export function consume(b: Bucket | undefined, nowMs: number, capacity: number, refillTokens: number, refillSeconds: number): { ok: boolean; bucket: Bucket } {
  const cur = b ?? { tokens: capacity, updated: nowMs };
  const elapsed = Math.max(0, nowMs - cur.updated);
  const tokens = Math.min(capacity, cur.tokens + (elapsed * refillTokens) / (refillSeconds * 1000));
  if (tokens >= 1) return { ok: true, bucket: { tokens: tokens - 1, updated: nowMs } };
  return { ok: false, bucket: { tokens, updated: nowMs } };
}

/** Spring RateLimitFilter — IP당 토큰 버킷(기본 100개, 60초에 100개 보충), OPTIONS 제외, 초과 시 429 R001 */
export function rateLimit() {
  const num = (k: string, d: number) => { const v = Number(process.env[k]); return Number.isFinite(v) && v > 0 ? v : d; };
  const capacity = num('RATE_LIMIT_CAPACITY', 100);
  const refillTokens = num('RATE_LIMIT_REFILL_TOKENS', 100);
  const refillSeconds = num('RATE_LIMIT_REFILL_SECONDS', 60);
  const buckets = new Map<string, Bucket>();
  // 오래 안 온 IP의 버킷은 지운다(가득 찼을 것이므로 지워도 결과가 같다)
  const sweep = setInterval(() => {
    const cutoff = Date.now() - refillSeconds * 1000 * Math.ceil(capacity / refillTokens);
    for (const [k, b] of buckets) if (b.updated < cutoff) buckets.delete(k);
  }, 60_000);
  sweep.unref();
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') return next();
    const key = clientIp(req);
    const r = consume(buckets.get(key), Date.now(), capacity, refillTokens, refillSeconds);
    buckets.set(key, r.bucket);
    if (r.ok) return next();
    log.warn(`[RATE_LIMIT] 요청 초과 - key: ${key}, URI: ${req.originalUrl}`);
    return deny(res, ErrorCode.TOO_MANY_REQUESTS);
  };
}
