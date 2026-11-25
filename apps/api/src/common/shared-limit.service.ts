import { Injectable, Logger } from '@nestjs/common';
import { TokenStore } from '../auth/token-store.js';

/**
 * 서버를 여러 대 띄워도 같이 세는 속도 제한·잠금 — Redis(`rl:*` 키)에 두고, REDIS_URL이 없거나 Redis가 실패하면
 * 이 인스턴스 메모리로 센다(지금까지와 같은 동작). Spring은 전부 인메모리였다.
 *
 * 매 요청마다 부르는 전역 IP 제한·조회 기록 제한은 여기 두지 않는다 — Upstash 무료 한도(하루 1만 명령)를 금방 넘는다.
 */
@Injectable()
export class SharedLimitService {
  private readonly log = new Logger('SharedLimit');
  private readonly mem = new Map<string, { n: number; exp: number }>();
  private lastSweep = 0;

  constructor(private readonly tokens: TokenStore) {}

  /** 고정 창 — 창 안에서 limit번까지 true(첫 요청이 창을 연다) */
  async allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    return (await this.incr(`rl:${key}`, windowSeconds * 1000)) <= limit;
  }

  /** 실패 1회 기록 — max번째 실패면 lockMs 동안 잠그고 실패 수는 지운다 */
  async failure(key: string, max: number, lockMs: number): Promise<void> {
    const n = await this.incr(`rl:fail:${key}`, 24 * 60 * 60 * 1000);
    if (n >= max) {
      await this.set(`rl:lock:${key}`, lockMs);
      await this.del(`rl:fail:${key}`);
    }
  }

  /** 잠겨 있으면 남은 밀리초, 아니면 0 */
  async lockedMs(key: string): Promise<number> {
    const k = `rl:lock:${key}`;
    const r = await this.client();
    if (r) {
      try { return Math.max(0, await r.pTTL(k)); } catch (e) { this.warn(e); }
    }
    const v = this.memGet(k);
    return v ? v.exp - Date.now() : 0;
  }

  /** 성공 — 실패 수와 잠금을 지운다 */
  async clear(key: string): Promise<void> {
    await this.del(`rl:fail:${key}`, `rl:lock:${key}`);
  }

  // ── 저장소 ─────────────────────────────────────────────────────────
  private async client() {
    try { return await this.tokens.redis(); } catch { return null; }
  }

  private warn(e: unknown) {
    this.log.debug(`Redis 실패 — 메모리로 셉니다: ${(e as Error).message}`);
  }

  private async incr(key: string, windowMs: number): Promise<number> {
    const r = await this.client();
    if (r) {
      try {
        // INCR과 만료를 한 번에 — 첫 요청이거나 만료가 빠진 키면 창을 다시 건다
        const n = await r.eval(
          "local n = redis.call('INCR', KEYS[1]); if n == 1 or redis.call('PTTL', KEYS[1]) < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return n",
          { keys: [key], arguments: [String(windowMs)] },
        );
        return Number(n);
      } catch (e) { this.warn(e); }
    }
    const now = Date.now();
    const v = this.memGet(key);
    if (!v) { this.mem.set(key, { n: 1, exp: now + windowMs }); return 1; }
    v.n++;
    return v.n;
  }

  private async set(key: string, ms: number) {
    const r = await this.client();
    if (r) {
      try { await r.set(key, '1', { PX: ms }); return; } catch (e) { this.warn(e); }
    }
    this.mem.set(key, { n: 1, exp: Date.now() + ms });
  }

  private async del(...keys: string[]) {
    const r = await this.client();
    if (r) {
      try { await r.del(keys); } catch (e) { this.warn(e); }
    }
    for (const k of keys) this.mem.delete(k);
  }

  private memGet(key: string) {
    const now = Date.now();
    if (now - this.lastSweep > 60_000) {
      this.lastSweep = now;
      for (const [k, v] of this.mem) if (v.exp <= now) this.mem.delete(k);
    }
    const v = this.mem.get(key);
    if (v && v.exp <= now) { this.mem.delete(key); return undefined; }
    return v;
  }
}
