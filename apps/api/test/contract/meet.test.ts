import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from './db.js';
import { LOCAL_DATE_TIME, call, signupAndLogin } from './helpers.js';

afterAll(closeDb);

const KEYS = ['confirmedDate', 'confirmedTime', 'createdAt', 'id', 'initialMessage', 'locationAddress', 'locationLat', 'locationLng', 'locationName', 'messageCount',
  'receiverAvatarUrl', 'receiverId', 'receiverName', 'receiverProfileName', 'requesterAvatarUrl', 'requesterId', 'requesterName', 'requesterProfileName', 'status', 'updatedAt'];

describe('약속', () => {
  it('요청 → 수락 → 가능 날짜 → 확정 → 완료, 메시지, 목록·대기 수', async () => {
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    const outsider = await signupAndLogin();
    const c = await call('POST', '/api/meets', { token: a.token, body: { receiverId: b.id, proposedDates: ['2027-07-10', '2027-07-12'], locationName: ' <b>한강</b> ', locationLat: '37.5', locationLng: 127, initialMessage: '안녕<script>x</script>' } });
    expect(c.status).toBe(201);
    expect(Object.keys(c.body).sort()).toEqual(KEYS);
    expect(c.body).toMatchObject({ status: 'PENDING', requesterId: a.id, requesterName: '테스터', requesterProfileName: a.profileName, receiverId: b.id, receiverProfileName: b.profileName,
      locationName: '한강', locationAddress: null, locationLat: 37.5, locationLng: 127, initialMessage: '안녕x', confirmedDate: null, messageCount: 0 });
    expect(c.body.createdAt).toMatch(LOCAL_DATE_TIME);
    const id = c.body.id;

    expect((await call('GET', '/api/meets/pending-count', { token: b.token })).body).toEqual({ count: 1 });
    expect((await call('GET', '/api/meets/pending-count', { token: a.token })).body).toEqual({ count: 0 });
    const av0 = await call('GET', `/api/meets/${id}/availability`, { token: b.token });
    expect(av0.body).toEqual({ [a.id]: { memberId: a.id, dates: ['2027-07-10', '2027-07-12'], times: [], updatedAt: expect.stringMatching(LOCAL_DATE_TIME) } });

    // 접근 403, 요청자 응답 403, 잘못된 action 400
    for (const p of ['', '/availability', '/messages']) expect((await call('GET', `/api/meets/${id}${p}`, { token: outsider.token })).body).toMatchObject({ code: '403', message: '접근 권한이 없습니다.' });
    expect((await call('PUT', `/api/meets/${id}/respond`, { token: a.token, body: { action: 'accept' } })).body).toMatchObject({ code: '403', message: '수신자만 응답할 수 있습니다.' });
    expect((await call('PUT', `/api/meets/${id}/respond`, { token: b.token, body: { action: 'maybe' } })).body).toMatchObject({ code: '400', message: 'action은 accept 또는 reject여야 합니다.' });
    expect((await call('PUT', `/api/meets/${id}/confirm`, { token: a.token, body: { date: '2027-07-10' } })).body).toMatchObject({ code: '400', message: '날짜 조율 중인 약속만 확정할 수 있습니다.' });

    // 수신자가 가능 날짜를 내면 NEGOTIATING
    expect((await call('POST', `/api/meets/${id}/availability`, { token: b.token, body: { dates: ['2027-07-12', ''], times: ['10:00'] } })).status).toBe(204);
    expect((await call('GET', `/api/meets/${id}`, { token: a.token })).body.status).toBe('NEGOTIATING');
    const av = await call('GET', `/api/meets/${id}/availability`, { token: a.token });
    expect(Object.keys(av.body)).toEqual([String(a.id), String(b.id)]);
    expect(av.body[b.id]).toMatchObject({ dates: ['2027-07-12'], times: ['10:00'] });
    expect((await call('PUT', `/api/meets/${id}/respond`, { token: b.token, body: { action: 'accept' } })).body).toMatchObject({ code: '400', message: '이미 처리된 요청입니다.' });

    const loc = await call('PUT', `/api/meets/${id}/location`, { token: a.token, body: { locationName: '성수', locationLat: 37.54 } });
    expect(loc.status).toBe(204);
    const afterLoc = (await call('GET', `/api/meets/${id}`, { token: a.token })).body;
    expect(afterLoc).toMatchObject({ locationName: '성수', locationAddress: null, locationLat: 37.54, locationLng: null });
    expect((await call('PUT', `/api/meets/${id}/location`, { token: a.token, body: { locationLat: 91 } })).body).toMatchObject({ code: '400', message: '유효하지 않은 위도입니다.' });
    expect((await call('PUT', `/api/meets/${id}/location`, { token: a.token, body: { locationLng: -181 } })).body).toMatchObject({ code: '400', message: '유효하지 않은 경도입니다.' });

    expect((await call('PUT', `/api/meets/${id}/confirm`, { token: b.token, body: { date: '2027-07-12', time: '10:00' } })).status).toBe(204);
    expect((await call('GET', `/api/meets/${id}`, { token: a.token })).body).toMatchObject({ status: 'CONFIRMED', confirmedDate: '2027-07-12', confirmedTime: '10:00' });

    const m1 = await call('POST', `/api/meets/${id}/messages`, { token: a.token, body: { content: '  <i>좋아요</i> ' } });
    expect(m1.status).toBe(201);
    expect(m1.body).toEqual({ id: expect.any(Number), meetId: id, senderId: a.id, senderName: '테스터', senderAvatar: null, content: '좋아요', createdAt: expect.stringMatching(LOCAL_DATE_TIME) });
    await call('POST', `/api/meets/${id}/messages`, { token: b.token, body: { content: '네' } });
    expect((await call('GET', `/api/meets/${id}/messages`, { token: b.token })).body.map((x: any) => x.content)).toEqual(['좋아요', '네']);
    expect((await call('POST', `/api/meets/${id}/messages`, { token: a.token, body: { content: '   ' } })).body).toMatchObject({ code: '400', message: '메시지 내용을 입력하세요.' });
    expect((await call('POST', `/api/meets/${id}/messages`, { token: a.token, body: { content: 'x'.repeat(1001) } })).body).toMatchObject({ code: '400', message: '메시지는 1000자 이하로 입력하세요.' });

    expect((await call('PUT', `/api/meets/${id}/complete`, { token: a.token })).status).toBe(204);
    expect((await call('PUT', `/api/meets/${id}/cancel`, { token: a.token })).body).toMatchObject({ code: '400', message: '완료된 약속은 취소할 수 없습니다.' });
    expect((await call('POST', `/api/meets/${id}/availability`, { token: a.token, body: {} })).body).toMatchObject({ code: '400', message: '이미 종료된 약속입니다.' });

    const list = await call('GET', '/api/meets', { token: a.token });
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id, status: 'COMPLETED', messageCount: 2 });
  });

  it('요청 검사 — 자기 자신 400·없는 상대 404, 거절·취소 후 메시지 400, 인증 401', async () => {
    const a = await signupAndLogin();
    const b = await signupAndLogin();
    expect((await call('POST', '/api/meets', { token: a.token, body: { receiverId: a.id } })).body).toMatchObject({ code: '400', message: '자기 자신에게 약속을 요청할 수 없습니다.' });
    expect((await call('POST', '/api/meets', { token: a.token, body: { receiverId: 999999999 } })).body).toMatchObject({ code: '404', message: '상대방을 찾을 수 없습니다.' });
    expect((await call('POST', '/api/meets', { token: a.token, body: { receiverId: b.id, locationLat: -100 } })).body).toMatchObject({ code: '400', message: '유효하지 않은 위도입니다.' });
    const m = await call('POST', '/api/meets', { token: a.token, body: { receiverId: b.id } });
    expect((await call('GET', `/api/meets/${m.body.id}/availability`, { token: a.token })).body).toEqual({});
    expect((await call('PUT', `/api/meets/${m.body.id}/respond`, { token: b.token, body: { action: 'reject' } })).status).toBe(204);
    expect((await call('GET', `/api/meets/${m.body.id}`, { token: b.token })).body.status).toBe('CANCELLED');
    expect((await call('POST', `/api/meets/${m.body.id}/messages`, { token: a.token, body: { content: 'hi' } })).body).toMatchObject({ code: '400', message: '취소된 약속에는 메시지를 보낼 수 없습니다.' });
    expect((await call('PUT', `/api/meets/${m.body.id}/complete`, { token: a.token })).body).toMatchObject({ code: '400', message: '확정된 약속만 완료 처리할 수 있습니다.' });
    expect((await call('GET', '/api/meets')).status).toBe(401);
  });
});
