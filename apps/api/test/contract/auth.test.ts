import { describe, expect, it } from 'vitest';
import { LOCAL_DATE_TIME, MEMBER_KEYS, PASSWORD, call, signupAndLogin, uniq } from './helpers.js';

// 2단계 — /api/auth 핵심 경로. Spring CoreFlowIntegrationTest의 인증 시나리오 + 응답 모양(키·형식)까지 비교한다.
describe('auth contract', () => {
  it('회원가입 응답 모양 — ApiResponse 래퍼, MemberResponse 키, 정규화', async () => {
    const s = uniq();
    const r = await call('POST', '/api/auth/signup', { body: {
      email: `  CT-${s}@Test.com `, password: PASSWORD, name: ' 홍길동 ', tel: '01012345678',
      profileName: `Ct${s}`, instagramId: '@my.insta', termsAgreed: true,
    } });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ success: true, code: '200', message: '성공' });
    expect(r.body.timestamp).toMatch(LOCAL_DATE_TIME);
    const m = r.body.data;
    expect(Object.keys(m).sort()).toEqual([...MEMBER_KEYS].sort());
    expect(m).toMatchObject({
      email: `ct-${s}@test.com`, name: '홍길동', tel: '010-1234-5678', profileName: `ct${s}`, instagramId: 'my.insta',
      provider: 'local', publicProfile: true, emailNotifications: true, status: 'ACTIVE', authority: 'US', role: 'USER',
      avatarUrl: null, portfolioCoverPhotoId: null,
    });
    expect(typeof m.id).toBe('number');
    expect(m.createdAt).toMatch(LOCAL_DATE_TIME);
  });

  it('회원가입 입력 오류는 400 C002 + 서버 사유', async () => {
    const s = uniq();
    const base = { email: `ct-${s}@test.com`, password: PASSWORD, name: '테스터', termsAgreed: true };
    const cases: [Record<string, unknown>, string][] = [
      [{ email: 'not-an-email' }, '올바른 이메일 형식이 아닙니다. (예: user@example.com)'],
      [{ email: '' }, '이메일은 필수입니다.'],
      [{ password: 'short' }, '비밀번호는 8자 이상이어야 합니다.'],
      [{ termsAgreed: false }, '이용약관에 동의해야 합니다.'],
      [{ name: '  ' }, '이름은 필수입니다.'],
      [{ tel: '02-123-4567' }, '올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)'],
      [{ profileName: '-bad-' }, '프로필 이름은 영문 소문자·숫자·하이픈 30자 이하이며, 하이픈으로 시작하거나 끝날 수 없습니다. (예: my-portfolio)'],
      [{ instagramId: 'bad id!' }, '인스타그램 아이디는 영문, 숫자, 점, 밑줄만 사용 가능하며 30자 이하이어야 합니다.'],
    ];
    for (const [patch, message] of cases) {
      const r = await call('POST', '/api/auth/signup', { body: { ...base, ...patch } });
      expect(r.status, JSON.stringify(patch)).toBe(400);
      expect(r.body).toMatchObject({ success: false, code: 'C002', message });
    }
  });

  it('중복 이메일(대소문자만 달라도)·중복 프로필명은 400', async () => {
    const u = await signupAndLogin();
    const dup = await call('POST', '/api/auth/signup', { body: { email: u.email.toUpperCase(), password: PASSWORD, name: 'x', termsAgreed: true } });
    expect(dup.status).toBe(400);
    expect(dup.body.message).toBe('이미 등록된 이메일입니다.');
    const dupName = await call('POST', '/api/auth/signup', { body: { email: `ct-${uniq()}@test.com`, password: PASSWORD, name: 'x', profileName: u.profileName.toUpperCase(), termsAgreed: true } });
    expect(dupName.status).toBe(400);
    expect(dupName.body.message).toBe('이미 사용 중인 프로필 이름입니다.');
  });

  it('로그인 — 이메일 대소문자 무관, 토큰 응답 모양', async () => {
    const u = await signupAndLogin();
    const r = await call('POST', '/api/auth/login', { body: { email: ` ${u.email.toUpperCase()} `, password: PASSWORD } });
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(Object.keys(d).sort()).toEqual(['accessToken', 'expiresIn', 'member', 'refreshToken', 'tokenType']);
    expect(d).toMatchObject({ tokenType: 'Bearer', expiresIn: 1800 });
    expect(d.member.id).toBe(u.id);
    // 토큰 클레임 (서명 검증은 서버 몫 — 여기선 모양만)
    const claims = JSON.parse(Buffer.from(d.accessToken.split('.')[1], 'base64url').toString());
    expect(claims).toMatchObject({ iss: 'happiness-app', sub: String(u.id), email: u.email, type: 'ACCESS', role: 'US' });
    expect(typeof claims.jti).toBe('string');
    expect(claims.exp - claims.iat).toBe(1800);
  });

  it('틀린 비밀번호·없는 계정은 같은 401 A005', async () => {
    const u = await signupAndLogin();
    const wrong = await call('POST', '/api/auth/login', { body: { email: u.email, password: 'wrong-password' } });
    const none = await call('POST', '/api/auth/login', { body: { email: `nobody-${uniq()}@test.com`, password: PASSWORD } });
    for (const r of [wrong, none]) {
      expect(r.status).toBe(401);
      expect(r.body).toMatchObject({ success: false, code: 'A005', message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
  });

  it('같은 이메일 5회 실패하면 429 + 남은 분, 맞는 비밀번호도 막힌다', async () => {
    const u = await signupAndLogin();
    for (let i = 0; i < 5; i++) await call('POST', '/api/auth/login', { body: { email: u.email, password: 'wrong-password' } });
    const r = await call('POST', '/api/auth/login', { body: { email: u.email, password: PASSWORD } });
    expect(r.status).toBe(429);
    expect(r.body).toMatchObject({ success: false, code: '429', message: '로그인 시도가 너무 많습니다. 15분 뒤에 다시 시도해주세요.' });
  });

  it('토큰 없이 보호 경로는 401 A001, 깨진 토큰도 같다', async () => {
    for (const token of [undefined, 'not.a.jwt']) {
      const r = await call('GET', '/api/auth/member/1', { token });
      expect(r.status).toBe(401);
      expect(r.body).toMatchObject({ success: false, code: 'A001', message: '인증이 필요합니다.' });
    }
  });

  it('회원 조회 — 본인은 연락처 포함, 남은 email·tel null', async () => {
    const a = await signupAndLogin({ tel: '010-2222-3333' });
    const b = await signupAndLogin();
    const self = await call('GET', `/api/auth/member/${a.id}`, { token: a.token });
    expect(self.status).toBe(200);
    expect(self.body.data).toMatchObject({ id: a.id, email: a.email, tel: '010-2222-3333' });
    const other = await call('GET', `/api/auth/member/${a.id}`, { token: b.token });
    expect(other.body.data).toMatchObject({ id: a.id, email: null, tel: null, name: '테스터' });
    expect(Object.keys(other.body.data).sort()).toEqual([...MEMBER_KEYS].sort());
    const missing = await call('GET', '/api/auth/member/999999999', { token: a.token });
    expect(missing.status).toBe(400);
    expect(missing.body).toMatchObject({ code: 'C002', message: '회원을 찾을 수 없습니다.' });
  });

  it('이메일·프로필명 사용 가능 여부', async () => {
    const u = await signupAndLogin();
    const q = (p: string) => call('GET', p).then((r: { status: number; body: any }) => [r.status, r.body.data]);
    expect(await q(`/api/auth/check-email?email=${encodeURIComponent(u.email.toUpperCase())}`)).toEqual([200, { available: false }]);
    expect(await q(`/api/auth/check-email?email=free-${uniq()}@test.com`)).toEqual([200, { available: true }]);
    expect(await q('/api/auth/check-email?email=bad')).toEqual([200, { available: false }]);
    expect(await q(`/api/auth/check-profile-name?name=${u.profileName}`)).toEqual([200, { available: false }]);
    expect(await q(`/api/auth/check-profile-name?name=free${uniq()}`)).toEqual([200, { available: true }]);
    const bad = await call('GET', '/api/auth/check-profile-name?name=-x-');
    expect(bad.status).toBe(400);
  });

  it('리프레시 — 새 토큰 발급, 액세스 토큰을 넣으면 401 A004, 빈 값은 400', async () => {
    const u = await signupAndLogin();
    const r = await call('POST', '/api/auth/refresh', { body: { refreshToken: u.refreshToken } });
    expect(r.status).toBe(200);
    expect(r.body.data.member.id).toBe(u.id);
    expect(r.body.data.accessToken).not.toBe(u.token);
    const wrongType = await call('POST', '/api/auth/refresh', { body: { refreshToken: u.token } });
    expect(wrongType.status).toBe(401);
    expect(wrongType.body).toMatchObject({ code: 'A004', message: '유효하지 않은 리프레시 토큰입니다.' });
    const garbage = await call('POST', '/api/auth/refresh', { body: { refreshToken: 'x.y.z' } });
    expect(garbage.body.code).toBe('A004');
    const empty = await call('POST', '/api/auth/refresh', { body: { refreshToken: '' } });
    expect(empty.status).toBe(400);
    expect(empty.body).toMatchObject({ code: 'C002', message: '리프레시 토큰은 필수입니다.' });
  });

  it('로그아웃 — 토큰 필요, 성공은 data 없는 ApiResponse', async () => {
    const u = await signupAndLogin();
    const noToken = await call('POST', '/api/auth/logout', { body: {} });
    expect(noToken.status).toBe(401);
    const r = await call('POST', '/api/auth/logout', { token: u.token, body: {} });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(['code', 'message', 'success', 'timestamp']);
  });

  it('옮기지 않은 경로도 같은 주소로 동작한다 (Nest는 Spring으로 넘김)', async () => {
    const r = await call('GET', '/api/photos?page=0&size=1');
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('status', 'success');
    expect(Array.isArray(r.body.data)).toBe(true);
    const health = await call('GET', '/actuator/health');
    expect(health.body.status).toBe('UP');
  });
});

describe('auth contract — 토큰 회전 (Redis가 있을 때)', () => {
  it('한 번 쓴 리프레시 토큰은 다시 쓸 수 없다', async () => {
    const u = await signupAndLogin();
    const first = await call('POST', '/api/auth/refresh', { body: { refreshToken: u.refreshToken } });
    expect(first.status).toBe(200);
    const reuse = await call('POST', '/api/auth/refresh', { body: { refreshToken: u.refreshToken } });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe('A004');
  });

  it('로그아웃한 액세스 토큰은 더 이상 통하지 않는다', async () => {
    const u = await signupAndLogin();
    expect((await call('GET', `/api/auth/member/${u.id}`, { token: u.token })).status).toBe(200);
    expect((await call('POST', '/api/auth/logout', { token: u.token, body: {} })).status).toBe(200);
    expect((await call('GET', `/api/auth/member/${u.id}`, { token: u.token })).status).toBe(401);
  });
});
