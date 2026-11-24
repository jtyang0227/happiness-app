import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, makeAdmin } from './db.js';
import { LOCAL_DATE_TIME, MEMBER_KEYS, call, signupAndLogin } from './helpers.js';

afterAll(closeDb);

/** 사진 존재는 검사하지 않는다(Spring과 같음) — 테스트끼리 겹치지 않게 큰 임의 번호 */
const photoId = () => 9_000_000 + Math.floor(Math.random() * 1_000_000);

describe('댓글', () => {
  it('작성(이름·아바타는 서버가 회원 정보로) → 공개 목록에 답글 묶음', async () => {
    const a = await signupAndLogin({ name: '댓글작성자' });
    const b = await signupAndLogin();
    const pid = photoId();
    const top = await call('POST', `/api/photos/${pid}/comments`, { token: a.token, body: { content: '  첫 댓글 ', memberId: b.id, memberName: '사칭' } });
    expect(top.status).toBe(200);
    expect(top.body.data).toMatchObject({ photoId: pid, memberId: a.id, memberName: '댓글작성자', content: '첫 댓글', parentId: null, replies: [] });
    expect(Object.keys(top.body.data).sort()).toEqual(['content', 'createdAt', 'id', 'memberAvatarUrl', 'memberId', 'memberName', 'parentId', 'photoId', 'replies']);
    expect(top.body.data.createdAt).toMatch(LOCAL_DATE_TIME);
    const reply = await call('POST', `/api/photos/${pid}/comments`, { token: b.token, body: { content: '답글', parentId: top.body.data.id } });
    expect(reply.body.data.parentId).toBe(top.body.data.id);

    const list = await call('GET', `/api/photos/${pid}/comments`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].replies.map((r: any) => r.content)).toEqual(['답글']);
  });

  it('입력 오류 400 · 다른 사진의 댓글에 답글 400 · 비로그인 작성 401', async () => {
    const a = await signupAndLogin();
    const pid = photoId();
    expect((await call('POST', `/api/photos/${pid}/comments`, { token: a.token, body: { content: ' ' } })).body.message).toBe('댓글 내용을 입력해주세요.');
    expect((await call('POST', `/api/photos/${pid}/comments`, { token: a.token, body: { content: 'x'.repeat(501) } })).body.message).toBe('댓글은 500자 이하로 작성해주세요.');
    const other = await call('POST', `/api/photos/${photoId()}/comments`, { token: a.token, body: { content: '다른 사진' } });
    const wrong = await call('POST', `/api/photos/${pid}/comments`, { token: a.token, body: { content: 'x', parentId: other.body.data.id } });
    expect(wrong.status).toBe(400);
    expect(wrong.body.message).toBe('답글을 달 댓글을 찾을 수 없습니다.');
    expect((await call('POST', `/api/photos/${pid}/comments`, { body: { content: 'x' } })).status).toBe(401);
  });

  it('삭제 — 남의 댓글 400, 본인·관리자 가능, 답글도 함께 삭제', async () => {
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    const admin = await signupAndLogin();
    await makeAdmin(admin.id);
    const pid = photoId();
    const c = (await call('POST', `/api/photos/${pid}/comments`, { token: a.token, body: { content: '원글' } })).body.data;
    await call('POST', `/api/photos/${pid}/comments`, { token: b.token, body: { content: '답', parentId: c.id } });
    const denied = await call('DELETE', `/api/comments/${c.id}?memberId=${a.id}`, { token: b.token });
    expect(denied.status).toBe(400);
    expect(denied.body.message).toBe('본인의 댓글만 삭제할 수 있습니다.');
    expect((await call('DELETE', `/api/comments/${c.id}`, { token: admin.token })).status).toBe(200);
    expect((await call('GET', `/api/photos/${pid}/comments`)).body.data).toEqual([]);
    expect((await call('DELETE', `/api/comments/${c.id}`, { token: a.token })).body.message).toBe('댓글을 찾을 수 없습니다.');
  });
});

