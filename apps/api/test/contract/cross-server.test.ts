import { describe, expect, it } from 'vitest';
import { BASE, PASSWORD, signupAndLogin } from './helpers.js';

// 두 서버를 같이 띄웠을 때만(OTHER_API_BASE_URL) — 전환 기간에 로그인이 풀리지 않는다는 증명
const OTHER = process.env.OTHER_API_BASE_URL?.replace(/\/$/, '');

async function raw(base: string, method: string, path: string, token?: string, body?: unknown) {
  const r = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: (await r.json().catch(() => null)) as any };
}

describe.skipIf(!OTHER)('두 서버 사이 토큰·비밀번호 호환', () => {
  it('한쪽에서 가입·로그인한 회원이 다른 쪽에서 로그인·토큰 사용·재발급·로그아웃까지 된다', async () => {
    const u = await signupAndLogin(); // BASE에서 가입·로그인
    // 같은 기기(default)로 다시 로그인하면 이전 리프레시 토큰이 교체되므로 다른 기기로
    const loginOther = await raw(OTHER!, 'POST', '/api/auth/login', undefined, { email: u.email, password: PASSWORD, deviceId: 'other-device' });
    expect(loginOther.status).toBe(200);
    expect((await raw(OTHER!, 'GET', `/api/auth/member/${u.id}`, u.token)).status).toBe(200);
    const refreshed = await raw(OTHER!, 'POST', '/api/auth/refresh', undefined, { refreshToken: u.refreshToken });
    expect(refreshed.status).toBe(200);
    // 회전: BASE에서 발급한 리프레시 토큰을 OTHER가 썼으니 BASE에서도 더는 못 쓴다 (같은 Redis)
    expect((await raw(BASE, 'POST', '/api/auth/refresh', undefined, { refreshToken: u.refreshToken })).status).toBe(401);
    const newToken = refreshed.body.data.accessToken;
    expect((await raw(BASE, 'GET', `/api/auth/member/${u.id}`, newToken)).status).toBe(200);
    expect((await raw(OTHER!, 'POST', '/api/auth/logout', newToken, {})).status).toBe(200);
    expect((await raw(BASE, 'GET', `/api/auth/member/${u.id}`, newToken)).status).toBe(401);
  });
});
