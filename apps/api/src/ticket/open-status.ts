/**
 * 예매 오픈 상태(G) — PROMPT_server-time-booking-module.md 7장 전이표.
 * 표에 없는 전이는 금지다. 특히 OPEN_CONFIRMED는 "확인 기록(booking_open_verifications)"으로만 간다 —
 * 예정 시각이 지났다는 이유만으로는 OPEN_CHECK_PENDING까지만 간다.
 */

export const OPEN_STATUSES = ['SCHEDULED', 'UPCOMING', 'OPEN_CHECK_PENDING', 'OPEN_CONFIRMED', 'CLOSED_CONFIRMED', 'UNKNOWN', 'TIME_SYNC_ERROR'] as const;
export type OpenStatus = (typeof OPEN_STATUSES)[number];

export const SCHEDULE_STATUSES = ['TENTATIVE', 'CONFIRMED', 'CHANGED', 'POSTPONED', 'CANCELLED'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const TIME_SOURCES = ['OFFICIAL_NOTICE', 'OFFICIAL_API', 'PARTNER_FEED', 'ADMIN_MANUAL', 'ESTIMATED'] as const;

/** 전이를 일으킨 쪽 — 기록과 권한 검사에 쓴다 */
export type Trigger = 'TICK' | 'RECALC' | 'VERIFICATION' | 'CHECK_EXHAUSTED' | 'SYNC_ERROR' | 'SYNC_RECOVERED';

/** 기본 1시간 — 이 안으로 들어오면 UPCOMING */
export const UPCOMING_WINDOW_MS = 60 * 60 * 1000;
/** 오픈 확인을 이만큼 기다려도 확인 기록이 없으면 UNKNOWN */
export const OPEN_CHECK_TIMEOUT_MS = 10 * 60 * 1000;

const T: Record<string, Trigger[]> = {
  'SCHEDULED>UPCOMING': ['TICK'],
  'UPCOMING>SCHEDULED': ['RECALC'],
  'SCHEDULED>OPEN_CHECK_PENDING': ['TICK'],
  'UPCOMING>OPEN_CHECK_PENDING': ['TICK'],
  'OPEN_CHECK_PENDING>OPEN_CONFIRMED': ['VERIFICATION'],
  'OPEN_CHECK_PENDING>UNKNOWN': ['CHECK_EXHAUSTED'],
  'UNKNOWN>OPEN_CONFIRMED': ['VERIFICATION'],
  'UNKNOWN>CLOSED_CONFIRMED': ['VERIFICATION'],
  'OPEN_CONFIRMED>CLOSED_CONFIRMED': ['VERIFICATION'],
  'OPEN_CHECK_PENDING>CLOSED_CONFIRMED': ['VERIFICATION'],
};

const TERMINAL: OpenStatus[] = ['CLOSED_CONFIRMED'];

/** 전이표에 있는가. 같은 상태로의 "전이"는 없다(호출 측이 건너뛴다) */
export function canTransition(from: OpenStatus, to: OpenStatus, trigger: Trigger): boolean {
  if (from === to) return false;
  // 모든 상태 → TIME_SYNC_ERROR (종료 상태는 유지), 복구는 보관된 상태에서 다시 판정
  if (trigger === 'SYNC_ERROR') return to === 'TIME_SYNC_ERROR' && !TERMINAL.includes(from);
  if (trigger === 'SYNC_RECOVERED') return from === 'TIME_SYNC_ERROR' && to !== 'CLOSED_CONFIRMED';
  // 일정 변경(revision 증가) — 종료가 아닌 상태는 새 시각 기준 SCHEDULED/UPCOMING/OPEN_CHECK_PENDING으로
  if (trigger === 'RECALC') return !TERMINAL.includes(from) && (to === 'SCHEDULED' || to === 'UPCOMING' || to === 'OPEN_CHECK_PENDING');
  return T[`${from}>${to}`]?.includes(trigger) ?? false;
}

export function assertTransition(from: OpenStatus, to: OpenStatus, trigger: Trigger): void {
  if (!canTransition(from, to, trigger)) throw new Error(`허용되지 않은 오픈 상태 전이: ${from} → ${to} (${trigger})`);
}

/** 시각만 보고 정하는 상태 — 절대 OPEN_CONFIRMED를 내지 않는다 */
export function timeBasedStatus(scheduledAt: Date, now: Date, windowMs = UPCOMING_WINDOW_MS): 'SCHEDULED' | 'UPCOMING' | 'OPEN_CHECK_PENDING' {
  const left = scheduledAt.getTime() - now.getTime();
  if (left <= 0) return 'OPEN_CHECK_PENDING';
  return left <= windowMs ? 'UPCOMING' : 'SCHEDULED';
}

export interface TickInput {
  openStatus: OpenStatus;
  scheduledAt: Date;
  /** OPEN_CHECK_PENDING에 들어간 시각 — 확인 대기 시간 초과 판단 */
  checkPendingSince?: Date | null;
  scheduleStatus: ScheduleStatus;
}

/**
 * 주기적 판정(tick). 서버 시간이 비정상이면 호출하지 않는다(가드는 워커가 맡는다).
 * 바뀔 게 없으면 null.
 */
export function tick(p: TickInput, now: Date, windowMs = UPCOMING_WINDOW_MS, checkTimeoutMs = OPEN_CHECK_TIMEOUT_MS): { to: OpenStatus; trigger: Trigger; reason: string } | null {
  if (p.scheduleStatus === 'CANCELLED' || p.scheduleStatus === 'POSTPONED') return null; // 화면은 "취소됨/연기됨"이 우선, 상태는 그대로
  if (p.openStatus === 'SCHEDULED' || p.openStatus === 'UPCOMING') {
    const to = timeBasedStatus(p.scheduledAt, now, windowMs);
    if (to !== p.openStatus && canTransition(p.openStatus, to, 'TICK')) {
      return { to, trigger: 'TICK', reason: to === 'UPCOMING' ? '예매 1시간 이내' : '예정 시각 도달 — 실제 오픈 확인 대기' };
    }
    return null;
  }
  if (p.openStatus === 'OPEN_CHECK_PENDING' && p.checkPendingSince && now.getTime() - p.checkPendingSince.getTime() >= checkTimeoutMs) {
    return { to: 'UNKNOWN', trigger: 'CHECK_EXHAUSTED', reason: `${Math.round(checkTimeoutMs / 60000)}분 동안 오픈 확인 기록 없음` };
  }
  return null;
}

/** 일정 변경 뒤 다시 판정 — 종료 상태면 그대로 */
export function recalc(current: OpenStatus, scheduledAt: Date, now: Date, windowMs = UPCOMING_WINDOW_MS): OpenStatus {
  if (TERMINAL.includes(current)) return current;
  return timeBasedStatus(scheduledAt, now, windowMs);
}

/** 오픈 확인 기록을 반영 — OPEN·CLOSED만 상태를 바꾼다(NOT_OPEN·ERROR는 기록만) */
export function applyVerification(current: OpenStatus, result: 'OPEN' | 'NOT_OPEN' | 'CLOSED' | 'ERROR'): OpenStatus | null {
  const to = result === 'OPEN' ? 'OPEN_CONFIRMED' : result === 'CLOSED' ? 'CLOSED_CONFIRMED' : null;
  if (!to || !canTransition(current, to, 'VERIFICATION')) return null;
  return to;
}

/** 시간 오류에서 복구 — 보관해 둔 상태가 확인 결과(OPEN_CONFIRMED)면 그대로 돌리고, 아니면 시각으로 다시 판정 */
export function restoreAfterSyncError(before: OpenStatus | null, scheduledAt: Date, now: Date, windowMs = UPCOMING_WINDOW_MS): OpenStatus {
  if (before === 'OPEN_CONFIRMED' || before === 'UNKNOWN') return before;
  if (before === 'OPEN_CHECK_PENDING') return 'OPEN_CHECK_PENDING';
  return timeBasedStatus(scheduledAt, now, windowMs);
}