describe('팔로우', () => {
  it('팔로우·확인·수·목록(연락처 없음)·언팔로우', async () => {
    const a = await signupAndLogin();
    const b = await signupAndLogin({ tel: '010-2222-3333' });
    const f = await call('POST', `/api/follows?followerId=${a.id}&followingId=${b.id}`, { token: a.token });
    expect(f.status).toBe(200);
    expect('data' in f.body).toBe(false);
    expect((await call('GET', `/api/follows/check?followerId=${a.id}&followingId=${b.id}`, { token: b.token })).body.data).toEqual({ following: true });
    expect((await call('GET', `/api/follows/count?memberId=${b.id}`, { token: a.token })).body.data).toEqual({ followerCount: 1, followingCount: 0 });
    const following = await call('GET', `/api/follows/following?memberId=${a.id}`, { token: a.token });
    expect(following.body.data).toHaveLength(1);
    expect(Object.keys(following.body.data[0]).sort()).toEqual([...MEMBER_KEYS].sort());
    expect(following.body.data[0]).toMatchObject({ id: b.id, email: null, tel: null });
    expect((await call('GET', `/api/follows/followers?memberId=${b.id}`, { token: a.token })).body.data.map((m: any) => m.id)).toEqual([a.id]);

    const dup = await call('POST', `/api/follows?followerId=${a.id}&followingId=${b.id}`, { token: a.token });
    expect(dup.body).toMatchObject({ code: 'C002', message: '이미 팔로우 중입니다.' });
    expect((await call('POST', `/api/follows?followerId=${a.id}&followingId=${a.id}`, { token: a.token })).body.message).toBe('자기 자신을 팔로우할 수 없습니다.');
    expect((await call('DELETE', `/api/follows?followerId=${a.id}&followingId=${b.id}`, { token: a.token })).status).toBe(200);
    expect((await call('GET', `/api/follows/check?followerId=${a.id}&followingId=${b.id}`, { token: a.token })).body.data.following).toBe(false);
  });

  it('남 대신 팔로우 403 "403", 파라미터 누락 500, 비로그인 401', async () => {
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    const r = await call('POST', `/api/follows?followerId=${b.id}&followingId=${a.id}`, { token: a.token });
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ success: false, code: '403', message: '본인 계정으로만 할 수 있습니다.' });
    expect((await call('GET', '/api/follows/count', { token: a.token })).status).toBe(500);
    expect((await call('GET', `/api/follows/count?memberId=${a.id}`)).status).toBe(401);
  });
});

describe('차단', () => {
  it('차단(멱등) → 목록 → 해제, 자기 자신 400, 없는 회원 404', async () => {
    const a = await signupAndLogin();
    const b = await signupAndLogin({ name: '차단대상' });
    expect((await call('POST', `/api/blocks/${b.id}`, { token: a.token })).status).toBe(200);
    expect((await call('POST', `/api/blocks/${b.id}`, { token: a.token })).status).toBe(200);
    const list = await call('GET', '/api/blocks', { token: a.token });
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toEqual({ memberId: b.id, name: '차단대상', profileName: b.profileName, avatarUrl: null, blockedAt: expect.stringMatching(LOCAL_DATE_TIME) });
    const self = await call('POST', `/api/blocks/${a.id}`, { token: a.token });
    expect(self.status).toBe(400);
    expect(self.body).toMatchObject({ code: '400', message: '자기 자신은 차단할 수 없습니다.' });
    const none = await call('POST', '/api/blocks/999999999', { token: a.token });
    expect(none.status).toBe(404);
    expect(none.body).toMatchObject({ code: '404', message: '회원을 찾을 수 없습니다.' });
    expect((await call('DELETE', `/api/blocks/${b.id}`, { token: a.token })).status).toBe(200);
    expect((await call('GET', '/api/blocks', { token: a.token })).body.data).toEqual([]);
  });
});
