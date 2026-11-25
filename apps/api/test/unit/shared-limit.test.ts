import { afterEach, describe, expect, it, vi } from 'vitest';
import { SharedLimitService } from '../../src/common/shared-limit.service.js';

// Redis가 없을 때(메모리)의 동작 — Redis 경로는 계약 테스트와 두 인스턴스 확인으로 본다
const noRedis = { redis: async () => null } as never;

afterEach(() => vi.useRealTimers());

describe('SharedLimitService (Redis 없음 → 메모리)', () => {
  it('고정 창: limit번까지 허용, 창이 지나면 다시 센다', async () => {
    vi.useFakeTimers();
    const s = new SharedLimitService(noRedis);
    const r = [];
    for (let i = 0; i < 4; i++) r.push(await s.allow('k', 3, 60));
    expect(r).toEqual([true, true, true, false]);
    expect(await s.allow('other', 3, 60)).toBe(true);
    vi.advanceTimersByTime(60_001);
    expect(await s.allow('k', 3, 60)).toBe(true);
  });

  it('실패 max번째에 잠그고, 잠금이 풀리면 처음부터, 성공하면 실패 수 초기화', async () => {
    vi.useFakeTimers();
    const s = new SharedLimitService(noRedis);
    for (let i = 0; i < 4; i++) await s.failure('login:a', 5, 15 * 60_000);
    expect(await s.lockedMs('login:a')).toBe(0);
    await s.clear('login:a');
    for (let i = 0; i < 4; i++) await s.failure('login:a', 5, 15 * 60_000);
    expect(await s.lockedMs('login:a')).toBe(0); // 초기화됐으므로 4번으로는 안 잠김
    await s.failure('login:a', 5, 15 * 60_000);
    expect(await s.lockedMs('login:a')).toBeGreaterThan(14 * 60_000);
    vi.advanceTimersByTime(15 * 60_000 + 1);
    expect(await s.lockedMs('login:a')).toBe(0);
    await s.failure('login:a', 5, 15 * 60_000);
    expect(await s.lockedMs('login:a')).toBe(0);
  });

  it('Redis 호출이 실패하면 메모리로 계속 센다', async () => {
    const broken = { redis: async () => ({ eval: async () => { throw new Error('down'); }, set: async () => { throw new Error('down'); }, del: async () => { throw new Error('down'); }, pTTL: async () => { throw new Error('down'); } }) } as never;
    const s = new SharedLimitService(broken);
    expect([await s.allow('x', 1, 60), await s.allow('x', 1, 60)]).toEqual([true, false]);
    await s.failure('d', 1, 1000);
    expect(await s.lockedMs('d')).toBeGreaterThan(0);
  });
});
