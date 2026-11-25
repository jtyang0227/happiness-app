import { describe, expect, it } from 'vitest';
import { Bucket, consume } from '../../src/common/security.middleware.js';

describe('전역 속도 제한 토큰 버킷 (Spring Bucket4j refillGreedy 100/60초)', () => {
  it('용량만큼 바로 쓰고 다음은 거절, 시간이 지나면 비례해 다시 채운다', () => {
    let b: Bucket | undefined;
    const t0 = 1_000_000;
    for (let i = 0; i < 100; i++) {
      const r = consume(b, t0, 100, 100, 60);
      expect(r.ok).toBe(true);
      b = r.bucket;
    }
    expect(consume(b, t0, 100, 100, 60).ok).toBe(false);
    // 0.6초 → 1개 보충
    const r = consume(b, t0 + 600, 100, 100, 60);
    expect(r.ok).toBe(true);
    expect(consume(r.bucket, t0 + 600, 100, 100, 60).ok).toBe(false);
    // 오래 지나도 용량 이상은 쌓이지 않는다
    let full = consume(r.bucket, t0 + 3_600_000, 100, 100, 60).bucket;
    let used = 1;
    while (consume(full, t0 + 3_600_000, 100, 100, 60).ok) { full = consume(full, t0 + 3_600_000, 100, 100, 60).bucket; used++; }
    expect(used).toBe(100);
  });
});
