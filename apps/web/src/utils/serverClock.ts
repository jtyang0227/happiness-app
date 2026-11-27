/**
 * 서버 기준 시각 추정 (PLANNING_server-time.md 4.1).
 * 브라우저 시계(Date.now)는 판단에 쓰지 않는다 — 요청 왕복 시간(RTT)을 재서 "서버가 응답한 시각 + RTT/2"를
 * 기준으로 삼고, 이후 경과는 performance.now()(단조 시계)로 더한다. 사용자가 PC 시계를 바꿔도 영향이 없다.
 */

export interface TimeSample {
  /** 서버가 응답을 만든 시각(epoch ms) */
  serverEpochMs: number;
  /** 요청 보낸 시각·응답 받은 시각 (performance.now) */
  sentAt: number;
  receivedAt: number;
  /** 서버 내부 처리 시간 — RTT에서 뺀다 */
  serverProcessingMs?: number;
}

export interface ServerClock {
  /** receivedAt 시점의 서버 시각 추정 */
  serverAtReceive: number;
  receivedAt: number;
  rttMs: number;
  /** 추정 오차 상한(±ms) = RTT/2 */
  uncertaintyMs: number;
}

export function clockFromSample(s: TimeSample): ServerClock {
  const rtt = Math.max(0, s.receivedAt - s.sentAt - (s.serverProcessingMs ?? 0));
  return { serverAtReceive: s.serverEpochMs + rtt / 2, receivedAt: s.receivedAt, rttMs: rtt, uncertaintyMs: rtt / 2 };
}

/** 여러 샘플 중 RTT가 가장 작은 것을 쓴다(지연이 대칭에 가까울수록 정확) */
export function bestClock(samples: TimeSample[]): ServerClock | null {
  let best: ServerClock | null = null;
  for (const s of samples) {
    const c = clockFromSample(s);
    if (!best || c.rttMs < best.rttMs) best = c;
  }
  return best;
}

/** 지금(monotonicNow = performance.now())의 서버 시각 추정 */
export function serverNow(c: ServerClock, monotonicNow: number): number {
  return c.serverAtReceive + (monotonicNow - c.receivedAt);
}

/** 정확도 경고 단계 — RTT와 서버 동기화 등급으로 판단 */
export function accuracyLevel(rttMs: number | null, grade: string | null): 'OK' | 'WARN' | 'UNRELIABLE' {
  if (rttMs === null || rttMs > 1000 || grade === 'UNHEALTHY') return 'UNRELIABLE';
  if (rttMs > 300 || grade === 'DEGRADED' || grade === 'UNKNOWN') return 'WARN';
  return 'OK';
}

const fmt = (timeZone: string) => new Intl.DateTimeFormat('ko-KR', {
  timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
});
const KST_FMT = fmt('Asia/Seoul');
const UTC_FMT = fmt('UTC');

function format(f: Intl.DateTimeFormat, epochMs: number) {
  const p = Object.fromEntries(f.formatToParts(new Date(epochMs)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}(${p.weekday}) ${p.hour}:${p.minute}:${p.second}`;
}

/** "2026-11-27(금) 22:10:05 KST" — 화면 시각에는 항상 시간대 표기를 붙인다 */
export const formatKst = (epochMs: number) => `${format(KST_FMT, epochMs)} KST`;
export const formatUtc = (epochMs: number) => `${format(UTC_FMT, epochMs)} UTC`;

/** "12초 전" / "3분 전" — 기준은 서버 시각 */
export function ago(fromIso: string | null, nowMs: number): string {
  if (!fromIso) return '없음';
  const sec = Math.max(0, Math.round((nowMs - Date.parse(fromIso)) / 1000));
  if (sec < 60) return `${sec}초 전`;
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  return `${Math.floor(sec / 3600)}시간 전`;
}

/** "D-2 03:14:07" / "03:14:07.4" — 1분 안쪽은 0.1초까지 */
export function formatRemaining(ms: number): string {
  const v = Math.max(0, ms);
  const days = Math.floor(v / 86400_000);
  const h = Math.floor((v % 86400_000) / 3600_000);
  const m = Math.floor((v % 3600_000) / 60_000);
  const s = Math.floor((v % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (days > 0) return `D-${days} ${hms}`;
  if (v < 60_000) return `${hms}.${Math.floor((v % 1000) / 100)}`;
  return hms;
}

/** 공지 원문 시간대 시각 "11:00 (Europe/London)" — KST가 아닐 때 보조 표시 */
export function formatInZone(epochMs: number, timeZone: string): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('ko-KR', { timeZone, hourCycle: 'h23', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(epochMs)).map((x) => [x.type, x.value]));
  return `${p.month}/${p.day} ${p.hour}:${p.minute} (${timeZone})`;
}
