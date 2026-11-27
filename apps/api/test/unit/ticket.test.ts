import { describe, expect, it } from 'vitest';
import { applyVerification, canTransition, OPEN_STATUSES, OpenStatus, recalc, restoreAfterSyncError, tick, timeBasedStatus, Trigger } from '../../src/ticket/open-status.js';
import { backoffMs, isValidTimezone, kstShort, parseOffsets, reminderMessage, resyncAfterMs, withinGrace } from '../../src/ticket/ticket-time.js';
import { countdownBody } from '../../src/ticket/countdown.js';
import { evaluateGuard } from '../../src/ticket/ticket-worker.service.js';
import { notifyJobs } from '../../src/ticket/ticket.service.js';

const T0 = new Date('2026-12-01T11:00:00.000Z'); // KST 12/1(화) 20:00
const before = (ms: number) => new Date(T0.getTime() - ms);
const after = (ms: number) => new Date(T0.getTime() + ms);

describe('G — 오픈 상태 전이표', () => {
  const TRIGGERS: Trigger[] = ['TICK', 'RECALC', 'CHECK_EXHAUSTED', 'SYNC_ERROR', 'SYNC_RECOVERED'];

  it('OPEN_CONFIRMED로 가는 길은 VERIFICATION 하나뿐(시각 비교만으로는 불가)', () => {
    for (const from of OPEN_STATUSES) for (const t of TRIGGERS) expect(canTransition(from, 'OPEN_CONFIRMED', t) && t !== 'SYNC_RECOVERED').toBe(false);
    expect(canTransition('OPEN_CHECK_PENDING', 'OPEN_CONFIRMED', 'VERIFICATION')).toBe(true);
    expect(canTransition('SCHEDULED', 'OPEN_CONFIRMED', 'VERIFICATION')).toBe(false);
    expect(canTransition('UPCOMING', 'OPEN_CONFIRMED', 'VERIFICATION')).toBe(false);
  });

  it('시각 기준 판정은 SCHEDULED·UPCOMING·OPEN_CHECK_PENDING만 낸다', () => {
    expect(timeBasedStatus(T0, before(2 * 3600_000))).toBe('SCHEDULED');
    expect(timeBasedStatus(T0, before(3600_000))).toBe('UPCOMING');
    expect(timeBasedStatus(T0, before(1))).toBe('UPCOMING');
    expect(timeBasedStatus(T0, T0)).toBe('OPEN_CHECK_PENDING');
    expect(timeBasedStatus(T0, after(5000))).toBe('OPEN_CHECK_PENDING');
  });

  it('tick — 1시간 전 UPCOMING, 예정 시각에 OPEN_CHECK_PENDING, 10분 동안 확인 없으면 UNKNOWN', () => {
    const base = { scheduledAt: T0, scheduleStatus: 'CONFIRMED' as const };
    expect(tick({ ...base, openStatus: 'SCHEDULED' }, before(3600_001))).toBeNull();
    expect(tick({ ...base, openStatus: 'SCHEDULED' }, before(3600_000))?.to).toBe('UPCOMING');
    expect(tick({ ...base, openStatus: 'UPCOMING' }, T0)?.to).toBe('OPEN_CHECK_PENDING');
    expect(tick({ ...base, openStatus: 'SCHEDULED' }, after(1))?.to).toBe('OPEN_CHECK_PENDING'); // 1시간 창을 건너뛴 경우
    expect(tick({ ...base, openStatus: 'OPEN_CHECK_PENDING', checkPendingSince: T0 }, after(599_999))).toBeNull();
    expect(tick({ ...base, openStatus: 'OPEN_CHECK_PENDING', checkPendingSince: T0 }, after(600_000))?.to).toBe('UNKNOWN');
    for (const s of ['OPEN_CONFIRMED', 'CLOSED_CONFIRMED', 'UNKNOWN', 'TIME_SYNC_ERROR'] as OpenStatus[]) expect(tick({ ...base, openStatus: s }, after(86400_000))).toBeNull();
    // 취소·연기는 상태를 건드리지 않는다(화면은 "취소됨" 우선)
    expect(tick({ ...base, scheduleStatus: 'CANCELLED', openStatus: 'UPCOMING' }, T0)).toBeNull();
  });

  it('일정 변경 뒤 재판정 — 뒤로 미뤄지면 UPCOMING → SCHEDULED, 종료는 그대로', () => {
    expect(recalc('UPCOMING', after(3 * 3600_000), T0)).toBe('SCHEDULED');
    expect(recalc('OPEN_CHECK_PENDING', after(600_000), T0)).toBe('UPCOMING');
    expect(recalc('CLOSED_CONFIRMED', after(3 * 3600_000), T0)).toBe('CLOSED_CONFIRMED');
    expect(canTransition('UPCOMING', 'SCHEDULED', 'TICK')).toBe(false);
    expect(canTransition('UPCOMING', 'SCHEDULED', 'RECALC')).toBe(true);
  });

  it('확인 기록 반영 — OPEN·CLOSED만 상태를 바꾸고 NOT_OPEN·ERROR는 기록만', () => {
    expect(applyVerification('OPEN_CHECK_PENDING', 'OPEN')).toBe('OPEN_CONFIRMED');
    expect(applyVerification('UNKNOWN', 'CLOSED')).toBe('CLOSED_CONFIRMED');
    expect(applyVerification('OPEN_CONFIRMED', 'CLOSED')).toBe('CLOSED_CONFIRMED');
    expect(applyVerification('OPEN_CHECK_PENDING', 'NOT_OPEN')).toBeNull();
    expect(applyVerification('OPEN_CHECK_PENDING', 'ERROR')).toBeNull();
    expect(applyVerification('SCHEDULED', 'OPEN')).toBeNull(); // 아직 예정 시각 전이면 확인 결과가 와도 바로 오픈 확정 안 함
    expect(applyVerification('CLOSED_CONFIRMED', 'OPEN')).toBeNull();
    expect(applyVerification('TIME_SYNC_ERROR', 'OPEN')).toBeNull();
  });

  it('시간 오류 — 종료 상태는 유지, 복구 때 보관 상태로 다시 판정', () => {
    for (const s of OPEN_STATUSES) expect(canTransition(s, 'TIME_SYNC_ERROR', 'SYNC_ERROR')).toBe(s !== 'CLOSED_CONFIRMED' && s !== 'TIME_SYNC_ERROR');
    expect(restoreAfterSyncError('SCHEDULED', T0, before(1000))).toBe('UPCOMING');
    expect(restoreAfterSyncError('UPCOMING', T0, after(1000))).toBe('OPEN_CHECK_PENDING');
    expect(restoreAfterSyncError('OPEN_CONFIRMED', T0, after(1000))).toBe('OPEN_CONFIRMED');
    expect(restoreAfterSyncError(null, T0, before(5 * 3600_000))).toBe('SCHEDULED');
  });
});

