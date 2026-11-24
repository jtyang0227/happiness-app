import { describe, expect, it } from 'vitest';
import { BASE, call, uniq } from './helpers.js';

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
/** 서명 없는 id_token — 양쪽 서버 모두 페이로드만 읽는다(서명 검증 없음, README 참고) */
const fakeIdToken = (payload: object) => `${b64({ alg: 'none' })}.${b64(payload)}.sig`;

async function appleCallback(form: Record<string, string>) {
  const r = await fetch(`${BASE}/api/auth/oauth/apple/callback`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Forwarded-For': `10.9.${Math.floor(Math.random() * 250)}.1` },
    body: new URLSearchParams(form).toString(),
  });
  return { status: r.status, location: r.headers.get('location') ?? '' };
}

describe('OAuth — Apple form_post 콜백', () => {
  it('카카오·구글·네이버는 code가 없거나 공급자가 거절하면 500 C001 (외부 호출 — 이 테스트는 응답 모양만 본다)', async () => {
    // 네트워크가 막힌 환경에서도 결과는 같다: 공급자 호출 실패 → 처리하지 않은 예외
    const r = await call('POST', '/api/auth/oauth/naver', { body: {} });
    expect(r.status).toBe(500);
    expect(r.body).toMatchObject({ success: false, code: 'C001' });
  }, 30000);


  it('새 사용자: 회원 생성 후 프론트로 302 + 토큰, 같은 sub 재로그인은 같은 회원', async () => {
    const sub = `apple-${uniq()}`;
    const idToken = fakeIdToken({ sub, email: `${sub}@test.com` });
    const first = await appleCallback({ id_token: idToken, user: JSON.stringify({ name: { firstName: '길동', lastName: '홍' } }) });
    expect(first.status).toBe(302);
    const u = new URL(first.location);
    expect(u.pathname).toBe('/oauth/apple/result');
    const memberId = Number(u.searchParams.get('memberId'));
    const access = u.searchParams.get('accessToken')!;
    expect(memberId).toBeGreaterThan(0);
    expect(u.searchParams.get('refreshToken')).toBeTruthy();

    const me = await call('GET', `/api/auth/member/${memberId}`, { token: access });
    expect(me.status).toBe(200);
    // Spring XSS 필터가 폼 값의 따옴표를 &quot;로 바꿔 user JSON이 깨진다 → 이름은 항상 기본값(양쪽 같음)
    expect(me.body.data).toMatchObject({ name: 'Apple 사용자', provider: 'apple', email: `${sub}@test.com`, tel: '', authority: 'US' });

    const again = await appleCallback({ id_token: fakeIdToken({ sub }) });
    expect(Number(new URL(again.location).searchParams.get('memberId'))).toBe(memberId);
  });

  it('id_token 없음·깨짐 → 302 ?error=apple_login_failed', async () => {
    for (const form of [{}, { id_token: 'not-a-jwt' }]) {
      const r = await appleCallback(form);
      expect(r.status).toBe(302);
      expect(r.location).toMatch(/\/oauth\/apple\/result\?error=apple_login_failed$/);
    }
  });
});
