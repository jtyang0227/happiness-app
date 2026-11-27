import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from './db.js';
import { LOCAL_DATE_TIME, call, signupAndLogin } from './helpers.js';

afterAll(closeDb);

const KEYS = ['budget', 'createdAt', 'id', 'isRead', 'message', 'receiverMemberId', 'senderEmail', 'senderName', 'shootDate', 'shootType', 'sourceSeriesId', 'sourceSeriesTitle'];

describe('문의', () => {
  it('공개 등록 201 → 수신함(최신순·출처 작업 제목)·안 읽음 수·읽음·삭제', async () => {
    const a = await signupAndLogin();
    const other = await signupAndLogin();
    const mine = await call('POST', '/api/series', { token: a.token, body: { title: '봄 웨딩' } });
    const theirs = await call('POST', '/api/series', { token: other.token, body: { title: '남의 작업' } });

    const r1 = await call('POST', '/api/inquiry', { body: { receiverMemberId: a.id, senderName: '  김고객 ', senderEmail: ' k@x.com ', message: ' 안녕하세요\n문의 ', shootType: '결혼식', sourceSeriesId: mine.body.id } });
    expect(r1.status).toBe(201);
    expect(Object.keys(r1.body).sort()).toEqual(['id', 'message']);
    expect(r1.body.message).toBe('문의가 성공적으로 접수되었습니다.');
    const r2 = await call('POST', '/api/inquiry', { body: { receiverMemberId: String(a.id), senderName: '이', senderEmail: 'l@x.com', message: '두 번째', budget: 100, sourceSeriesId: theirs.body.id } });
    expect(r2.status).toBe(201);

    const inbox = await call('GET', `/api/inquiry/inbox?memberId=${a.id}`, { token: a.token });
    expect(inbox.status).toBe(200);
    expect(inbox.body.map((x: any) => x.id)).toEqual([r2.body.id, r1.body.id]);
    expect(Object.keys(inbox.body[0]).sort()).toEqual(KEYS);
    expect(inbox.body[1]).toMatchObject({ receiverMemberId: a.id, senderName: '김고객', senderEmail: 'k@x.com', message: '안녕하세요\n문의', shootType: '결혼식',
      shootDate: null, budget: null, sourceSeriesId: mine.body.id, sourceSeriesTitle: '봄 웨딩', isRead: false });
    expect(inbox.body[1].createdAt).toMatch(LOCAL_DATE_TIME);
    expect(inbox.body[0]).toMatchObject({ budget: '100', sourceSeriesId: null, sourceSeriesTitle: null });

    expect((await call('GET', `/api/inquiry/inbox/unread-count?memberId=${a.id}`, { token: a.token })).body).toEqual({ count: 2 });
    const read = await call('PUT', `/api/inquiry/${r1.body.id}/read`, { token: a.token });
    expect(read.status).toBe(200);
    expect(read.body).toEqual({ message: '읽음 처리되었습니다.' });
    expect((await call('GET', `/api/inquiry/inbox/unread-count?memberId=${a.id}`, { token: a.token })).body).toEqual({ count: 1 });

    // 남의 수신함·읽음·삭제는 403(본문 없음), 없는 문의 404
    for (const [m, p] of [['GET', `/api/inquiry/inbox?memberId=${a.id}`], ['GET', `/api/inquiry/inbox/unread-count?memberId=${a.id}`], ['PUT', `/api/inquiry/${r1.body.id}/read`], ['DELETE', `/api/inquiry/${r1.body.id}`]] as const) {
      const f = await call(m, p, { token: other.token });
      expect(f.status, `${m} ${p}`).toBe(403);
      expect(f.body).toBeNull();
    }
    expect((await call('PUT', '/api/inquiry/999999999/read', { token: a.token })).status).toBe(404);
    expect((await call('DELETE', '/api/inquiry/999999999', { token: a.token })).status).toBe(404);

    const del = await call('DELETE', `/api/inquiry/${r1.body.id}`, { token: a.token });
    expect(del.status).toBe(204);
    expect((await call('GET', `/api/inquiry/inbox?memberId=${a.id}`, { token: a.token })).body).toHaveLength(1);
  });

  it('필수 값 검사 400 · 인증 필요 경로 401', async () => {
    const a = await signupAndLogin();
    const base = { receiverMemberId: a.id, senderName: '김', senderEmail: 'k@x.com', message: '내용' };
    const cases: [Record<string, unknown>, string][] = [
      [{ ...base, senderName: '   ' }, '보내는 분 이름을 입력해주세요.'],
      [{ ...base, senderEmail: undefined }, '이메일을 입력해주세요.'],
      [{ ...base, message: '' }, '메시지를 입력해주세요.'],
      [{ ...base, receiverMemberId: null }, 'receiverMemberId는 필수입니다.'],
    ];
    for (const [body, msg] of cases) {
      const r = await call('POST', '/api/inquiry', { body });
      expect(r.status).toBe(400);
      expect(r.body).toEqual({ message: msg });
    }
    expect((await call('GET', `/api/inquiry/inbox?memberId=${a.id}`)).status).toBe(401);
    expect((await call('GET', '/api/inquiry/inbox', { token: a.token })).status).toBe(400);
  });
});
