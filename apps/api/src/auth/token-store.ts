import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { JwtService } from './jwt.service.js';

/**
 * Spring RefreshTokenStore·TokenBlacklistService와 같은 Redis 키(`rt:{회원}:{기기}`, `bl:{jti}`) — 운영에서 같은 Upstash를
 * 쓰면 두 서버가 서로의 리프레시 토큰·로그아웃을 그대로 인정한다. REDIS_URL이 없거나 Redis가 죽으면 Spring처럼 통과(fail-open).
 */
@Injectable()
export class TokenStore implements OnModuleDestroy {
  private readonly log = new Logger('TokenStore');
  private client: RedisClientType | null = null;
  private connecting: Promise<RedisClientType | null> | null = null;

  constructor(private readonly jwt: JwtService) {}

  private async redis(): Promise<RedisClientType | null> {
    if (this.client?.isReady) return this.client;
    const url = process.env.REDIS_URL;
    if (!url) return null;
    if (!this.connecting) {
      const c = createClient({ url, socket: { reconnectStrategy: false, connectTimeout: 2000 } }) as RedisClientType;
      c.on('error', (e) => this.log.debug(`Redis 오류: ${e.message}`));
      this.connecting = c.connect().then(() => (this.client = c)).catch((e) => {
        this.log.debug(`Redis 연결 실패: ${e.message}`);
        return null;
      }).finally(() => { this.connecting = null; });
    }
    return this.connecting;
  }

  private key(memberId: number, deviceId: string) {
    return `rt:${memberId}:${deviceId || 'default'}`;
  }

  async saveRefresh(memberId: number, deviceId: string, token: string) {
    try { await (await this.redis())?.set(this.key(memberId, deviceId), token, { PX: this.jwt.refreshTtlMs }); }
    catch (e) { this.log.debug(`리프레시 토큰 저장 스킵: ${(e as Error).message}`); }
  }

  /** 저장된 값과 같으면 true. Redis가 없거나 죽었으면 true(fail-open) */
  async isValidRefresh(memberId: number, deviceId: string, token: string): Promise<boolean> {
    try {
      const r = await this.redis();
      if (!r) return true;
      return (await r.get(this.key(memberId, deviceId))) === token;
    } catch { return true; }
  }

  async deleteRefresh(memberId: number, deviceId: string) {
    try { await (await this.redis())?.del(this.key(memberId, deviceId)); } catch { /* fail-open */ }
  }

  async deleteAllRefresh(memberId: number) {
    try {
      const r = await this.redis();
      if (!r) return;
      const keys = await r.keys(`rt:${memberId}:*`);
      if (keys.length) await r.del(keys);
    } catch { /* fail-open */ }
  }

  async blacklist(jti: string, ttlMs: number) {
    if (ttlMs <= 0) return;
    try { await (await this.redis())?.set(`bl:${jti}`, '1', { PX: ttlMs }); } catch { /* fail-open */ }
  }

  /** Spring IpBlockFilter — 운영자가 Redis에 넣은 `ipblock:{ip}` 키(값 무관). Redis가 없거나 죽으면 통과 */
  async isIpBlocked(ip: string): Promise<boolean> {
    try { return ((await (await this.redis())?.exists(`ipblock:${ip}`)) ?? 0) > 0; } catch { return false; }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    try { return ((await (await this.redis())?.exists(`bl:${jti}`)) ?? 0) > 0; } catch { return false; }
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => undefined);
  }
}
