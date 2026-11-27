import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { now, today, wallClockNow } from '../common/time.js';
import { GatheringNotificationService } from '../gathering/gathering-notification.service.js';
import { GatheringPlacePollService } from '../gathering/gathering-place-poll.service.js';
import { GatheringReminderService } from '../gathering/gathering-reminder.service.js';
import { OutingPollService } from '../outing/outing-poll.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Spring @Scheduled 배치 4개를 같은 cron으로 옮긴 것(서버 시간대 UTC 전제).
 * 전환 기간에는 Spring도 같은 DB에서 배치를 돌리므로 알림이 두 번 가지 않게, LEGACY_API_URL이 있으면 기본으로 꺼 둔다.
 * BATCH_ENABLED=true|false로 직접 정할 수 있다(컷오버 때 Spring을 끄면서 켠다).
 */
@Injectable()
export class BatchService {
  private readonly log = new Logger('BatchService');
  constructor(private readonly prisma: PrismaService, private readonly notifications: GatheringNotificationService,
    private readonly polls: GatheringPlacePollService, private readonly outingPolls: OutingPollService,
    private readonly reminders: GatheringReminderService) {}

  get enabled() {
    const v = process.env.BATCH_ENABLED;
    return v != null ? v === 'true' : !process.env.LEGACY_API_URL;
  }

  /** DeliverySetService.cleanupExpiredSets — 매시 정각, 만료 세트 삭제(사진 연결 행은 Spring처럼 남는다) */
  @Cron('0 0 * * * *')
  async cleanupExpiredDeliveries() {
    if (!this.enabled) return;
    this.log.log('Cleaning up expired delivery sets...');
    await this.prisma.delivery_sets.deleteMany({ where: { expires_at: { lt: now() } } });
  }

  /** BookingBatchService — 매일 02:00, 지난 REQUESTED 예약 취소 + 30일 지난 차단 날짜 삭제 */
  @Cron('0 0 2 * * *')
  async expireStaleBookings() {
    if (!this.enabled) return;
    try {
      const t = today();
      const expired = await this.prisma.bookings.updateMany({ where: { status: 'REQUESTED', shoot_date: { lt: t } }, data: { status: 'CANCELLED' } });
      const cutoff = new Date(t.getTime() - 30 * 86400000);
      const cleaned = await this.prisma.booking_blocked_dates.deleteMany({ where: { blocked_date: { lt: cutoff } } });
      this.log.log(`Booking batch: ${expired.count} REQUESTED 예약 만료, ${cleaned.count} 차단 날짜 정리`);
    } catch (e) {
      this.log.error(`Booking batch 실행 중 오류 발생 — 다음 실행에서 재시도됩니다: ${(e as Error).message}`);
    }
  }

  /** MeetBatchService — 매일 03:00, 확정일이 지난 CONFIRMED 약속을 COMPLETED로 */
  @Cron('0 0 3 * * *')
  async completeExpiredMeets() {
    if (!this.enabled) return;
    try {
      const r = await this.prisma.meets.updateMany({ where: { status: 'CONFIRMED', confirmed_date: { lt: today() } }, data: { status: 'COMPLETED' } });
      this.log.log(`Meet batch: ${r.count} 약속 자동 완료 처리`);
    } catch (e) {
      this.log.error(`Meet batch 실행 중 오류 발생 — 다음 실행에서 재시도됩니다: ${(e as Error).message}`);
    }
  }

