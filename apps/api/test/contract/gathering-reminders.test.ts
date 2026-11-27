import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, notificationsOf } from './db.js';
import { IS_SPRING, call, signupAndLogin } from './helpers.js';

// 모임 일정 알림(PLANNING_gathering-schedule-reminders.md) — 새 API에만 있는 동작.
// 리마인더·모집 소식은 배치라 scripts/run-batch.mjs를 직접 실행한다(같은 DB, npm run build 필요).
afterAll(closeDb);

const API_DIR = fileURLToPath(new URL('../../', import.meta.url));
const runBatch = (job: string) => execFileSync('node', ['scripts/run-batch.mjs', job], { cwd: API_DIR, stdio: 'pipe', timeout: 60000 });
/** 지금부터 h시간 뒤의 한국 시간 벽시계 값("2026-11-27T19:00:00") — 모임 시각은 시간대 없이 한국 시간으로 저장된다 */
const wall = (h: number) => new Date(Date.now() + (9 + h) * 3600000).toISOString().slice(0, 19);
const Y = new Date().getUTCFullYear() + 1;

async function create(token: string, body: Record<string, unknown>) {
  return call('POST', '/api/gatherings', { token, body: { title: '출사', location: '반포', maxParticipants: 5, ...body } });
}
const join = (id: number, token: string) => call('POST', `/api/gatherings/${id}/participation`, { token, body: { status: 'PARTICIPATING' } });

