import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, insertDeadJob, makeAdmin } from './db.js';
import { BASE, IS_SPRING, PASSWORD, call, signupAndLogin, type User } from './helpers.js';

/**
 * 예매 일정·알림·오픈 상태 (PROMPT_server-time-booking-module.md B·E·F·G·H) — Nest에만 있는 기능이라 Spring(8080)에서는 건너뛴다.
 * 처리기(1초 주기)가 실제로 도는 서버를 상대로 하므로 결과는 몇 초 기다려 확인한다.
 */
const at = (ms: number) => new Date(Date.now() + ms).toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until<T>(fn: () => Promise<T | undefined | null | false>, timeoutMs = 12_000): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v as T;
    if (Date.now() > end) throw new Error('시간 안에 조건이 만족되지 않음');
    await sleep(500);
  }
}

async function adminUser(): Promise<User> {
  const u = await signupAndLogin();
  await makeAdmin(u.id);
  const li = await call('POST', '/api/auth/login', { body: { email: u.email, password: PASSWORD } });
  return { ...u, token: li.body.data.accessToken };
}

describe.skipIf(IS_SPRING)('tickets — 예매 일정 모듈', () => {
  afterAll(closeDb);

  it('일정 등록 → 구독 → 변경(사유·낙관적 잠금) → 변경 고지·알림 재계산 → 취소', async () => {
    const admin = await adminUser();
    const fan = await signupAndLogin();

    expect((await call('POST', '/api/admin/tickets/sessions', { token: fan.token, body: { title: 'x' } })).status).toBe(403);
    const s = await call('POST', '/api/admin/tickets/sessions', { token: admin.token, body: { title: '해피니스 사진전', venue: '서울' } });
    expect(s.status).toBe(201);
    const sid = s.body.data.id;

    // 공식 출처는 근거 링크 필수, 시간대 없는 시각·잘못된 시간대 거부
    expect((await call('POST', `/api/admin/tickets/sessions/${sid}/phases`, { token: admin.token, body: { name: '일반예매', scheduledAt: at(7200_000), timeSource: 'OFFICIAL_NOTICE' } })).status).toBe(400);
    expect((await call('POST', `/api/admin/tickets/sessions/${sid}/phases`, { token: admin.token, body: { name: '일반예매', scheduledAt: '2026-12-01T20:00:00' } })).status).toBe(400);
    const badTz = await call('POST', `/api/admin/tickets/sessions/${sid}/phases`, { token: admin.token, body: { name: '일반예매', scheduledAt: at(7200_000), timezone: '+09:00' } });
    expect(badTz.body.code).toBe('INVALID_TIMEZONE');

    const created = await call('POST', `/api/admin/tickets/sessions/${sid}/phases`, { token: admin.token, body: { name: '일반예매', announcedAt: at(7200_000), timeSource: 'OFFICIAL_NOTICE', sourceUrl: 'https://example.com/notice' } });
    expect(created.status).toBe(201);
    const phase = created.body.data.phase;
    expect(phase).toMatchObject({ openStatus: 'SCHEDULED', scheduleStatus: 'CONFIRMED', scheduleRevision: 1, timezone: 'Asia/Seoul', announcedDiffMs: 0 });

    // 2시간 남음 → 24h는 이미 지나 만들지 않고 1h·10m·1m만
    expect((await call('PUT', `/api/tickets/phases/${phase.id}/notification`, { body: { offsets: ['1h'] } })).status).toBe(401);
    const sub = await call('PUT', `/api/tickets/phases/${phase.id}/notification`, { token: fan.token, body: { offsets: ['24h', '1h', '10m', '1m'] } });
    expect(sub.body.data).toMatchObject({ enabled: true, scheduledReminders: 3 });
    expect((await call('PUT', `/api/tickets/phases/${phase.id}/notification`, { token: fan.token, body: { offsets: ['2h'] } })).status).toBe(400);

    const cd = await call('GET', `/api/tickets/sessions/${sid}/countdown`);
    expect(cd.body.data).toMatchObject({ phaseId: phase.id, openStatus: 'SCHEDULED', scheduleRevision: 1, resyncAfterMs: 300000, notice: null });
    expect(cd.body.data.remainingMs).toBeGreaterThan(7000_000);
    expect(cd.body.data.targetAtKst).toMatch(/\+09:00$/);

    const mine = await call('GET', '/api/time/next-booking?scope=mine', { token: fan.token });
    expect(mine.body.data.items.map((x: any) => x.id)).toEqual([phase.id]);

    // 사유 없음 400, revision 충돌 409
    const noReason = await call('PUT', `/api/admin/tickets/phases/${phase.id}/schedule`, { token: admin.token, body: { scheduledAt: at(10_800_000), expectedRevision: 1 } });
    expect(noReason.body.code).toBe('SCHEDULE_REASON_REQUIRED');
    const conflict = await call('PUT', `/api/admin/tickets/phases/${phase.id}/schedule`, { token: admin.token, body: { scheduledAt: at(10_800_000), expectedRevision: 9, reason: '정정' } });
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('SCHEDULE_REVISION_CONFLICT');

    const changed = await call('PUT', `/api/admin/tickets/phases/${phase.id}/schedule`, { token: admin.token, body: { scheduledAt: at(10_800_000), expectedRevision: 1, reason: '주최 측 공지 정정' } });
    expect(changed.body.data).toMatchObject({ scheduleRevision: 2, scheduleStatus: 'CHANGED', openStatus: 'SCHEDULED' });

    // 처리기가 변경 고지를 1회 보내고, 이전 revision 알림을 취소한 뒤 새로 만든다
    const notices = await until(async () => {
      const r = await call('GET', '/api/tickets/notifications', { token: fan.token });
      return r.body.data.data.some((n: any) => n.kind === 'CHANGE') && r.body.data;
    });
    expect(notices.data.filter((n: any) => n.kind === 'CHANGE')).toHaveLength(1);
    expect(notices.data[0].message).toContain('주최 측 공지 정정');
    expect(notices.data[0].message).toContain('KST');

    const hist = await call('GET', `/api/admin/tickets/phases/${phase.id}/history`, { token: admin.token });
    expect(hist.body.data.revisions.map((r: any) => r.revision)).toEqual([2, 1]);
    expect(hist.body.data.revisions[0]).toMatchObject({ reason: '주최 측 공지 정정', prevScheduleStatus: 'CONFIRMED', newScheduleStatus: 'CHANGED' });
    expect((await call('GET', `/api/admin/tickets/phases/${phase.id}/history`, { token: fan.token })).status).toBe(403);

    const cancel = await call('PUT', `/api/admin/tickets/phases/${phase.id}/schedule`, { token: admin.token, body: { scheduleStatus: 'CANCELLED', expectedRevision: 2, reason: '공연 취소' } });
    expect(cancel.body.data.scheduleStatus).toBe('CANCELLED');
    await until(async () => (await call('GET', '/api/tickets/notifications', { token: fan.token })).body.data.data.some((n: any) => n.kind === 'CANCEL'));
    const cd2 = await call('GET', `/api/tickets/sessions/${sid}/countdown?phaseId=${phase.id}`);
    expect(cd2.body.data).toMatchObject({ remainingMs: null, notice: '예매가 취소되었습니다.' });

    const mon = await call('GET', '/api/admin/tickets/monitor', { token: admin.token });
    expect(mon.body.data.queue.pending).toBeGreaterThanOrEqual(0);
    expect(mon.body.data.queue.claimed).toBeDefined();
    expect(mon.body.data.serverNowKst).toMatch(/\+09:00$/);
  }, 60_000);

  it('곧 열릴 일정 — 1분 전 알림이 한 번만 오고, 예정 시각이 지나도 OPEN_CONFIRMED는 확인 기록으로만', async () => {
    const admin = await adminUser();
    const fan = await signupAndLogin();
    const sid = (await call('POST', '/api/admin/tickets/sessions', { token: admin.token, body: { title: '오픈 확인 테스트' } })).body.data.id;
    // 예정 64초 뒤 → 1분 전 알림은 약 4초 뒤
    const phase = (await call('POST', `/api/admin/tickets/sessions/${sid}/phases`, { token: admin.token, body: { name: '선예매', scheduledAt: at(64_000) } })).body.data.phase;
    expect(phase.openStatus).toBe('UPCOMING');
    await call('PUT', `/api/tickets/phases/${phase.id}/notification`, { token: fan.token, body: { offsets: ['1m'] } });
    const got = await until(async () => {
      const r = await call('GET', '/api/tickets/notifications', { token: fan.token });
      const list = r.body.data.data.filter((n: any) => n.kind === 'REMINDER');
      return list.length > 0 && list;
    });
    expect(got).toHaveLength(1);
    expect(got[0].message).toMatch(/^\[선예매\] 오픈 확인 테스트 · 1분 후 .+ KST 오픈 예정$/);
    await sleep(3000);
    expect((await call('GET', '/api/tickets/notifications', { token: fan.token })).body.data.data.filter((n: any) => n.kind === 'REMINDER')).toHaveLength(1);

    // 이미 지난 일정으로 만든 단계 — 바로 확인 대기, 시간이 지나도 OPEN_CONFIRMED가 되지 않음
    const past = (await call('POST', `/api/admin/tickets/sessions/${sid}/phases`, { token: admin.token, body: { name: '현장예매', scheduledAt: at(-1000) } })).body.data;
    expect(past.phase.openStatus).toBe('OPEN_CHECK_PENDING');
    expect(past.warnings.join()).toContain('이미 지났습니다');
    await sleep(2500);
    const still = await call('GET', `/api/tickets/sessions/${sid}/countdown?phaseId=${past.phase.id}`);
    expect(still.body.data.openStatus).toBe('OPEN_CHECK_PENDING');
    expect(still.body.data.remainingMs).toBe(0);

    // 관리자 수동 확정은 근거 메모 필수 → OPEN → CLOSED, NOT_OPEN은 기록만
    expect((await call('POST', `/api/admin/tickets/phases/${past.phase.id}/verifications`, { token: admin.token, body: { result: 'OPEN' } })).status).toBe(400);
    const open = await call('POST', `/api/admin/tickets/phases/${past.phase.id}/verifications`, { token: admin.token, body: { result: 'OPEN', evidence: '예매처 페이지에서 예매 버튼 활성 확인' } });
    expect(open.body.data).toMatchObject({ changed: true, phase: { openStatus: 'OPEN_CONFIRMED' } });
    const noop = await call('POST', `/api/admin/tickets/phases/${past.phase.id}/verifications`, { token: admin.token, body: { result: 'NOT_OPEN', evidence: '재확인' } });
    expect(noop.body.data).toMatchObject({ changed: false, phase: { openStatus: 'OPEN_CONFIRMED' } });
    const closed = await call('POST', `/api/admin/tickets/phases/${past.phase.id}/verifications`, { token: admin.token, body: { result: 'CLOSED', evidence: '매진 공지' } });
    expect(closed.body.data.phase.openStatus).toBe('CLOSED_CONFIRMED');
    const h = await call('GET', `/api/admin/tickets/phases/${past.phase.id}/history`, { token: admin.token });
    expect(h.body.data.statusLogs.map((l: any) => l.to)).toEqual(['CLOSED_CONFIRMED', 'OPEN_CONFIRMED', 'OPEN_CHECK_PENDING']);
    expect(h.body.data.verifications).toHaveLength(3);
  }, 60_000);
  it('v2 — 안 읽은 수·모두 읽음·켠 알림 목록·.ics·실패 작업 다시 시도', async () => {
    const admin = await adminUser();
    const fan = await signupAndLogin();
    const sid = (await call('POST', '/api/admin/tickets/sessions', { token: admin.token, body: { title: '캘린더, 테스트; 공연', venue: '서울' } })).body.data.id;
    const phase = (await call('POST', `/api/admin/tickets/sessions/${sid}/phases`, { token: admin.token, body: { name: '1차 예매', scheduledAt: at(3 * 86400_000) } })).body.data.phase;

    expect((await call('GET', '/api/tickets/notifications/unread-count')).status).toBe(401);
    expect((await call('GET', '/api/tickets/me/alerts', { token: fan.token })).body.data).toEqual([]);
    await call('PUT', `/api/tickets/phases/${phase.id}/notification`, { token: fan.token, body: { offsets: ['24h', '10m'] } });
    const alerts = (await call('GET', '/api/tickets/me/alerts', { token: fan.token })).body.data;
    expect(alerts).toEqual([expect.objectContaining({ phaseId: phase.id, sessionId: sid, sessionTitle: '캘린더, 테스트; 공연', phaseName: '1차 예매', offsets: ['24h', '10m'] })]);

    // 일정 변경 → 변경 고지 1건 → 안 읽은 수 1 → 모두 읽음 → 0
    await call('PUT', `/api/admin/tickets/phases/${phase.id}/schedule`, { token: admin.token, body: { scheduledAt: at(4 * 86400_000), expectedRevision: 1, reason: '장소 사정' } });
    await until(async () => (await call('GET', '/api/tickets/notifications/unread-count', { token: fan.token })).body.data.count >= 1);
    const all = await call('POST', '/api/tickets/notifications/read-all', { token: fan.token });
    expect(all.body.data.updated).toBeGreaterThanOrEqual(1);
    expect((await call('GET', '/api/tickets/notifications/unread-count', { token: fan.token })).body.data.count).toBe(0);

    // .ics — 공개, SEQUENCE는 revision, 쉼표·세미콜론 이스케이프, CRLF
    const ics = await fetch(`${BASE}/api/tickets/phases/${phase.id}/calendar.ics`);
    expect(ics.status).toBe(200);
    expect(ics.headers.get('content-type')).toContain('text/calendar');
    const txt = await ics.text();
    expect(txt).toContain(`UID:ticket-phase-${phase.id}@happiness.io.kr`);
    expect(txt).toContain('SEQUENCE:2');
    expect(txt).toContain('캘린더\\, 테스트\\; 공연');
    expect(txt.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
    expect((await fetch(`${BASE}/api/tickets/phases/999999999/calendar.ics`)).status).toBe(404);

    // 실패 작업 — 목록·다시 시도(DEAD만), 일반 회원 403
    const jobId = await insertDeadJob(phase.id, 2);
    expect((await call('GET', '/api/admin/tickets/jobs?status=DEAD', { token: fan.token })).status).toBe(403);
    const dead = await call('GET', '/api/admin/tickets/jobs?status=DEAD', { token: admin.token });
    expect(dead.body.data.find((j: any) => j.id === jobId)).toMatchObject({ status: 'DEAD', lastError: 'test: db down' });
    expect((await call('GET', '/api/admin/tickets/jobs?status=WHAT', { token: admin.token })).status).toBe(400);
    const retried = await call('POST', `/api/admin/tickets/jobs/${jobId}/retry`, { token: admin.token });
    expect(retried.body.data).toEqual({ id: jobId, status: 'PENDING' });
    const again = await call('POST', `/api/admin/tickets/jobs/${jobId}/retry`, { token: admin.token });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('JOB_NOT_DEAD');
    expect((await call('POST', '/api/admin/tickets/jobs/999999999/retry', { token: admin.token })).status).toBe(404);
  }, 60_000);
});
