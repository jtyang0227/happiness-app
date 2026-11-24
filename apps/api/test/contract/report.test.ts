import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, makeAdmin } from './db.js';
import { LOCAL_DATE_TIME, call, createPhoto, signupAndLogin } from './helpers.js';

afterAll(closeDb);

const REPORT_KEYS = ['createdAt', 'detail', 'evidenceUrl', 'id', 'photoId', 'reason', 'reporterSeen', 'resolutionNote', 'resolvedAt', 'status'];

describe('신고', () => {
  it('사진 신고 201(래퍼 없음, 사유 대문자) → 내 신고 → 관리자 처리 → 읽지 않은 결과 → 확인', async () => {
    const owner = await signupAndLogin();
    const reporter = await signupAndLogin({ name: '신고자' });
    const admin = await signupAndLogin();
    await makeAdmin(admin.id);
    const pid = await createPhoto(owner);

    const r = await call('POST', `/api/photos/${pid}/report`, { token: reporter.token, body: { reason: 'spam', detail: '광고', evidenceUrl: 'https://e/x.png' } });
    expect(r.status).toBe(201);
    expect(Object.keys(r.body).sort()).toEqual(REPORT_KEYS);
    expect(r.body).toMatchObject({ photoId: pid, reason: 'SPAM', status: 'PENDING', reporterSeen: false, resolvedAt: null });
    expect(r.body.createdAt).toMatch(LOCAL_DATE_TIME);

    const mine = await call('GET', '/api/photos/reports/mine', { token: reporter.token });
    expect(mine.body.map((x: any) => x.id)).toEqual([r.body.id]);
    expect((await call('GET', '/api/photos/reports/mine/unread-count', { token: reporter.token })).body).toEqual({ count: 0 });

    const page = await call('GET', '/api/admin/reports?status=pending&size=200', { token: admin.token });
    expect(page.status).toBe(200);
    // Spring PageImpl 키 순서는 JVM 리플렉션 순서라 프로세스마다 다를 수 있어 집합으로 비교
    expect(Object.keys(page.body).sort()).toEqual(['content', 'pageable', 'totalPages', 'totalElements', 'last', 'size', 'number', 'sort', 'numberOfElements', 'first', 'empty'].sort());
    const row = page.body.content.find((x: any) => x.id === r.body.id);
    expect(row).toMatchObject({ photo: { id: pid }, reason: 'SPAM', reporterName: '신고자', reporterEmail: reporter.email, status: 'PENDING', commentId: null, commentContent: null });

    const done = await call('PUT', `/api/admin/reports/${r.body.id}`, { token: admin.token, body: { status: 'RESOLVED', resolutionNote: '삭제함' } });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ id: r.body.id, status: 'RESOLVED', resolutionNote: '삭제함' });
    const bad = await call('PUT', `/api/admin/reports/${r.body.id}`, { token: admin.token, body: { status: 'PENDING' } });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ code: '400', message: 'status 는 RESOLVED 또는 DISMISSED 여야 합니다.' });

    expect((await call('GET', '/api/photos/reports/mine/unread-count', { token: reporter.token })).body).toEqual({ count: 1 });
    expect((await call('PUT', `/api/photos/reports/mine/${r.body.id}/seen`, { token: owner.token })).status).toBe(404);
    const seen = await call('PUT', `/api/photos/reports/mine/${r.body.id}/seen`, { token: reporter.token });
    expect(seen.body).toEqual({ message: '확인 처리되었습니다.' });
    expect((await call('GET', '/api/photos/reports/mine/unread-count', { token: reporter.token })).body).toEqual({ count: 0 });
  });

  it('사유 오류 400 · OTHER는 detail 필수 · 없는 사진 404 · 10분 5건 초과 429', async () => {
    const owner = await signupAndLogin();
    const u = await signupAndLogin();
    const pid = await createPhoto(owner);
    expect((await call('POST', `/api/photos/${pid}/report`, { token: u.token, body: { reason: 'nope' } })).body.message).toContain('중 하나여야 합니다');
    expect((await call('POST', `/api/photos/${pid}/report`, { token: u.token, body: { reason: 'OTHER', detail: ' ' } })).body.message).toBe('reason 이 OTHER 일 때는 detail 을 반드시 입력해야 합니다.');
    const missing = await call('POST', '/api/photos/999999999/report', { token: u.token, body: { reason: 'SPAM' } });
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe('사진을 찾을 수 없습니다.');
    for (let i = 0; i < 5; i++) expect((await call('POST', `/api/photos/${pid}/report`, { token: u.token, body: { reason: 'SPAM' } })).status).toBe(201);
    const limited = await call('POST', `/api/photos/${pid}/report`, { token: u.token, body: { reason: 'SPAM' } });
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ code: '429', message: '너무 많은 신고를 제출했습니다. 10분 후에 다시 시도해주세요.' });
  });

  it('댓글 신고 — 본인 댓글 400, 관리자 목록에 댓글 내용, 비관리자 403, 비로그인 401', async () => {
    const author = await signupAndLogin({ name: '댓글러' });
    const u = await signupAndLogin();
    const admin = await signupAndLogin();
    await makeAdmin(admin.id);
    const pid = await createPhoto(author);
    const c = (await call('POST', `/api/photos/${pid}/comments`, { token: author.token, body: { content: '나쁜 댓글' } })).body.data;
    expect((await call('POST', `/api/comments/${c.id}/report`, { token: author.token, body: { reason: 'SPAM' } })).body.message).toBe('본인 댓글은 신고할 수 없습니다.');
    const r = await call('POST', `/api/comments/${c.id}/report`, { token: u.token, body: { reason: 'inappropriate', evidenceUrl: 'https://x' } });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ photoId: pid, reason: 'INAPPROPRIATE', evidenceUrl: null });
    expect((await call('POST', '/api/comments/999999999/report', { token: u.token, body: { reason: 'SPAM' } })).status).toBe(404);

    const list = await call('GET', '/api/admin/reports?size=200', { token: admin.token });
    expect(list.body.content.find((x: any) => x.id === r.body.id)).toMatchObject({ commentId: c.id, commentContent: '나쁜 댓글', commentAuthorName: '댓글러' });
    const denied = await call('GET', '/api/admin/reports', { token: u.token });
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ code: 'B001' });
    expect((await call('GET', '/api/photos/reports/mine')).status).toBe(401);
    expect((await call('GET', '/api/admin/reports?page=-1', { token: admin.token })).body).toMatchObject({ code: 'C002', message: 'Page index must not be less than zero' });
  });
});
