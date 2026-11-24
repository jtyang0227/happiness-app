import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from './db.js';
import { LOCAL_DATE_TIME, call, createPhoto, signupAndLogin } from './helpers.js';

afterAll(closeDb);

const RESP_KEYS = ['approvedAt', 'clientName', 'createdAt', 'expiresAt', 'feedback', 'hasPassword', 'id', 'likedCount', 'photoCount', 'status', 'title', 'token', 'viewedAt'];

describe('납품', () => {
  it('생성(만료 1~90일·중복 사진 한 행)·목록·공개 상세·조회 표시·승인(선택 사진)·선택 목록·삭제', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    const [p1, p2, p3] = [await createPhoto(u, { imageUrl: 'https://x/1.jpg' }), await createPhoto(u, { imageUrl: 'https://x/2.jpg' }), await createPhoto(u)];
    const c = await call('POST', '/api/delivery', { token: u.token, body: { title: '웨딩 셀렉', clientName: '김', photoIds: [p1, p2, p3, p1], expiresInDays: 500 } });
    expect(c.status).toBe(201);
    expect(Object.keys(c.body).sort()).toEqual(RESP_KEYS);
    expect(c.body).toMatchObject({ title: '웨딩 셀렉', clientName: '김', status: 'PENDING', photoCount: 4, likedCount: 0, hasPassword: false, viewedAt: null, approvedAt: null, feedback: null });
    expect(c.body.token).toMatch(/^[0-9a-f]{32}$/);
    const days = (Date.parse(c.body.expiresAt + 'Z') - Date.parse(c.body.createdAt + 'Z')) / 86400000;
    expect(Math.round(days)).toBe(90);
    const short = await call('POST', '/api/delivery', { token: u.token, body: { title: '짧게' } });
    expect(Math.round((Date.parse(short.body.expiresAt + 'Z') - Date.parse(short.body.createdAt + 'Z')) / 86400000)).toBe(1);

    const list = await call('GET', '/api/delivery', { token: u.token });
    expect(list.body.map((x: any) => x.id)).toEqual([short.body.id, c.body.id]);
    expect(list.body[1]).toMatchObject({ photoCount: 3, likedCount: 0 });

    const tok = c.body.token;
    const d = await call('GET', `/api/delivery/${tok}`);
    expect(d.status).toBe(200);
    expect(Object.keys(d.body).sort()).toEqual(['clientName', 'expiresAt', 'feedback', 'id', 'photos', 'status', 'title', 'token']);
    expect(d.body.expiresAt).toMatch(LOCAL_DATE_TIME);
    expect(d.body.photos).toEqual([
      { id: p2, imageUrl: 'https://x/2.jpg', thumbnailUrl: null, title: expect.any(String), liked: false, sortOrder: 1 },
      { id: p3, imageUrl: 'https://example.com/a.jpg', thumbnailUrl: null, title: expect.any(String), liked: false, sortOrder: 2 },
      { id: p1, imageUrl: 'https://x/1.jpg', thumbnailUrl: null, title: expect.any(String), liked: false, sortOrder: 3 },
    ]);
    expect((await call('POST', `/api/delivery/${tok}`)).body.id).toBe(c.body.id);

    expect((await call('PUT', `/api/delivery/${tok}/view`)).status).toBe(204);
    expect((await call('PUT', '/api/delivery/nope-token/view')).status).toBe(204);
    const viewed = (await call('GET', '/api/delivery', { token: u.token })).body[1].viewedAt;
    expect(viewed).toMatch(LOCAL_DATE_TIME);
    await call('PUT', `/api/delivery/${tok}/view`);
    expect((await call('GET', '/api/delivery', { token: u.token })).body[1].viewedAt).toBe(viewed);

    expect((await call('PUT', `/api/delivery/${tok}/approve`, { body: { feedback: 'x'.repeat(2001) } })).body).toMatchObject({ code: '400', message: '의견은 2000자 이하로 적어 주세요' });
    expect((await call('PUT', `/api/delivery/${tok}/approve`, { body: { likedPhotoIds: [p1, p3, 99999999], feedback: '좋아요' } })).status).toBe(204);
    const after = await call('GET', `/api/delivery/${tok}`);
    expect(after.body).toMatchObject({ status: 'APPROVED', feedback: '좋아요' });
    expect(after.body.photos.map((p: any) => p.liked)).toEqual([false, true, true]);
    const sum = (await call('GET', '/api/delivery', { token: u.token })).body[1];
    expect(sum.likedCount).toBe(2);
    expect(sum.approvedAt).toMatch(LOCAL_DATE_TIME);

    const sel = await call('GET', `/api/delivery/${c.body.id}/selections`, { token: u.token });
    // Spring은 정렬 없이 조회(DB 순서) — 순서 무관 비교
    expect([...sel.body].sort((a: any, b: any) => a.id - b.id)).toEqual([{ id: p1, thumbnailUrl: null, imageUrl: 'https://x/1.jpg', title: expect.any(String) }, { id: p3, thumbnailUrl: null, imageUrl: 'https://example.com/a.jpg', title: expect.any(String) }]);
    expect((await call('GET', `/api/delivery/${c.body.id}/selections`, { token: other.token })).body).toMatchObject({ code: '403', message: '접근 권한이 없습니다' });
    expect((await call('GET', `/api/delivery/${short.body.id}/selections`, { token: u.token })).body).toEqual([]);

    // 빈 선택 목록으로 승인하면 기존 선택 유지, 반려
    await call('PUT', `/api/delivery/${tok}/approve`, { body: { likedPhotoIds: [] } });
    expect((await call('GET', `/api/delivery/${tok}`)).body.photos.map((p: any) => p.liked)).toEqual([false, true, true]);
    expect((await call('PUT', `/api/delivery/${tok}/reject`, { body: { feedback: '다시' } })).status).toBe(204);
    expect((await call('GET', `/api/delivery/${tok}`)).body).toMatchObject({ status: 'REJECTED', feedback: '다시' });

    expect((await call('DELETE', `/api/delivery/${c.body.id}`, { token: other.token })).body).toMatchObject({ code: '403' });
    expect((await call('DELETE', `/api/delivery/${c.body.id}`, { token: u.token })).status).toBe(204);
    expect((await call('GET', `/api/delivery/${tok}`)).body).toMatchObject({ code: '404', message: '배달 세트를 찾을 수 없습니다' });
    expect((await call('GET', '/api/delivery')).status).toBe(401);
    expect((await call('POST', '/api/delivery', { body: { title: 'x' } })).status).toBe(401);
  });

  it('비밀번호 세트 — 열람·승인·반려 모두 비밀번호, 5회 실패 후 429', async () => {
    const u = await signupAndLogin();
    const c = await call('POST', '/api/delivery', { token: u.token, body: { title: '잠금', password: 'pw1234', expiresInDays: 7 } });
    expect(c.body.hasPassword).toBe(true);
    const tok = c.body.token;
    const no = await call('GET', `/api/delivery/${tok}`);
    expect(no.status).toBe(401);
    expect(no.body).toMatchObject({ code: '401', message: '비밀번호가 올바르지 않습니다' });
    expect((await call('POST', `/api/delivery/${tok}`, { body: { password: 'pw1234' } })).status).toBe(200);
    expect((await call('PUT', `/api/delivery/${tok}/approve`, { body: {} })).status).toBe(401);
    expect((await call('PUT', `/api/delivery/${tok}/reject`, { body: { password: 'pw1234', feedback: 'no' } })).status).toBe(204);

    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await call('POST', `/api/delivery/${tok}`, { body: { password: 'bad' } })).status);
    expect(codes).toEqual([401, 401, 401, 401, 401, 429]);
    const blocked = await call('POST', `/api/delivery/${tok}`, { body: { password: 'pw1234' } });
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ code: '429', message: '너무 많은 시도로 잠시 차단되었습니다. 15분 후 다시 시도해주세요.' });
  });
});
