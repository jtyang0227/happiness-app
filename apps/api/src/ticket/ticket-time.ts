/**
 * 예매 일정 계산 규칙 — 프로세스 시간대(TZ)와 무관하게 UTC epoch로만 계산하고, KST는 표시할 때만 IANA 시간대로 바꾼다.
 * "하루 전"은 달력 하루가 아니라 24시간 전이다.
 */

export const OFFSETS = { '24h': 24 * 3600_000, '1h': 3600_000, '10m': 600_000, '1m': 60_000 } as const;
export type OffsetKey = keyof typeof OFFSETS;
export const OFFSET_KEYS = Object.keys(OFFSETS) as OffsetKey[];
/** 1분 전 알림은 직접 켜야 한다(기본값에서 뺌) */
export const DEFAULT_OFFSETS: OffsetKey[] = ['24h', '1h', '10m'];

/** 놓친 알림을 그래도 보낼 수 있는 여유 — 지나면 SKIPPED(MISSED_WINDOW). 예매가 시작된 뒤엔 무조건 SKIPPED */
export const GRACE_MS: Record<OffsetKey, number> = { '24h': 30 * 60_000, '1h': 10 * 60_000, '10m': 2 * 60_000, '1m': 20_000 };

const OFFSET_LABEL: Record<OffsetKey, string> = { '24h': '24시간', '1h': '1시간', '10m': '10분', '1m': '1분' };

export function parseOffsets(raw: unknown): OffsetKey[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  const out = new Set<OffsetKey>();
  for (const v of list) {
    const k = String(v).trim();
    if (!k) continue;
    if (!(k in OFFSETS)) throw new Error(`알 수 없는 알림 시점: ${k} (24h·1h·10m·1m 중에서)`);
    out.add(k as OffsetKey);
  }
  // 큰 것부터 저장해 비교·표시가 일정하게
  return OFFSET_KEYS.filter((k) => out.has(k));
}

/** IANA 시간대 이름인가 — "+09:00" 같은 고정 오프셋·약어는 받지 않는다(KST·UTC 제외) */
export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const KST_PARTS = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', hourCycle: 'h23', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
});

/** "12/1(화) 20:00 KST" */
export function kstShort(d: Date): string {
  const p = Object.fromEntries(KST_PARTS.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.month}/${p.day}(${p.weekday}) ${p.hour}:${p.minute} KST`;
}

export function reminderMessage(phaseName: string, sessionTitle: string, offset: OffsetKey, scheduledAt: Date): string {
  return `[${phaseName}] ${sessionTitle} · ${OFFSET_LABEL[offset]} 후 ${kstShort(scheduledAt)} 오픈 예정`;
}

export function changeMessage(phaseName: string, sessionTitle: string, prev: Date | null, next: Date, reason: string): string {
  const from = prev ? `${kstShort(prev)} → ` : '';
  return `[${phaseName}] ${sessionTitle} 예매 일정이 변경되었습니다: ${from}${kstShort(next)} (${reason})`.slice(0, 500);
}

export function cancelMessage(phaseName: string, sessionTitle: string, status: 'CANCELLED' | 'POSTPONED', reason: string): string {
  return `[${phaseName}] ${sessionTitle} 예매가 ${status === 'CANCELLED' ? '취소' : '연기'}되었습니다 (${reason})`.slice(0, 500);
}

export const keys = {
  notify: (memberId: bigint | number, phaseId: bigint | number, offset: OffsetKey, revision: number) => `notify:${memberId}:${phaseId}:${offset}:${revision}`,
  notifyChange: (memberId: bigint | number, phaseId: bigint | number, revision: number) => `notify_change:${memberId}:${phaseId}:${revision}`,
  recalc: (phaseId: bigint | number, revision: number) => `recalc:${phaseId}:${revision}`,
  transition: (phaseId: bigint | number, from: string, to: string, revision: number) => `transition:${phaseId}:${from}->${to}:${revision}`,
};

/**
 * 카운트다운 화면이 다시 맞출 간격(서버가 정한다) — 남은 시간이 짧을수록 자주.
 * 1시간 넘게 남음 5분, 10분~1시간 1분, 1~10분 15초, 1분 이내 5초.
 */
export function resyncAfterMs(remainingMs: number | null): number {
  if (remainingMs === null || remainingMs > 3600_000) return 300_000;
  if (remainingMs > 600_000) return 60_000;
  if (remainingMs > 60_000) return 15_000;
  return 5_000;
}

/** 실패 재시도 간격 10초 → 30초 → 2분 → 10분 → 이후 10분 */
export function backoffMs(attempts: number): number {
  return [10_000, 30_000, 120_000, 600_000][Math.min(Math.max(attempts, 1), 4) - 1];
}

/** 놓친 NOTIFY 작업을 지금 보내도 되는가 */
export function withinGrace(runAt: Date, offset: OffsetKey, scheduledAt: Date, now: Date): boolean {
  if (now.getTime() >= scheduledAt.getTime()) return false;
  return now.getTime() - runAt.getTime() <= GRACE_MS[offset];
}