describe.skipIf(IS_SPRING)('모임 일정 알림', () => {
  it('최소 인원: 저장·응답, 최대보다 크면 400, 0이면 해제', async () => {
    const host = await signupAndLogin();
    const base = { startDateTime: `${Y}-06-06T10:00:00`, endDateTime: `${Y}-06-06T12:00:00`, recruitmentEndDateTime: `${Y}-06-05T18:00:00` };
    expect((await create(host.token, { ...base, minParticipants: 6 })).status).toBe(400);
    const g = (await create(host.token, { ...base, minParticipants: 3 })).body;
    expect(g.minParticipants).toBe(3);
    expect((await call('PUT', `/api/gatherings/${g.id}`, { token: host.token, body: { maxParticipants: 2 } })).status).toBe(400);
    expect((await call('PUT', `/api/gatherings/${g.id}`, { token: host.token, body: { minParticipants: 0 } })).body.minParticipants).toBeNull();
    expect((await create(host.token, base)).body.minParticipants).toBeNull();
  });

  it('정원이 차면 만든 사람에게 1회, 모집 마감 때 최소 인원 미달이면 알림', async () => {
    const host = await signupAndLogin();
    const [a, b, c] = [await signupAndLogin(), await signupAndLogin(), await signupAndLogin()];
    const base = { startDateTime: `${Y}-06-07T10:00:00`, endDateTime: `${Y}-06-07T12:00:00`, recruitmentEndDateTime: `${Y}-06-06T18:00:00` };
    const full = (await create(host.token, { ...base, title: '정원 2명', maxParticipants: 2 })).body;
    await join(full.id, a.token);
    expect(await notificationsOf(host.id, 'GATHERING_FULL')).toHaveLength(0);
    await join(full.id, b.token);
    expect((await join(full.id, c.token)).body.status).toBe('WAITING');
    const n = await notificationsOf(host.id, 'GATHERING_FULL');
    expect(n).toHaveLength(1);
    expect(n[0].message).toContain("'정원 2명' 정원 2명이 다 찼어요");

    const small = (await create(host.token, { ...base, title: '최소 3명', minParticipants: 3 })).body;
    await join(small.id, a.token);
    expect((await call('POST', `/api/gatherings/${small.id}/close-recruitment`, { token: host.token })).status).toBe(200);
    const m = await notificationsOf(host.id, 'MIN_NOT_MET');
    expect(m).toHaveLength(1);
    expect(m[0].message).toBe("'최소 3명' 모집이 끝났지만 최소 인원 3명에 못 미쳐요(참여 1명). 일정 변경이나 취소를 검토해 주세요.");
  });

  it('새 모임을 열면 팔로워에게(만든 사람 제외)', async () => {
    const host = await signupAndLogin();
    const fan = await signupAndLogin();
    await call('POST', `/api/follows?followerId=${fan.id}&followingId=${host.id}`, { token: fan.token });
    const g = (await create(host.token, { title: '새벽 출사', startDateTime: `${Y}-06-08T05:00:00`, endDateTime: `${Y}-06-08T07:00:00`, recruitmentEndDateTime: `${Y}-06-07T18:00:00` })).body;
    const n = await notificationsOf(fan.id, 'NEW_GATHERING');
    expect(n).toHaveLength(1);
    expect(n[0].gathering_id).toBe(String(g.id));
    expect(n[0].message).toContain("새 출사 모임을 열었어요: '새벽 출사'");
    expect(await notificationsOf(host.id, 'NEW_GATHERING')).toHaveLength(0);
  });

  it('리마인더 배치: 모집 마감 임박(만든 사람)·전날·곧 시작(참여자), 다시 돌려도 중복 없음', async () => {
    const host = await signupAndLogin();
    const a = await signupAndLogin();
    const late = await signupAndLogin();
    const day = (await create(host.token, { title: '내일 출사', minParticipants: 3, preparationNote: '삼각대',
      recruitmentEndDateTime: wall(10), startDateTime: wall(20), endDateTime: wall(22) })).body;
    const soon = (await create(host.token, { title: '곧 출사', recruitmentEndDateTime: wall(0.5), startDateTime: wall(1), endDateTime: wall(3) })).body;
    await join(day.id, a.token);
    await join(soon.id, a.token);

    runBatch('gathering-reminders');
    const closing = (await notificationsOf(host.id, 'RECRUITMENT_CLOSING')).filter((n) => n.gathering_id === String(day.id));
    expect(closing).toHaveLength(1);
    expect(closing[0].message).toMatch(/^'내일 출사' 모집이 .+에 마감돼요\. 지금 1\/5명 · 최소 3명까지 2명 더 필요해요$/);
    const dayN = (await notificationsOf(a.id, 'GATHERING_REMINDER_DAY')).filter((n) => n.gathering_id === String(day.id));
    expect(dayN).toHaveLength(1);
    expect(dayN[0].message).toContain('· 반포 · 준비물: 삼각대');
    expect((await notificationsOf(a.id, 'GATHERING_REMINDER_SOON')).filter((n) => n.gathering_id === String(soon.id))).toHaveLength(1);
    // 2시간 안 모임은 전날 알림 없이 "곧 시작"만, 만든 사람(참여 안 함)은 리마인더 없음
    expect((await notificationsOf(a.id, 'GATHERING_REMINDER_DAY')).filter((n) => n.gathering_id === String(soon.id))).toHaveLength(0);
    expect(await notificationsOf(host.id, 'GATHERING_REMINDER_DAY')).toHaveLength(0);

    // 뒤늦게 참여한 사람은 다음 배치에서 받고, 이미 받은 사람은 다시 안 받음
    await join(day.id, late.token);
    runBatch('gathering-reminders');
    expect((await notificationsOf(a.id, 'GATHERING_REMINDER_DAY')).filter((n) => n.gathering_id === String(day.id))).toHaveLength(1);
    expect((await notificationsOf(late.id, 'GATHERING_REMINDER_DAY')).filter((n) => n.gathering_id === String(day.id))).toHaveLength(1);
    expect((await notificationsOf(host.id, 'RECRUITMENT_CLOSING')).filter((n) => n.gathering_id === String(day.id))).toHaveLength(1);
  }, 120000);

  it('이번 달 출사 모집 소식: 최근 참여자에게 한 달에 한 번', async () => {
    const host = await signupAndLogin();
    const a = await signupAndLogin();
    // 이번 달(한국 시간) 안에 시작하는 모집 중 모임 — 월말이면 이번 달 안에 둘 시간이 없어 건너뜀
    const now = new Date(Date.now() + 9 * 3600000);
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    if (lastDay - now.getUTCDate() < 1) return;
    const g = (await create(host.token, { title: '월간 소식 출사', recruitmentEndDateTime: wall(12), startDateTime: wall(24), endDateTime: wall(26) })).body;
    await join(g.id, a.token);
    runBatch('monthly-digest');
    const n = await notificationsOf(a.id, 'MONTHLY_DIGEST');
    expect(n).toHaveLength(1);
    expect(n[0].gathering_id).toBe('0');
    expect(n[0].message).toMatch(new RegExp(`^${now.getUTCMonth() + 1}월 출사 모집 소식 — 모집 중인 모임 \\d+개: `));
    runBatch('monthly-digest');
    expect(await notificationsOf(a.id, 'MONTHLY_DIGEST')).toHaveLength(1);
  }, 120000);
});
