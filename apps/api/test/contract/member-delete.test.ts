import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, makeAdmin } from './db.js';
import { PASSWORD, call, createPhoto, signupAndLogin } from './helpers.js';

afterAll(closeDb);

describe('회원 탈퇴', () => {
  it('본인만(관리자 가능) — 사진·댓글·좋아요·시리즈·감상·보드·문의·차단까지 정리, 남의 보드에서도 빠짐', async () => {
    const me = await signupAndLogin();
    const other = await signupAndLogin();
    const myPhoto = await createPhoto(me);
    const otherPhoto = await createPhoto(other);
    await call('POST', `/api/photos/${myPhoto}/likes?memberId=${other.id}`, { token: other.token });
    await call('POST', `/api/photos/${otherPhoto}/likes?memberId=${me.id}`, { token: me.token });
    await call('POST', `/api/photos/${myPhoto}/comments`, { token: other.token, body: { content: '남이 내 사진에' } });
    await call('POST', `/api/photos/${otherPhoto}/comments`, { token: me.token, body: { content: '내가 남의 사진에' } });
    const series = await call('POST', '/api/series', { token: me.token, body: { title: '내 작업' } });
    await call('POST', `/api/series/${series.body.id}/photos`, { token: me.token, body: { photoId: myPhoto } });
    await call('POST', `/api/series/${series.body.id}/appreciation`, { token: other.token });
    const otherBoard = await call('POST', '/api/moodboards', { token: other.token, body: { name: '남의 보드' } });
    await call('POST', `/api/moodboards/${otherBoard.body.id}/photos`, { token: other.token, body: { photoId: myPhoto } });
    await call('POST', `/api/moodboards/${otherBoard.body.id}/photos`, { token: other.token, body: { photoId: otherPhoto } });
    await call('POST', '/api/moodboards', { token: me.token, body: { name: '내 보드' } });
    await call('POST', '/api/inquiry', { body: { receiverMemberId: me.id, senderName: '고객', senderEmail: 'c@x.com', message: '문의' } });
    await call('POST', `/api/blocks/${me.id}`, { token: other.token });

    const forbidden = await call('DELETE', `/api/auth/member/${me.id}`, { token: other.token });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toMatchObject({ success: false, code: 'B001' });

    const del = await call('DELETE', `/api/auth/member/${me.id}`, { token: me.token });
    expect(del.status).toBe(200);
    expect(del.body).toMatchObject({ success: true, code: '200' });
    expect(del.body.data).toBeUndefined();

    expect((await call('POST', '/api/auth/login', { body: { email: me.email, password: PASSWORD } })).status).toBe(401);
    expect((await call('GET', `/api/photos/${myPhoto}`)).status).toBe(404);
    expect((await call('GET', `/api/series/${series.body.id}`)).status).toBe(404);
    const comments = (await call('GET', `/api/photos/${otherPhoto}/comments`)).body;
    expect(JSON.stringify(comments)).not.toContain('내가 남의 사진에');
    const board = await call('GET', `/api/moodboards/${otherBoard.body.id}`, { token: other.token });
    expect(board.body.photos.map((p: any) => p.id)).toEqual([otherPhoto]);
    expect((await call('GET', '/api/blocks', { token: other.token })).body.data).toEqual([]);
    const likes = (await call('GET', `/api/photos/${otherPhoto}/likes`, { token: other.token })).body;
    expect(JSON.stringify(likes)).not.toContain(`"memberId":${me.id}`);

    // 없는 회원 — 관리자가 지워도 조용히 성공
    await makeAdmin(other.id);
    const admin = (await call('POST', '/api/auth/login', { body: { email: other.email, password: PASSWORD } })).body.data.accessToken;
    expect((await call('DELETE', `/api/auth/member/${me.id}`, { token: admin })).status).toBe(200);
  });
});

describe('hello', () => {
  it('인증 필요, 메시지·시간', async () => {
    const u = await signupAndLogin();
    expect((await call('GET', '/api/hello')).status).toBe(401);
    const r = await call('GET', '/api/hello', { token: u.token });
    expect(r.body).toEqual({ message: '해피니스 모바일 앱 백엔드에서 Hello World!', status: 'success', timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/) });
  });
});
