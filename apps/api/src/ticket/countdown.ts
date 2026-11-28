import { isoKst, isoUtc } from '../time/time-sync.js';
import { resyncAfterMs } from './ticket-time.js';

export interface PhaseForCountdown {
  id: bigint | number;
  session_id: bigint | number;
  name: string;
  announced_at: Date | null;
  scheduled_at: Date;
  timezone: string;
  time_source: string;
  verified_at: Date | null;
  schedule_status: string;
  open_status: string;
  schedule_revision: number;
}

/**
 * 카운트다운 응답(PROMPT 3.5). 남은 시간은 서버 시각 기준. 0이 돼도 open_status는 서버 판정값 그대로 —
 * 화면은 "오픈 확인 중"으로만 보여 주고, OPEN_CONFIRMED일 때만 "예매 진행 중"이라고 한다.
 */
export function countdownBody(p: PhaseForCountdown, now: Date, grade: string, offsetMs: number | null) {
  const stopped = p.schedule_status === 'CANCELLED' || p.schedule_status === 'POSTPONED';
  const remaining = stopped ? null : Math.max(0, p.scheduled_at.getTime() - now.getTime());
  let level: 'OK' | 'WARN' | 'UNRELIABLE' = 'OK';
  let notice: string | null = null;
  if (grade === 'UNHEALTHY' || p.open_status === 'TIME_SYNC_ERROR') {
    level = 'UNRELIABLE';
    notice = '서버 시간 점검 중이라 남은 시간이 부정확할 수 있습니다.';
  } else if (grade === 'DEGRADED' || grade === 'UNKNOWN') level = 'WARN';
  if (p.schedule_status === 'CANCELLED') notice = '예매가 취소되었습니다.';
  else if (p.schedule_status === 'POSTPONED') notice = '예매가 연기되었습니다. 새 일정이 정해지면 다시 알려 드릴게요.';
  else if (p.schedule_status === 'TENTATIVE') notice ??= '아직 공식 확정 전인 일정입니다.';
  else if (p.schedule_status === 'CHANGED') notice ??= '일정이 변경되어 공식 재확인 중입니다.';
  return {
    sessionId: Number(p.session_id),
    phaseId: Number(p.id),
    phaseName: p.name,
    serverNowUtc: isoUtc(now),
    serverEpochMs: now.getTime(),
    targetAtUtc: isoUtc(p.scheduled_at),
    targetAtKst: isoKst(p.scheduled_at),
    targetEpochMs: p.scheduled_at.getTime(),
    announcedAtUtc: p.announced_at ? isoUtc(p.announced_at) : null,
    timezone: p.timezone,
    remainingMs: remaining,
    scheduleStatus: p.schedule_status,
    openStatus: p.open_status,
    scheduleRevision: p.schedule_revision,
    timeSource: p.time_source,
    verifiedAt: p.verified_at ? isoUtc(p.verified_at) : null,
    serverTimeGrade: grade,
    accuracy: { serverOffsetMs: offsetMs, level },
    resyncAfterMs: resyncAfterMs(remaining),
    notice,
  };
}
