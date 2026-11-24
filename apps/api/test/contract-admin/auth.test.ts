import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, q } from './db.js';
import { admin, BASE, call, INVALID, insertMember, LOCAL_DATE_TIME, login, OTHER, PASSWORD, SERVER_ERROR, uniq } from './helpers.js';

afterAll(closeDb);

function claims(token: string) {
  const [h, p] = token.split('.').slice(0, 2).map((s) => JSON.parse(Buffer.from(s, 'base64url').toString()));
  return { h, p };
}

describe('어드민 로그인 POST /api/auth/login', () => {
  it('관리자(WM) — 토큰·회원 정보, 토큰은 subject=이메일·authority 클레임·8시간', async () => {
    const a = await insertMember({ authority: 'WM', profileName: `p${uniq()}` });
    const r = await call('POST', '/api/auth/login', { body: { email: a.email, password: PASSWORD } });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(['authority', 'email', 'memberId', 'name', 'profileName', 'token']);
    expect(r.body).toMatchObject({ memberId: a.id, email: a.email, name: a.name, authority: 'WM' });
    const { h, p } = claims(r.body.token);
    expect(h).toEqual({ alg: 'HS384' });
    expect(Object.keys(p).sort()).toEqual(['authority', 'exp', 'iat', 'sub']);
    expect(p).toMatchObject({ sub: a.email, authority: 'WM' });
    expect(p.exp - p.iat).toBe(28800);
  });

  it('SA도 로그인, profileName 없으면 null', async () => {
    const a = await insertMember({ authority: 'SA' });
    const r = await call('POST', '/api/auth/login', { body: { email: a.email, password: PASSWORD } });
    expect(r.status).toBe(200);
    expect(r.body.profileName).toBeNull();
    expect(r.body.authority).toBe('SA');
  });

  it('틀린 비밀번호·일반 회원·정지된 관리자·없는 계정·대소문자 다른 이메일은 같은 401 문구', async () => {
    const wm = await insertMember({ authority: 'WM' });
    const us = await insertMember({ authority: 'US' });
    const sus = await insertMember({ authority: 'WM', status: 'SUSPENDED' });
    const msg = { message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
    for (const body of [
      { email: wm.email, password: 'wrong-pass' },
      { email: us.email, password: PASSWORD },
      { email: sus.email, password: PASSWORD },
      { email: `none-${uniq()}@test.com`, password: PASSWORD },
      { email: wm.email.toUpperCase(), password: PASSWORD },
      { email: wm.email },
      {},
    ]) {
      const r = await call('POST', '/api/auth/login', { body });
      expect(r.status, JSON.stringify(body)).toBe(401);
      expect(r.body).toEqual(msg);
    }
  });

  it('비밀번호 없는(소셜) 관리자는 로그인 불가', async () => {
    const a = await insertMember({ authority: 'WM', password: null });
    const r = await call('POST', '/api/auth/login', { body: { email: a.email, password: '' } });
    expect(r.status).toBe(401);
  });

  it('같은 이메일 5회 실패 → 15분 잠금 429(맞는 비밀번호도), 다른 이메일은 영향 없음', async () => {
    const a = await insertMember({ authority: 'WM' });
    for (let i = 0; i < 5; i++) expect((await call('POST', '/api/auth/login', { body: { email: a.email, password: 'nope' } })).status).toBe(401);
    const locked = await call('POST', '/api/auth/login', { body: { email: ` ${a.email.toUpperCase()} `, password: PASSWORD } });
    expect(locked.status).toBe(429);
    expect(locked.body).toEqual({ message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.' });
    const other = await admin();
    expect(other.token).toBeTruthy();
  });

  it('성공하면 실패 횟수 초기화', async () => {
    const a = await insertMember({ authority: 'WM' });
    for (let i = 0; i < 4; i++) await call('POST', '/api/auth/login', { body: { email: a.email, password: 'nope' } });
    await login(a.email);
    for (let i = 0; i < 4; i++) await call('POST', '/api/auth/login', { body: { email: a.email, password: 'nope' } });
    expect((await call('POST', '/api/auth/login', { body: { email: a.email, password: PASSWORD } })).status).toBe(200);
  });

  it('깨진 JSON·객체 값은 400 잘못된 요청', async () => {
    expect(await call('POST', '/api/auth/login', { raw: 'garbage' })).toMatchObject({ status: 400, body: INVALID });
    expect(await call('POST', '/api/auth/login', { body: { email: { a: 1 }, password: 'x' } })).toMatchObject({ status: 400, body: INVALID });
  });
});

describe('인증·오류 형식', () => {
  it('토큰 없음·잘못된 토큰·일반 회원 토큰은 경로가 있든 없든 403 빈 본문', async () => {
    for (const path of ['/api/admin/hello', '/api/admin/nope', '/api/nope']) {
      for (const token of [undefined, 'garbage', 'a.b.c']) {
        const r = await call('GET', path, { token });
        expect(r.status, `${path} ${token}`).toBe(403);
        expect(r.body).toBeNull();
      }
    }
    expect((await call('GET', '/api/auth/login')).status).toBe(403);
  });

  it('권한이 내려가거나 정지되면 남은 토큰도 바로 403(매 요청 DB 확인)', async () => {
    const a = await admin();
    expect((await call('GET', '/api/admin/hello', { token: a.token })).status).toBe(200);
    await q("UPDATE members SET authority = 'US' WHERE id = $1", [a.id]);
    expect((await call('GET', '/api/admin/hello', { token: a.token })).status).toBe(403);
    await q("UPDATE members SET authority = 'SA', status = 'SUSPENDED' WHERE id = $1", [a.id]);
    expect((await call('GET', '/api/admin/hello', { token: a.token })).status).toBe(403);
    await q("UPDATE members SET status = 'ACTIVE' WHERE id = $1", [a.id]);
    expect((await call('GET', '/api/admin/hello', { token: a.token })).status).toBe(200);
  });

  it('인증 후 없는 경로는 500, 메서드만 다르면 400 (Spring 처리 그대로)', async () => {
    const a = await admin();
    expect(await call('GET', '/api/admin/nope', { token: a.token })).toMatchObject({ status: 500, body: SERVER_ERROR });
    expect(await call('DELETE', '/api/admin/hello', { token: a.token })).toMatchObject({ status: 400, body: INVALID });
    expect(await call('GET', '/api/auth/login', { token: a.token })).toMatchObject({ status: 400, body: INVALID });
  });

  it('hello·health', async () => {
    const a = await admin();
    const r = await call('GET', '/api/admin/hello', { token: a.token });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(['message', 'status', 'timestamp']);
    expect(r.body.message).toBe('👋 해피니스 어드민 백엔드에서 Hello World! 🎉');
    expect(r.body.status).toBe('success');
    expect(r.body.timestamp).toMatch(LOCAL_DATE_TIME);
    expect(await call('GET', '/actuator/health')).toMatchObject({ status: 200, body: { status: 'UP' } });
  });

  it('CORS — 허용 Origin은 통과, 다른 Origin은 403 Invalid CORS request', async () => {
    const ok = await call('OPTIONS', '/api/admin/hello', { headers: { Origin: 'http://localhost:3001', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://localhost:3001');
    expect(ok.headers.get('access-control-allow-credentials')).toBeNull();
    const bad = await call('OPTIONS', '/api/admin/hello', { headers: { Origin: 'http://evil.example', 'Access-Control-Request-Method': 'GET' } });
    expect(bad).toMatchObject({ status: 403, body: 'Invalid CORS request' });
    const a = await admin();
    expect(await call('GET', '/api/admin/hello', { token: a.token, headers: { Origin: 'http://evil.example' } })).toMatchObject({ status: 403, body: 'Invalid CORS request' });
  });

  it.runIf(!!OTHER)('다른 서버가 발급한 토큰도 통한다(같은 ADMIN_JWT_SECRET)', async () => {
    const a = await insertMember({ authority: 'WM' });
    const r = await call('POST', '/api/auth/login', { base: OTHER, body: { email: a.email, password: PASSWORD } });
    expect(r.status).toBe(200);
    expect((await call('GET', '/api/admin/hello', { token: r.body.token })).status).toBe(200);
    expect(BASE).not.toBe(OTHER);
  });
});