describe('F — 알림 시점 계산', () => {
  it('fire_at = 예정 − offset, 이미 지난 시점은 만들지 않는다', () => {
    const p = { id: BigInt(7), scheduled_at: T0, schedule_revision: 3 };
    const jobs = notifyJobs(BigInt(42), p, ['24h', '1h', '10m', '1m'], before(30 * 60_000));
    expect(jobs.map((j) => j.payload.offset)).toEqual(['10m', '1m']);
    expect(jobs.map((j) => j.runAt.toISOString())).toEqual(['2026-12-01T10:50:00.000Z', '2026-12-01T10:59:00.000Z']);
    expect(jobs[0].dedupeKey).toBe('notify:42:7:10m:3');
    expect(jobs.every((j) => j.timeSensitive)).toBe(true);
  });

  it('하루 전은 24시간 전 — 프로세스 TZ와 무관', () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      const [j] = notifyJobs(BigInt(1), { id: BigInt(1), scheduled_at: T0, schedule_revision: 1 }, ['24h'], before(30 * 3600_000));
      expect(j.runAt.toISOString()).toBe('2026-11-30T11:00:00.000Z');
      expect(kstShort(T0)).toBe('12/1(화) 20:00 KST');
    } finally {
      process.env.TZ = original;
    }
  });

  it('놓친 알림 유예 — 1분 전 알림은 20초, 예매가 시작된 뒤에는 무조건 건너뜀', () => {
    const runAt = before(60_000);
    expect(withinGrace(runAt, '1m', T0, new Date(runAt.getTime() + 20_000))).toBe(true);
    expect(withinGrace(runAt, '1m', T0, new Date(runAt.getTime() + 20_001))).toBe(false);
    expect(withinGrace(before(86400_000), '24h', T0, before(86400_000 - 29 * 60_000))).toBe(true);
    expect(withinGrace(before(600_000), '10m', T0, T0)).toBe(false);
  });

  it('알림 시점 입력 검증·정렬', () => {
    expect(parseOffsets(['1m', '24h', '1m', '10m'])).toEqual(['24h', '10m', '1m']);
    expect(parseOffsets('1h,10m')).toEqual(['1h', '10m']);
    expect(() => parseOffsets(['2h'])).toThrow();
  });

  it('문구 — KST 시각과 남은 시간 포함, 자정 넘김', () => {
    expect(reminderMessage('일반예매', 'OO 콘서트', '10m', T0)).toBe('[일반예매] OO 콘서트 · 10분 후 12/1(화) 20:00 KST 오픈 예정');
    expect(kstShort(new Date('2026-11-30T15:00:00Z'))).toBe('12/1(화) 00:00 KST');
  });
});

