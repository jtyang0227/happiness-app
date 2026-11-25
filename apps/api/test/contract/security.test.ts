import { createClient } from 'redis';
import { afterAll, describe, expect, it } from 'vitest';
import { BASE, IS_SPRING } from './helpers.js';

// Spring 요청 단위 보안 처리와 같은 동작인지 — 보안 헤더, 스캐너 차단, Redis IP 차단, 전역 속도 제한 (PROMPT_ts-security-parity.md)
const ip = () => `10.${1 + Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
const get = (path: string, headers: Record<string, string> = {}) => fetch(BASE + path, { headers: { 'X-Forwarded-For': ip(), ...headers } });
const redis = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
afterAll(async () => { if (redis.isOpen) await redis.quit(); });

describe('요청 단위 보안 처리 (Spring 패리티)', () => {
  it('보안 응답 헤더 — nosniff·캐시 금지·SAMEORIGIN·CSP·Referrer-Policy, X-Powered-By 없음', async () => {
    const r = await get('/api/photos?page=0&size=1');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(r.headers.get('cache-control')).toBe('no-cache, no-store, max-age=0, must-revalidate');
    expect(r.headers.get('pragma')).toBe('no-cache');
    expect(r.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(r.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");
    expect(r.headers.get('x-powered-by')).toBeNull();
    // 오류 응답에도 붙는다
    expect((await get('/api/auth/members')).headers.get('x-content-type-options')).toBe('nosniff');
  });

  it.skipIf(IS_SPRING)('HSTS — HTTPS(프록시 X-Forwarded-Proto) 요청에만 (Spring은 forward-headers 설정이 없어 프록시 뒤에선 안 붙음 — 의도적 차이)', async () => {
    expect((await get('/api/photos?page=0&size=1')).headers.get('strict-transport-security')).toBeNull();
    expect((await get('/api/photos?page=0&size=1', { 'X-Forwarded-Proto': 'https' })).headers.get('strict-transport-security')).toBe('max-age=31536000 ; includeSubDomains');
  });

  it('스캐너 User-Agent는 /api에서 403 B001', async () => {
    for (const ua of ['sqlmap/1.7.2', 'Mozilla/5.0 (compatible; Nmap Scripting Engine)']) {
      const r = await get('/api/photos', { 'User-Agent': ua });
      expect(r.status).toBe(403);
      expect(await r.json()).toMatchObject({ success: false, code: 'B001', message: '접근 권한이 없습니다.' });
    }
    expect((await get('/api/photos?page=0&size=1', { 'User-Agent': 'Mozilla/5.0' })).status).toBe(200);
  });

  it('Redis ipblock:{ip}가 있으면 403 B001, 다른 IP는 통과', async () => {
    await redis.connect();
    const blocked = ip();
    await redis.set(`ipblock:${blocked}`, '1', { EX: 60 });
    try {
      const r = await get('/api/photos?page=0&size=1', { 'X-Forwarded-For': blocked });
      expect(r.status).toBe(403);
      expect(await r.json()).toMatchObject({ code: 'B001' });
      expect((await get('/api/photos?page=0&size=1')).status).toBe(200);
    } finally {
      await redis.del(`ipblock:${blocked}`);
    }
  });

  it('전역 속도 제한 — 같은 IP 100번까지 통과, 101번째 429 R001(OPTIONS 제외). 공개 경로로 확인 — Spring은 인증 거절(401)이 먼저라 그 요청은 세지 않음, 새 API는 셈(의도적 차이)', async () => {
    const me = ip();
    const statuses: number[] = [];
    for (let i = 0; i < 100; i += 20) {
      statuses.push(...(await Promise.all(Array.from({ length: 20 }, () => get('/api/photos?page=0&size=1', { 'X-Forwarded-For': me }).then((r) => r.status)))));
    }
    expect(statuses.filter((s) => s === 429)).toHaveLength(0);
    const over = await get('/api/photos?page=0&size=1', { 'X-Forwarded-For': me });
    expect(over.status).toBe(429);
    expect(await over.json()).toMatchObject({ success: false, code: 'R001', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
    const pre = await fetch(BASE + '/api/photos', { method: 'OPTIONS', headers: { 'X-Forwarded-For': me, Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'GET' } });
    expect(pre.status).not.toBe(429);
  });
});
