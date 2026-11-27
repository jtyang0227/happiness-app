import { accuracyLevel, ago, bestClock, clockFromSample, formatKst, formatUtc, serverNow } from './serverTime';

describe('server clock estimate', () => {
  it('RTT/2를 더하고 서버 처리 시간은 뺀다', () => {
    const c = clockFromSample({ serverEpochMs: 10_000, sentAt: 100, receivedAt: 160, serverProcessingMs: 20 });
    expect(c).toEqual({ serverAtReceive: 10_020, receivedAt: 160, rttMs: 40, uncertaintyMs: 20 });
  });

  it('가장 RTT가 작은 샘플을 고른다', () => {
    const samples = [900, 120, 400, 150, 1300].map((rtt, i) => ({ serverEpochMs: 50_000 + i, sentAt: 0, receivedAt: rtt }));
    expect(bestClock(samples)?.rttMs).toBe(120);
    expect(bestClock([])).toBeNull();
  });

  it('이후 경과는 단조 시계로 더한다(브라우저 시계와 무관)', () => {
    const c = clockFromSample({ serverEpochMs: 1_000_000, sentAt: 0, receivedAt: 0 });
    expect(serverNow(c, 2500)).toBe(1_002_500);
  });
});

describe('accuracyLevel', () => {
  it.each([
    [120, 'HEALTHY', 'OK'],
    [500, 'HEALTHY', 'WARN'],
    [120, 'DEGRADED', 'WARN'],
    [120, 'UNKNOWN', 'WARN'],
    [1500, 'HEALTHY', 'UNRELIABLE'],
    [120, 'UNHEALTHY', 'UNRELIABLE'],
    [null, 'HEALTHY', 'UNRELIABLE'],
  ])('rtt %p / %p → %p', (rtt, grade, level) => {
    expect(accuracyLevel(rtt as number | null, grade as string)).toBe(level);
  });
});

describe('format', () => {
  it('KST 자정·윤년 날짜 변경을 시간대 표기와 함께', () => {
    expect(formatKst(Date.parse('2026-11-30T15:00:00Z'))).toBe('2026-12-01(화) 00:00:00 KST');
    expect(formatUtc(Date.parse('2026-11-30T15:00:00Z'))).toBe('2026-11-30(월) 15:00:00 UTC');
    expect(formatKst(Date.parse('2028-02-28T15:00:00Z'))).toBe('2028-02-29(화) 00:00:00 KST');
  });
  it('ago', () => {
    const now = Date.parse('2026-11-27T13:10:00Z');
    expect(ago('2026-11-27T13:09:48Z', now)).toBe('12초 전');
    expect(ago('2026-11-27T13:05:00Z', now)).toBe('5분 전');
    expect(ago(null, now)).toBe('없음');
  });
});
