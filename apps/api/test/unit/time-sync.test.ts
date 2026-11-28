import { createSocket } from 'node:dgram';
import { afterEach, describe, expect, it } from 'vitest';
import { computeOffset, DEFAULT_THRESHOLDS, gradeOf, isoKst, isoUtc, nowBody, NtpSample, optionsFromEnv, queryNtp, TimeSyncMonitor } from '../../src/time/time-sync.js';

describe('computeOffset (NTP 4-타임스탬프)', () => {
  it('대칭 지연이면 오프셋이 정확하다', () => {
    // 내 시계가 기준보다 100ms 느림, 편도 20ms, 서버 처리 5ms
    const t1 = 1000, t2 = 1120, t3 = 1125, t4 = 1045;
    expect(computeOffset(t1, t2, t3, t4)).toEqual({ offsetMs: 100, delayMs: 40 });
  });
  it('내 시계가 빠르면 음수', () => {
    expect(computeOffset(2000, 1810, 1810, 2020).offsetMs).toBe(-200);
  });
});

describe('gradeOf', () => {
  const now = new Date('2026-11-27T13:00:00Z');
  const at = (secAgo: number) => new Date(now.getTime() - secAgo * 1000);
  it('측정 없음 → UNKNOWN', () => expect(gradeOf(null, now)).toBe('UNKNOWN'));
  it('50ms 이하·최근 → HEALTHY', () => expect(gradeOf({ offsetMs: -50, at: at(10) }, now)).toBe('HEALTHY'));
  it('50ms 초과 → DEGRADED', () => expect(gradeOf({ offsetMs: 180, at: at(10) }, now)).toBe('DEGRADED'));
  it('500ms 초과 → UNHEALTHY', () => expect(gradeOf({ offsetMs: 800, at: at(10) }, now)).toBe('UNHEALTHY'));
  it('5~15분 전 측정 → DEGRADED', () => expect(gradeOf({ offsetMs: 1, at: at(400) }, now)).toBe('DEGRADED'));
  it('15분 넘게 성공 없음 → UNHEALTHY', () => expect(gradeOf({ offsetMs: 1, at: at(901) }, now)).toBe('UNHEALTHY'));
  it('임계치는 바꿀 수 있다', () => expect(gradeOf({ offsetMs: 80, at: at(1) }, now, { ...DEFAULT_THRESHOLDS, healthyMs: 100 })).toBe('HEALTHY'));
});

describe('isoKst / isoUtc — 타임존 포함 ISO 8601', () => {
  it('UTC는 Z, KST는 +09:00, 밀리초 3자리', () => {
    const d = new Date('2026-11-27T13:10:05.123Z');
    expect(isoUtc(d)).toBe('2026-11-27T13:10:05.123Z');
    expect(isoKst(d)).toBe('2026-11-27T22:10:05.123+09:00');
  });
  it('KST 자정 = 전날 15:00 UTC (날짜 변경)', () => {
    expect(isoKst(new Date('2026-11-30T15:00:00.000Z'))).toBe('2026-12-01T00:00:00.000+09:00');
    expect(isoKst(new Date('2026-11-30T14:59:59.999Z'))).toBe('2026-11-30T23:59:59.999+09:00');
  });
  it('윤년 2월 29일과 월말·연말', () => {
    expect(isoKst(new Date('2028-02-28T15:00:00.000Z'))).toBe('2028-02-29T00:00:00.000+09:00');
    expect(isoKst(new Date('2027-02-28T15:00:00.000Z'))).toBe('2027-03-01T00:00:00.000+09:00');
    expect(isoKst(new Date('2026-12-31T15:00:00.000Z'))).toBe('2027-01-01T00:00:00.000+09:00');
  });
  it('과거 서머타임(1988년)도 tz DB대로 +10:00', () => {
    expect(isoKst(new Date('1988-07-01T00:00:00.000Z'))).toBe('1988-07-01T10:00:00.000+10:00');
  });
});

describe('nowBody', () => {
  it('처리 시간·에코·KST를 담는다, 숫자가 아닌 에코는 버린다', () => {
    const recv = new Date('2026-11-27T13:10:05.120Z');
    const now = new Date('2026-11-27T13:10:05.123Z');
    const sync = { grade: 'HEALTHY' as const, offsetMs: 3.2, lastSyncAt: '2026-11-27T13:09:41.000Z' };
    const b = nowBody(now, recv, '1795785004980', sync);
    expect(b).toMatchObject({ serverNowUtc: '2026-11-27T13:10:05.123Z', serverNowKst: '2026-11-27T22:10:05.123+09:00', serverEpochMs: 1795785005123,
      serverProcessingMs: 3, clientSentAtEcho: 1795785004980, timezone: 'Asia/Seoul', sync });
    expect(nowBody(now, recv, '<script>', sync).clientSentAtEcho).toBeNull();
    expect(nowBody(now, recv, undefined, sync).clientSentAtEcho).toBeNull();
  });
});

describe('optionsFromEnv', () => {
  it('기본값과 덮어쓰기', () => {
    expect(optionsFromEnv({}).servers).toEqual(['time.google.com', 'time.cloudflare.com', 'pool.ntp.org']);
    const o = optionsFromEnv({ TIME_NTP_SERVERS: ' a , b ', TIME_SYNC_HEALTHY_MS: '20', TIME_SYNC_ENABLED: 'false', TIME_SYNC_REFRESH_SEC: 'x' });
    expect(o).toMatchObject({ servers: ['a', 'b'], enabled: false, refreshSec: 60, thresholds: { healthyMs: 20, unhealthyMs: 500 } });
  });
});