describe('시간대·재동기화·재시도', () => {
  it('IANA 이름만 받는다', () => {
    for (const ok of ['Asia/Seoul', 'UTC', 'America/New_York', 'Etc/GMT+9']) expect(isValidTimezone(ok)).toBe(true);
    for (const bad of ['+09:00', 'KST+9', 'Asia/Nowhere', '', null, 9]) expect(isValidTimezone(bad)).toBe(false);
  });
  it('남은 시간이 짧을수록 자주 다시 맞춘다', () => {
    expect([null, 4 * 3600_000, 30 * 60_000, 5 * 60_000, 30_000].map(resyncAfterMs)).toEqual([300_000, 300_000, 60_000, 15_000, 5_000]);
  });
  it('재시도 간격 10초 → 30초 → 2분 → 10분', () => {
    expect([1, 2, 3, 4, 9].map(backoffMs)).toEqual([10_000, 30_000, 120_000, 600_000, 600_000]);
  });
});

describe('E — 시간 동기화 가드', () => {
  it('UNHEALTHY·DB 시계 500ms 초과면 멈춘다, UNKNOWN·DEGRADED는 계속(화면엔 경고)', () => {
    expect(evaluateGuard('HEALTHY', 3).healthy).toBe(true);
    expect(evaluateGuard('DEGRADED', null).healthy).toBe(true);
    expect(evaluateGuard('UNKNOWN', null).healthy).toBe(true);
    expect(evaluateGuard('UNHEALTHY', 0).healthy).toBe(false);
    expect(evaluateGuard('HEALTHY', -501)).toMatchObject({ healthy: false, grade: 'UNHEALTHY' });
    expect(evaluateGuard('HEALTHY', null, 'UNHEALTHY').reason).toContain('FORCE_SYNC_STATUS');
  });
});

