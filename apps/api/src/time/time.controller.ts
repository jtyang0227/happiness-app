import { Controller, Get, Header, Injectable, Post, Query, HttpCode } from '@nestjs/common';
import { Public } from '../auth/auth.guard.js';
import { ok } from '../common/api-response.js';
import { nowBody, TimeSyncMonitor } from './time-sync.js';

/** 프로세스당 하나 — 앱(main.ts)과 어드민(admin-main.ts)은 별도 프로세스라 각자 잰다 */
@Injectable()
export class TimeSyncService extends TimeSyncMonitor {
  // 부모 생성자의 선택 인자를 Nest가 주입하려 하지 않도록 인자 없는 생성자를 둔다
  constructor() {
    super();
  }
}

/**
 * 서버 시각 API (PLANNING_server-time.md). 모든 시간 판단은 서버 UTC로 하고, 클라이언트는 이 값으로
 * 기기 시계와 서버의 차이를 재서 표시한다(기기 시계로 판단하지 않는다). 캐시되면 과거 시각이 내려가므로 no-store.
 */
@Controller('api/time')
export class TimeController {
  constructor(private readonly sync: TimeSyncService) {}

  /** 현재 서버 시각(UTC·KST). `client_sent_at`(epoch ms)을 주면 그대로 돌려줘 왕복 시간 계산에 쓰게 한다 */
  @Public()
  @Get('now')
  @Header('Cache-Control', 'no-store')
  now(@Query('client_sent_at') clientSentAt?: string) {
    const receivedAt = new Date();
    // 시계 측정(UDP)을 기다리지 않는다 — 마지막 측정값만 붙이고, 오래됐으면 뒤에서 갱신
    void this.sync.status().catch(() => undefined);
    const s = this.sync.snapshot();
    return ok(nowBody(new Date(), receivedAt, clientSentAt, s));
  }

  /** 동기화 상태 요약 — 일반 사용자에겐 등급·오차·마지막 동기화만 */
  @Public()
  @Get('status')
  @Header('Cache-Control', 'no-store')
  async status() {
    const s = await this.sync.status();
    return ok({ grade: s.grade, synced: s.synced, offsetMs: s.offsetMs, lastSyncAt: s.lastSyncAt, checkedAt: s.checkedAt });
  }
}

/** 어드민 진단 — 상세 상태와 즉시 재측정. 경로는 /api/admin/** 라 AdminAuthMiddleware가 관리자만 통과시킨다 */
@Controller('api/admin/time')
export class AdminTimeController {
  constructor(private readonly sync: TimeSyncService) {}

  @Get('status')
  @Header('Cache-Control', 'no-store')
  async status() {
    const s = await this.sync.status();
    const now = new Date();
    return { ...nowBody(now, now, undefined, s), status: s, servers: this.sync.opts.servers };
  }

  /** 지금 바로 다시 잰다(캐시 무시) */
  @Post('diagnostics')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async diagnostics() {
    await this.sync.check();
    const s = this.sync.snapshot();
    const now = new Date();
    return { ...nowBody(now, now, undefined, s), status: s, servers: this.sync.opts.servers, processTz: process.env.TZ ?? null };
  }
}
