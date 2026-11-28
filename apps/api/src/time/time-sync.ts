import { createSocket } from 'node:dgram';

/**
 * 서버 시각 표준화·동기화 상태 (PLANNING_server-time.md).
 * Render·Railway 같은 PaaS 컨테이너에서는 chrony에 접근할 수 없으므로, 프로세스가 직접 SNTP(RFC 4330)로
 * 기준 서버에 물어 "이 프로세스 시계가 기준보다 얼마나 틀렸는지(offset)"를 잰다. 시계를 고치지는 않는다(관측만).
 */

export type SyncGrade = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

export const KST = 'Asia/Seoul';

/** 기본 임계치 — 환경 변수로 바꿀 수 있다 */
export const DEFAULT_THRESHOLDS = { healthyMs: 50, unhealthyMs: 500, staleAfterSec: 900 };

export interface NtpSample {
  server: string;
  offsetMs: number;
  delayMs: number;
  stratum: number;
  /** 측정을 끝낸 시각(이 프로세스 시계, UTC) — 다른 타임스탬프와 같은 시계로 맞춘다 */
  at: Date;
}

export interface NtpFailure {
  server: string;
  error: string;
  at: Date;
}

/**
 * NTP 4-타임스탬프 오프셋·왕복 지연.
 * t1 요청 송신(내 시계), t2 서버 수신, t3 서버 송신, t4 응답 수신(내 시계) — 모두 epoch ms.
 * offset > 0 이면 내 시계가 기준보다 느리다.
 */
export function computeOffset(t1: number, t2: number, t3: number, t4: number) {
  return { offsetMs: ((t2 - t1) + (t3 - t4)) / 2, delayMs: (t4 - t1) - (t3 - t2) };
}

/**
 * 동기화 등급.
 * HEALTHY: 최근 확인이 staleAfter/3 이내이고 |offset| ≤ healthyMs
 * DEGRADED: |offset| ≤ unhealthyMs 이거나, 확인이 staleAfter/3~staleAfter 사이
 * UNHEALTHY: |offset| > unhealthyMs, 또는 마지막 성공이 staleAfter보다 오래됨
 * UNKNOWN: 한 번도 성공하지 못함
 */
export function gradeOf(lastSample: { offsetMs: number; at: Date } | null, now: Date, t = DEFAULT_THRESHOLDS): SyncGrade {
  if (!lastSample) return 'UNKNOWN';
  const ageSec = (now.getTime() - lastSample.at.getTime()) / 1000;
  const abs = Math.abs(lastSample.offsetMs);
  if (ageSec > t.staleAfterSec || abs > t.unhealthyMs) return 'UNHEALTHY';
  if (abs > t.healthyMs || ageSec > t.staleAfterSec / 3) return 'DEGRADED';
  return 'HEALTHY';
}

/** ISO 8601, 오프셋 포함, 밀리초 3자리. 'Z'(UTC) 또는 KST '+09:00' */
export function isoUtc(d: Date): string {
  return d.toISOString();
}

const kstParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