  /**
   * GatheringBatchService — 5분마다 모집 마감 → 예정 → 시작 → 종료 + 알림, 모집 마감 때 장소 투표 확정.
   * 모임 시각은 한국 시간 벽시계로 저장되므로 wallClockNow()와 비교한다(Spring은 UTC now()와 비교해 9시간 늦게 전환됐다).
   */
  @Cron('0 */5 * * * *')
  async transitionGatheringStatuses() {
    if (!this.enabled) return;
    try {
      const t = wallClockNow();
      const toClose = (await this.prisma.gatherings.findMany({ where: { status: 'RECRUITING', recruitment_end_date_time: { lt: t } }, select: { id: true } })).map((g) => g.id);
      const closed = await this.prisma.gatherings.updateMany({ where: { status: 'RECRUITING', recruitment_end_date_time: { lt: t } }, data: { status: 'RECRUITMENT_CLOSED' } });
      for (const id of toClose) {
        try {
          const g = await this.prisma.gatherings.findUnique({ where: { id } });
          if (!g) continue;
          const place = await this.polls.applyWinner(g);
          if (place) await this.prisma.gatherings.update({ where: { id }, data: place });
          await this.reminders.notifyIfMinNotMet(g);
        } catch (e) {
          this.log.error(`[GATHERING] 장소 투표 확정 실패: gatheringId=${id}: ${(e as Error).message}`);
        }
      }
      if (toClose.length) await this.notifyAll(toClose, 'RECRUITMENT_CLOSED', (title) => `'${title}' 모집이 마감되었습니다.`, ['PARTICIPATING', 'WAITING']);

      const scheduled = await this.prisma.gatherings.updateMany({ where: { status: 'RECRUITMENT_CLOSED' }, data: { status: 'SCHEDULED' } });
      const toStart = (await this.prisma.gatherings.findMany({ where: { status: 'SCHEDULED', start_date_time: { lt: t } }, select: { id: true } })).map((g) => g.id);
      const started = await this.prisma.gatherings.updateMany({ where: { status: 'SCHEDULED', start_date_time: { lt: t } }, data: { status: 'ONGOING' } });
      if (toStart.length) await this.notifyAll(toStart, 'GATHERING_STARTED', (title) => `'${title}' 모임이 시작되었습니다.`, ['PARTICIPATING']);

      const toEnd = (await this.prisma.gatherings.findMany({ where: { status: 'ONGOING', end_date_time: { lt: t } }, select: { id: true } })).map((g) => g.id);
      const ended = await this.prisma.gatherings.updateMany({ where: { status: 'ONGOING', end_date_time: { lt: t } }, data: { status: 'ENDED' } });
      if (toEnd.length) await this.notifyAll(toEnd, 'GATHERING_ENDED', (title) => `'${title}' 모임이 종료되어 앨범이 생성되었습니다.`, ['PARTICIPATING']);

      this.log.log(`Gathering batch: ${closed.count} 모집마감, ${scheduled.count} 모임예정 전환, ${started.count} 모임시작, ${ended.count} 모임종료`);
    } catch (e) {
      this.log.error(`Gathering batch 실행 중 오류 발생 — 다음 실행에서 재시도됩니다: ${(e as Error).message}`);
    }
  }

  private async notifyAll(ids: bigint[], type: string, message: (title: string) => string, statuses: string[]) {
    try {
      const titles = new Map((await this.prisma.gatherings.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })).map((g) => [g.id, g.title]));
      for (const id of ids) {
        const msg = message(titles.get(id) ?? '모임');
        for (const st of statuses) {
          const ps = await this.prisma.gathering_participants.findMany({ where: { gathering_id: id, status: st }, orderBy: { id: 'asc' }, select: { member_id: true } });
          for (const p of ps) await this.notifications.notifySafe(p.member_id, id, type, msg);
        }
      }
    } catch (e) {
      this.log.error(`[GATHERING_NOTIFICATION] 배치 알림 루프 실패: type=${type}: ${(e as Error).message}`);
    }
  }

  /** 모임 리마인더 — 5분마다 모집 마감 임박·전날·곧 시작(PLANNING_gathering-schedule-reminders.md) */
  @Cron('30 */5 * * * *')
  async sendGatheringReminders() {
    if (!this.enabled) return;
    try {
      await this.reminders.sendReminders();
    } catch (e) {
      this.log.error(`Gathering reminder batch 실행 중 오류 — 다음 실행에서 재시도됩니다: ${(e as Error).message}`);
    }
  }

  /** 이번 달 출사 모집 소식 — 매월 1일 01:00 UTC = 10:00 한국 시간 */
  @Cron('0 0 1 1 * *')
  async sendMonthlyGatheringDigest() {
    if (!this.enabled) return;
    try {
      await this.reminders.sendMonthlyDigest();
    } catch (e) {
      this.log.error(`Monthly gathering digest 실행 중 오류: ${(e as Error).message}`);
    }
  }

  /** SNAPDAY 월간 출사 투표 — 10분마다 자동 마감·마감 임박 알림(새 API에만 있는 배치) */
  @Cron('0 */10 * * * *')
  async runOutingPollBatch() {
    if (!this.enabled) return;
    try {
      await this.outingPolls.runBatch();
    } catch (e) {
      this.log.error(`Outing poll batch 실행 중 오류 — 다음 실행에서 재시도됩니다: ${(e as Error).message}`);
    }
  }
}