describe('D — 카운트다운 응답', () => {
  const phase = { id: 456, session_id: 123, name: '일반예매', announced_at: T0, scheduled_at: T0, timezone: 'Asia/Seoul', time_source: 'OFFICIAL_NOTICE', verified_at: null, schedule_status: 'CONFIRMED', open_status: 'SCHEDULED', schedule_revision: 3 };

  it('남은 시간·KST 표기·재동기화 간격', () => {
    const b = countdownBody(phase, before(337_794_877), 'HEALTHY', 3.2);
    expect(b).toMatchObject({ remainingMs: 337_794_877, targetAtKst: '2026-12-01T20:00:00.000+09:00', targetAtUtc: '2026-12-01T11:00:00.000Z', accuracy: { level: 'OK', serverOffsetMs: 3.2 }, resyncAfterMs: 300_000, notice: null });
  });
  it('0이 돼도 상태는 서버 판정값 그대로, 취소면 남은 시간 null', () => {
    expect(countdownBody({ ...phase, open_status: 'OPEN_CHECK_PENDING' }, after(1000), 'HEALTHY', 0)).toMatchObject({ remainingMs: 0, openStatus: 'OPEN_CHECK_PENDING' });
    expect(countdownBody({ ...phase, schedule_status: 'CANCELLED' }, before(1000), 'HEALTHY', 0)).toMatchObject({ remainingMs: null, notice: '예매가 취소되었습니다.' });
  });
  it('서버 시간 비정상이면 UNRELIABLE + 안내', () => {
    expect(countdownBody(phase, before(1000), 'UNHEALTHY', 900)).toMatchObject({ accuracy: { level: 'UNRELIABLE' }, notice: '서버 시간 점검 중이라 남은 시간이 부정확할 수 있습니다.' });
    expect(countdownBody(phase, before(1000), 'UNKNOWN', null).accuracy.level).toBe('WARN');
  });
});

describe('v2 — iCalendar(.ics)', async () => {
  const { buildIcs, foldLine, icsDate, icsText } = await import('../../src/ticket/ics.js');
  const base = { id: 7, name: '1차 예매', scheduledAt: T0, revision: 3, scheduleStatus: 'CHANGED', sessionTitle: '사진전, 서울; 앙코르', venue: '서울', url: 'http://localhost:3000/tickets/2', updatedAt: T0 };

  it('UTC 시각·고정 UID·SEQUENCE=revision·CRLF', () => {
    const s = buildIcs(base, T0);
    expect(icsDate(T0)).toBe('20261201T110000Z');
    expect(s).toContain('DTSTART:20261201T110000Z');
    expect(s).toContain('UID:ticket-phase-7@happiness.io.kr');
    expect(s).toContain('SEQUENCE:3');
    expect(s).toContain('STATUS:CONFIRMED');
    expect(s).toContain('TRIGGER:-PT10M');
    expect(s.endsWith('\r\n')).toBe(true);
    expect(s.replace(/\r\n/g, '')).not.toMatch(/\n/);
  });

  it('텍스트 이스케이프', () => {
    expect(icsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    expect(buildIcs(base, T0)).toContain('사진전\\, 서울\\; 앙코르');
  });

  it('75바이트 접기 — 한글을 가르지 않고 이어지는 줄은 공백으로 시작', () => {
    const long = 'SUMMARY:' + '가'.repeat(60);
    const folded = foldLine(long).split('\r\n');
    expect(folded.length).toBeGreaterThan(1);
    for (const [i, l] of folded.entries()) {
      expect(Buffer.byteLength(l, 'utf8')).toBeLessThanOrEqual(75);
      if (i > 0) expect(l.startsWith(' ')).toBe(true);
    }
    expect(folded.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(long);
  });

  it('취소는 STATUS:CANCELLED, 알림 없음 / 미확정은 TENTATIVE', () => {
    const c = buildIcs({ ...base, scheduleStatus: 'CANCELLED' }, T0);
    expect(c).toContain('STATUS:CANCELLED');
    expect(c).not.toContain('VALARM');
    expect(buildIcs({ ...base, scheduleStatus: 'TENTATIVE' }, T0)).toContain('STATUS:TENTATIVE');
  });
});