describe('TimeSyncMonitor', () => {
  const opts = { servers: ['bad', 'good'], refreshSec: 60, thresholds: DEFAULT_THRESHOLDS, enabled: true };
  const sample = (server: string, at: Date, offsetMs = 3): NtpSample => ({ server, offsetMs, delayMs: 20, stratum: 2, at });

  it('첫 서버가 실패하면 다음 서버를 쓰고 실패 사유를 남긴다', async () => {
    let now = new Date('2026-11-27T13:00:00Z');
    const m = new TimeSyncMonitor(opts, async (s) => { if (s === 'bad') throw new Error('timeout'); return sample(s, now); }, () => now);
    const s = await m.status();
    expect(s).toMatchObject({ grade: 'HEALTHY', synced: true, referenceServer: 'good', offsetMs: 3, consecutiveFailures: 0, lastErrors: [{ server: 'bad', error: 'timeout' }] });
  });

  it('모두 실패하면 연속 실패가 쌓이고, 마지막 성공이 오래되면 UNHEALTHY(NTP 동기화 실패)', async () => {
    let now = new Date('2026-11-27T13:00:00Z');
    let fail = false;
    const m = new TimeSyncMonitor(opts, async (s) => { if (fail || s === 'bad') throw new Error('unreachable'); return sample(s, now); }, () => now);
    await m.status();
    fail = true;
    for (let i = 1; i <= 16; i++) {
      now = new Date(now.getTime() + 61_000);
      await m.status();
    }
    const s = m.snapshot();
    expect(s.consecutiveFailures).toBe(16);
    expect(s.grade).toBe('UNHEALTHY');
    expect(s.synced).toBe(false);
    expect(s.lastSyncAt).toBe('2026-11-27T13:00:00.000Z');
  });

  it('refreshSec 안에서는 다시 재지 않고, 동시 조회는 한 번만 잰다', async () => {
    let calls = 0;
    const now = new Date('2026-11-27T13:00:00Z');
    const m = new TimeSyncMonitor({ ...opts, servers: ['good'] }, async (s) => { calls++; await new Promise((r) => setTimeout(r, 5)); return sample(s, now); }, () => now);
    await Promise.all([m.status(), m.status(), m.status()]);
    await m.status();
    expect(calls).toBe(1);
  });

  it('꺼져 있으면 재지 않고 UNKNOWN', async () => {
    let calls = 0;
    const m = new TimeSyncMonitor({ ...opts, enabled: false }, async (s) => { calls++; return sample(s, new Date()); });
    expect((await m.status()).grade).toBe('UNKNOWN');
    expect(calls).toBe(0);
  });
});

describe('queryNtp — 로컬 가짜 NTP 서버', () => {
  const sockets: ReturnType<typeof createSocket>[] = [];
  afterEach(() => { for (const s of sockets.splice(0)) s.close(); });

  function writeTs(buf: Buffer, off: number, ms: number) {
    const sec = Math.floor(ms / 1000) + 2208988800;
    buf.writeUInt32BE(sec, off);
    buf.writeUInt32BE(Math.round(((ms % 1000) / 1000) * 0x100000000) >>> 0, off + 4);
  }

  /** 기준 시계가 내 시계보다 skewMs 빠른 서버 */
  async function fakeServer(skewMs: number, opts: { stratum?: number } = {}) {
    const s = createSocket('udp4');
    sockets.push(s);
    s.on('message', (_m, rinfo) => {
      const res = Buffer.alloc(48);
      res[0] = 0x24; // LI=0, VN=4, Mode=4(server)
      res[1] = opts.stratum ?? 1;
      const t = Date.now() + skewMs;
      writeTs(res, 32, t);
      writeTs(res, 40, t);
      s.send(res, rinfo.port, rinfo.address);
    });
    await new Promise<void>((r) => s.bind(0, '127.0.0.1', () => r()));
    return s.address().port;
  }

  it('오프셋을 잰다 (서버 시간 오차 발생)', async () => {
    const port = await fakeServer(750);
    const r = await queryNtpOnPort(port);
    expect(r.offsetMs).toBeGreaterThan(700);
    expect(r.offsetMs).toBeLessThan(800);
    expect(r.stratum).toBe(1);
  });

  it('stratum 0(kiss-o-death)은 실패로 본다', async () => {
    const port = await fakeServer(0, { stratum: 0 });
    await expect(queryNtpOnPort(port)).rejects.toThrow('not synchronized');
  });

  it('응답이 없으면 타임아웃', async () => {
    const s = createSocket('udp4');
    sockets.push(s);
    await new Promise<void>((r) => s.bind(0, '127.0.0.1', () => r()));
    await expect(queryNtpOnPort(s.address().port, 100)).rejects.toThrow('timeout');
  });

  // "host:port" 형식으로 로컬 가짜 서버에 보낸다
  function queryNtpOnPort(port: number, timeoutMs = 1000) {
    return queryNtp(`127.0.0.1:${port}`, timeoutMs);
  }
});