/** Asia/Seoul로 변환한 ISO 8601 ("2026-11-27T22:10:05.123+09:00"). +09:00을 하드코딩하지 않고 tz DB로 계산한다 */
export function isoKst(d: Date): string {
  const p = Object.fromEntries(kstParts.formatToParts(d).map((x) => [x.type, x.value]));
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offMin = Math.round((local - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  const sign = offMin >= 0 ? '+' : '-';
  const hh = String(Math.floor(Math.abs(offMin) / 60)).padStart(2, '0');
  const mm = String(Math.abs(offMin) % 60).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${ms}${sign}${hh}:${mm}`;
}

// NTP 시각은 1900-01-01 기준
const NTP_EPOCH_OFFSET_SEC = 2208988800;

function readNtpTimestamp(buf: Buffer, offset: number): number {
  const sec = buf.readUInt32BE(offset);
  const frac = buf.readUInt32BE(offset + 4);
  return (sec - NTP_EPOCH_OFFSET_SEC) * 1000 + (frac * 1000) / 0x100000000;
}

/** SNTP 한 번 질의. 실패하면 reject */
export function queryNtp(server: string, timeoutMs = 2000, nowMs: () => number = Date.now): Promise<NtpSample> {
  return new Promise((resolve, reject) => {
    const socket = createSocket('udp4');
    const packet = Buffer.alloc(48);
    packet[0] = 0x23; // LI=0, VN=4, Mode=3(client)
    let t1 = 0;
    const timer = setTimeout(() => { socket.close(); reject(new Error(`timeout ${timeoutMs}ms`)); }, timeoutMs);
    socket.once('error', (e) => { clearTimeout(timer); socket.close(); reject(e); });
    socket.once('message', (msg) => {
      const t4 = nowMs();
      clearTimeout(timer);
      socket.close();
      if (msg.length < 48) return reject(new Error('short NTP response'));
      const stratum = msg[1];
      const leap = msg[0] >> 6;
      if (stratum === 0 || leap === 3) return reject(new Error('server not synchronized (kiss-o-death or LI=3)'));
      const t2 = readNtpTimestamp(msg, 32);
      const t3 = readNtpTimestamp(msg, 40);
      const { offsetMs, delayMs } = computeOffset(t1, t2, t3, t4);
      resolve({ server, offsetMs, delayMs, stratum, at: new Date(t4) });
    });
    // "host" 또는 "host:port" (IPv4·호스트명만 — 기본 123)
    const m = /^(.+):(\d{1,5})$/.exec(server);
    const host = m ? m[1] : server;
    const port = m ? Number(m[2]) : 123;
    t1 = nowMs();
    socket.send(packet, port, host, (e) => { if (e) { clearTimeout(timer); socket.close(); reject(e); } });
  });
}

export interface TimeSyncOptions {
  servers: string[];
  /** 마지막 확인이 이보다 오래되면 다음 조회 때 다시 잰다 */
  refreshSec: number;
  thresholds: typeof DEFAULT_THRESHOLDS;
  enabled: boolean;
}

export function optionsFromEnv(env: NodeJS.ProcessEnv = process.env): TimeSyncOptions {
  const num = (v: string | undefined, d: number) => (v !== undefined && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    servers: (env.TIME_NTP_SERVERS ?? 'time.google.com,time.cloudflare.com,pool.ntp.org').split(',').map((s) => s.trim()).filter(Boolean),
    refreshSec: num(env.TIME_SYNC_REFRESH_SEC, 60),
    thresholds: {
      healthyMs: num(env.TIME_SYNC_HEALTHY_MS, DEFAULT_THRESHOLDS.healthyMs),
      unhealthyMs: num(env.TIME_SYNC_UNHEALTHY_MS, DEFAULT_THRESHOLDS.unhealthyMs),
      staleAfterSec: num(env.TIME_SYNC_STALE_AFTER_SEC, DEFAULT_THRESHOLDS.staleAfterSec),
    },
    enabled: env.TIME_SYNC_ENABLED !== 'false',
  };
}

/**
 * 동기화 상태 보관·갱신. 조회 시 마지막 확인이 refreshSec보다 오래됐으면 다시 잰다(동시 조회는 한 번만 잰다).
 * 서버 목록을 순서대로 시도해 처음 성공한 값을 쓴다.
 */
export class TimeSyncMonitor {
  private last: NtpSample | null = null;
  private lastAttemptAt: Date | null = null;
  private lastFailures: NtpFailure[] = [];
  private consecutiveFailures = 0;
  private inflight: Promise<void> | null = null;

  constructor(
    readonly opts: TimeSyncOptions = optionsFromEnv(),
    private readonly query: (server: string) => Promise<NtpSample> = (s) => queryNtp(s),
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** 서버 하나라도 성공할 때까지 순서대로 질의 */
  async check(): Promise<void> {
    if (!this.opts.enabled) return;
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      const failures: NtpFailure[] = [];
      for (const server of this.opts.servers) {
        try {
          this.last = await this.query(server);
          this.consecutiveFailures = 0;
          this.lastFailures = failures;
          return;
        } catch (e) {
          failures.push({ server, error: e instanceof Error ? e.message : String(e), at: this.clock() });
        }
      }
      this.consecutiveFailures += 1;
      this.lastFailures = failures;
    })().finally(() => { this.lastAttemptAt = this.clock(); this.inflight = null; });
    return this.inflight;
  }

  /** 오래됐으면 갱신 후 상태 반환 */
  async status() {
    const now = this.clock();
    if (this.opts.enabled && (!this.lastAttemptAt || now.getTime() - this.lastAttemptAt.getTime() > this.opts.refreshSec * 1000)) {
      await this.check();
    }
    return this.snapshot();
  }

  snapshot() {
    const now = this.clock();
    const grade: SyncGrade = this.opts.enabled ? gradeOf(this.last, now, this.opts.thresholds) : 'UNKNOWN';
    return {
      grade,
      synced: grade === 'HEALTHY' || grade === 'DEGRADED',
      offsetMs: this.last ? round1(this.last.offsetMs) : null,
      delayMs: this.last ? round1(this.last.delayMs) : null,
      stratum: this.last?.stratum ?? null,
      referenceServer: this.last?.server ?? null,
      lastSyncAt: this.last ? isoUtc(this.last.at) : null,
      checkedAt: this.lastAttemptAt ? isoUtc(this.lastAttemptAt) : null,
      consecutiveFailures: this.consecutiveFailures,
      lastErrors: this.lastFailures.map((f) => ({ server: f.server, error: f.error })),
      source: 'sntp',
      enabled: this.opts.enabled,
      thresholds: this.opts.thresholds,
    };
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** /api/time/now 응답 본문 — 응답을 보내기 직전에 찍은 시각 */
export function nowBody(now: Date, receivedAt: Date, clientSentAt: unknown, sync: { grade: SyncGrade; offsetMs: number | null; lastSyncAt: string | null }) {
  const echo = typeof clientSentAt === 'string' && /^\d{1,16}$/.test(clientSentAt) ? Number(clientSentAt) : null;
  return {
    serverNowUtc: isoUtc(now),
    serverNowKst: isoKst(now),
    serverEpochMs: now.getTime(),
    serverReceivedEpochMs: receivedAt.getTime(),
    serverProcessingMs: now.getTime() - receivedAt.getTime(),
    clientSentAtEcho: echo,
    timezone: KST,
    sync: { grade: sync.grade, offsetMs: sync.offsetMs, lastSyncAt: sync.lastSyncAt },
  };
}
