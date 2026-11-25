import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, notificationsOf } from './db.js';
import { IS_SPRING, call, signupAndLogin } from './helpers.js';

// 모임 일정·장소 변경 알림 — 새 API에만 있는 동작(Spring은 알리지 않았다)
afterAll(closeDb);

const Y = new Date().getUTCFullYear() + 1;

describe.skipIf(IS_SPRING)('모임 일정·장소 변경 알림', () => {
  it('시작 시각·장소가 바뀌면 참여자·대기자에게만, 다른 항목만 바뀌면 알리지 않음', async () => {
    const host = await signupAndLogin();
    const a = await signupAndLogin();
    const waiter = await signupAndLogin();
    const no = await signupAndLogin();
    const g = (await call('POST', '/api/gatherings', { token: host.token, body: {
      title: '한강 야경', location: '반포', maxParticipants: 1,
      startDateTime: `${Y}-05-02T19:00:00`, endDateTime: `${Y}-05-02T21:00:00`, recruitmentEndDateTime: `${Y}-05-01T18:00:00`,
    } })).body;
    await call('POST', `/api/gatherings/${g.id}/participation`, { token: a.token, body: { status: 'PARTICIPATING' } });
    expect((await call('POST', `/api/gatherings/${g.id}/participation`, { token: waiter.token, body: { status: 'PARTICIPATING' } })).body.status).toBe('WAITING');
    await call('POST', `/api/gatherings/${g.id}/participation`, { token: no.token, body: { status: 'NOT_PARTICIPATING', reason: '일정' } });

    // 설명만 바꾸면 알림 없음, 같은 시각·장소를 다시 보내도 없음
    await call('PUT', `/api/gatherings/${g.id}`, { token: host.token, body: { description: '삼각대 필수', location: '반포', startDateTime: `${Y}-05-02T19:00:00` } });
    expect(await notificationsOf(a.id, 'SCHEDULE_CHANGED')).toHaveLength(0);

    // 시각과 장소를 바꾸면 참여자·대기자 알림, 미참여·만든 사람은 없음
    const u = await call('PUT', `/api/gatherings/${g.id}`, { token: host.token, body: { location: '잠수교', startDateTime: `${Y}-05-03T19:30:00`, endDateTime: `${Y}-05-03T21:30:00` } });
    expect(u.status).toBe(200);
    const day = ['일', '월', '화', '수', '목', '금', '토'][new Date(Date.UTC(Y, 4, 3)).getUTCDay()];
    for (const m of [a, waiter]) {
      const n = await notificationsOf(m.id, 'SCHEDULE_CHANGED');
      expect(n).toHaveLength(1);
      expect(n[0].message).toBe(`'한강 야경' 일정과 장소가 바뀌었습니다: 5월 3일(${day}) 19:30 · 잠수교`);
      expect(n[0].gathering_id).toBe(String(g.id));
    }
    expect(await notificationsOf(no.id, 'SCHEDULE_CHANGED')).toHaveLength(0);
    expect(await notificationsOf(host.id, 'SCHEDULE_CHANGED')).toHaveLength(0);

    // 장소만 바꾸면 "장소가"
    await call('PUT', `/api/gatherings/${g.id}`, { token: host.token, body: { location: '세빛섬' } });
    expect((await notificationsOf(a.id, 'SCHEDULE_CHANGED')).at(-1)?.message).toBe(`'한강 야경' 장소가 바뀌었습니다: 5월 3일(${day}) 19:30 · 세빛섬`);
  });
});
