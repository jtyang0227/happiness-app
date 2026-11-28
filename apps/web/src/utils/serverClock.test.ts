import { formatInZone, formatRemaining, accuracyLevel, ago, bestClock, clockFromSample, formatKst, formatUtc, serverNow } from './serverClock';

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

describe('formatRemaining', () => {
  it('일·시·분·초, 1분 안쪽은 0.1초', () => {
    expect(formatRemaining(2 * 86400_000 + 3 * 3600_000 + 14 * 60_000 + 7_900)).toBe('D-2 03:14:07');
    expect(formatRemaining(3 * 3600_000)).toBe('03:00:00');
    expect(formatRemaining(59_450)).toBe('00:00:59.4');
    expect(formatRemaining(-5)).toBe('00:00:00.0');
  });
  it('원문 시간대 보조 표시', () => {
    expect(formatInZone(Date.parse('2026-12-01T11:00:00Z'), 'Europe/London')).toBe('12/1 11:00 (Europe/London)');
  });
});
