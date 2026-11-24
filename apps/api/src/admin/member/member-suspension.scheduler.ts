import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { AdminMemberService } from './admin-member.service.js';

/**
 * Spring MemberSuspensionScheduler — fixedDelay 10분(admin.member.suspension-check-ms), 첫 실행 30초 뒤.
 * Spring 어드민이 같은 스키마에서 아직 돌고 있으면 ADMIN_BATCH_ENABLED=false로 끈다(이력이 두 번 남지 않게).
 */
@Injectable()
export class MemberSuspensionScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger('MEMBER');
  private timer: NodeJS.Timeout | null = null;
  private readonly delayMs = Number(process.env.ADMIN_SUSPENSION_CHECK_MS ?? 600000);

  constructor(private readonly members: AdminMemberService) {}

  onApplicationBootstrap() {
    if ((process.env.ADMIN_BATCH_ENABLED ?? 'true') === 'false') return;
    this.timer = setTimeout(() => this.tick(), 30000);
  }

  onApplicationShutdown() {
    if (this.timer) clearTimeout(this.timer);
  }

  private async tick() {
    try {
      const released = await this.members.releaseExpiredSuspensions();
      if (released > 0) this.log.log(`[MEMBER] 정지 기간 만료 자동 해제 ${released}명`);
    } catch (e) {
      this.log.error('정지 자동 해제 실패', e instanceof Error ? e.stack : String(e));
    }
    this.timer = setTimeout(() => this.tick(), this.delayMs);
  }
}
