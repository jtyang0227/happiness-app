import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, insertResetToken, makeAdmin, setTel } from './db.js';
import { LOCAL_DATE_TIME, MEMBER_KEYS, PASSWORD, call, signupAndLogin, uniq } from './helpers.js';

afterAll(closeDb);

describe('회원 — 프로필·비밀번호·통계', () => {
  it('본인 프로필 수정: 빈 문자열은 비우기, null은 그대로, 프로필명 정규화', async () => {
    const u = await signupAndLogin({ instagramId: 'insta_a' });
    const pn = `New${uniq()}`;
    const r = await call('PUT', `/api/auth/member/${u.id}/profile`, {
      token: u.token,
      body: { name: '  새이름 ', profileName: pn, bio: ' 소개 ', location: '', specialties: '결혼식,인물', publicProfile: false, portfolioCoverPhotoId: 7 },
    });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    const d = r.body.data;
    expect(Object.keys(d).sort()).toEqual([...MEMBER_KEYS].sort());
    expect(d).toMatchObject({ name: '새이름', profileName: pn.toLowerCase(), bio: '소개', location: null, specialties: '결혼식,인물', publicProfile: false, portfolioCoverPhotoId: 7, instagramId: 'insta_a' });
    expect(d.updatedAt).toMatch(LOCAL_DATE_TIME);
  });

  it('프로필 수정 — 남의 계정 403 B001, 중복 프로필명 400, 잘못된 형식 400', async () => {
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    const forbidden = await call('PUT', `/api/auth/member/${b.id}/profile`, { token: a.token, body: { name: 'x' } });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toMatchObject({ success: false, code: 'B001', message: '접근 권한이 없습니다.' });

    const dup = await call('PUT', `/api/auth/member/${a.id}/profile`, { token: a.token, body: { profileName: b.profileName } });
    expect(dup.status).toBe(400);
    expect(dup.body).toMatchObject({ code: 'C002', message: '이미 사용 중인 프로필 이름입니다.' });

    const bad = await call('PUT', `/api/auth/member/${a.id}/profile`, { token: a.token, body: { instagramId: 'bad id!' } });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toContain('인스타그램 아이디');
  });

  it('비밀번호 변경 — 현재 비밀번호 틀림 400, 짧음 400, 성공 후 새 비밀번호로 로그인', async () => {
    const u = await signupAndLogin();
    const wrong = await call('PUT', `/api/auth/member/${u.id}/password`, { token: u.token, body: { currentPassword: 'nope1234', newPassword: 'Another1!!' } });
    expect(wrong.status).toBe(400);
    expect(wrong.body.message).toBe('현재 비밀번호가 일치하지 않습니다.');
    const short = await call('PUT', `/api/auth/member/${u.id}/password`, { token: u.token, body: { currentPassword: PASSWORD, newPassword: 'short' } });
    expect(short.body.message).toBe('비밀번호는 8자 이상이어야 합니다.');

    const done = await call('PUT', `/api/auth/member/${u.id}/password`, { token: u.token, body: { currentPassword: PASSWORD, newPassword: 'Another1!!' } });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ success: true, code: '200' });
    expect('data' in done.body).toBe(false);
    const li = await call('POST', '/api/auth/login', { body: { email: u.email, password: 'Another1!!' } });
    expect(li.status).toBe(200);
  });

  it('통계 — 6개 키, 새 회원은 0, 인증 필요', async () => {
    const u = await signupAndLogin();
    const r = await call('GET', `/api/auth/member/${u.id}/stats`, { token: u.token });
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ photoCount: 0, totalLikes: 0, totalSaves: 0, totalShares: 0, inquiryCount: 0, unreadInquiryCount: 0 });
    const anon = await call('GET', `/api/auth/member/${u.id}/stats`);
    expect(anon.status).toBe(401);
  });
});

describe('회원 — 검색·관리자', () => {
  it('검색은 래퍼 없는 배열, 연락처 없음, size 상한', async () => {
    const tag = uniq();
    const u = await signupAndLogin({ name: `검색${tag}` });
    const r = await call('GET', `/api/auth/members/search?q=${encodeURIComponent('검색' + tag)}`, { token: u.token });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body).toHaveLength(1);
    expect(r.body[0]).toMatchObject({ id: u.id, email: null, tel: null });
    // 쿼리 값은 Spring XSS 필터가 HTML 이스케이프한다: "A&B"로 저장된 이름을 q=A&B로 찾으면 A&amp;B로 비교돼 0건(양쪽 같음)
    const amp = await signupAndLogin({ name: `A&B${tag}` });
    const escaped = await call('GET', `/api/auth/members/search?q=${encodeURIComponent('A&B' + tag)}`, { token: amp.token });
    expect(escaped.body).toEqual([]);
    const plain = await call('GET', `/api/auth/members/search?q=${encodeURIComponent('B' + tag)}`, { token: amp.token });
    expect(plain.body.map((m: any) => m.id)).toEqual([amp.id]);
    const blank = await call('GET', '/api/auth/members/search?q=%20', { token: u.token });
    expect(blank.body).toEqual([]);
  });

  it('관리자 목록·권한 변경 — 일반 회원 403, 관리자는 마스킹된 목록', async () => {
    const admin = await signupAndLogin({ tel: '010-1234-5678' });
    const user = await signupAndLogin();
    // 거부는 양쪽 공통. 상태 코드는 다르다: Spring은 @PreAuthorize 거부(AuthorizationDeniedException)를
    // 전역 핸들러가 못 잡아 500 C001, Nest는 의도대로 403 B001 (README "알려진 차이")
    for (const r of [
      await call('GET', '/api/auth/members', { token: user.token }),
      await call('PUT', `/api/auth/member/${user.id}/role`, { token: user.token, body: { role: 'ADMIN' } }),
    ]) {
      expect(r.body.success).toBe(false);
      expect([403, 500]).toContain(r.status);
    }

    await makeAdmin(admin.id);
    const list = await call('GET', '/api/auth/members', { token: admin.token });
    expect(list.status).toBe(200);
    const me = list.body.data.find((m: any) => m.id === admin.id);
    expect(me.email).toMatch(/^ct\*\*\*@test\.com$/);
    expect(me.tel).toBe('010-****-5678');

    const up = await call('PUT', `/api/auth/member/${user.id}/role`, { token: admin.token, body: { role: 'admin' } });
    expect(up.body.data).toMatchObject({ authority: 'SA', role: 'ADMIN' });
    const down = await call('PUT', `/api/auth/member/${user.id}/role`, { token: admin.token, body: { role: 'whatever' } });
    expect(down.body.data).toMatchObject({ authority: 'US', role: 'USER' });

    // 관리자는 남의 프로필도 수정 가능
    const edit = await call('PUT', `/api/auth/member/${user.id}/profile`, { token: admin.token, body: { bio: '관리자 수정' } });
    expect(edit.body.data.bio).toBe('관리자 수정');
  });
});

describe('계정 찾기', () => {
  it('아이디 찾기 — 이름+전화(숫자만 비교)로 가린 이메일, 형식 오류 400', async () => {
    const tag = uniq();
    const u = await signupAndLogin({ name: `찾기${tag}` });
    await setTel(u.id, '01098765432');
    const r = await call('POST', '/api/auth/find-email', { body: { name: ` 찾기${tag} `, tel: '010-9876-5432' } });
    expect(r.status).toBe(200);
    expect(r.body.data.accounts).toEqual([{ maskedEmail: expect.stringMatching(/^ct\*+@test\.com$/), provider: 'local', joinedAt: expect.stringMatching(/^\d{4}\.\d{2}\.\d{2}$/) }]);
    const none = await call('POST', '/api/auth/find-email', { body: { name: `찾기${tag}`, tel: '010-0000-0000' } });
    expect(none.body.data.accounts).toEqual([]);
    const bad = await call('POST', '/api/auth/find-email', { body: { name: 'a', tel: '12345' } });
    expect(bad.status).toBe(400);
    const empty = await call('POST', '/api/auth/find-email', { body: { name: '', tel: '' } });
    expect(empty.body.message).toBe('이름과 휴대폰 번호를 입력해주세요.');
  });

  it('재설정 요청 — 가입 여부와 무관하게 같은 응답', async () => {
    const u = await signupAndLogin();
    const a = await call('POST', '/api/auth/password-reset/request', { body: { email: u.email.toUpperCase() } });
    const b = await call('POST', '/api/auth/password-reset/request', { body: { email: `nobody-${uniq()}@test.com` } });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.data).toEqual(b.body.data);
    expect(a.body.data.message).toContain('가입된 이메일이면');
    const empty = await call('POST', '/api/auth/password-reset/request', { body: { email: ' ' } });
    expect(empty.body.message).toBe('이메일을 입력해주세요.');
  });

  it('재설정 확인·확정 — 1회용, 만료 토큰 400, 확정 후 새 비밀번호·이전 refresh 무효', async () => {
    const u = await signupAndLogin();
    const raw = `ct-raw-${uniq()}-${uniq()}`;
    await insertResetToken(u.id, raw);
    const v = await call('GET', `/api/auth/password-reset/verify?token=${raw}`);
    expect(v.status).toBe(200);
    expect(v.body.data).toEqual({ valid: true, maskedEmail: expect.stringMatching(/^ct\*+@test\.com$/) });

    const short = await call('POST', '/api/auth/password-reset/confirm', { body: { token: raw, newPassword: 'short' } });
    expect(short.body.message).toBe('비밀번호는 8자 이상이어야 합니다.');
    const ok = await call('POST', '/api/auth/password-reset/confirm', { body: { token: raw, newPassword: 'ResetPw1!!' } });
    expect(ok.status).toBe(200);
    expect((await call('POST', '/api/auth/login', { body: { email: u.email, password: 'ResetPw1!!' } })).status).toBe(200);
    const again = await call('POST', '/api/auth/password-reset/confirm', { body: { token: raw, newPassword: 'ResetPw2!!' } });
    expect(again.status).toBe(400);
    expect(again.body.message).toContain('링크가 만료되었거나');
    const oldRefresh = await call('POST', '/api/auth/refresh', { body: { refreshToken: u.refreshToken } });
    expect(oldRefresh.status).toBe(401);

    const expiredRaw = `ct-exp-${uniq()}-${uniq()}`;
    await insertResetToken(u.id, expiredRaw, -1);
    expect((await call('GET', `/api/auth/password-reset/verify?token=${expiredRaw}`)).status).toBe(400);
  });
});
