import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { pageRequest, springPage } from '../common/page.js';
import { localDateTime, now } from '../common/time.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Spring GatheringNotificationService — polling 배지용 인앱 알림 */
@Injectable()
export class GatheringNotificationService {
  private readonly log = new Logger('GatheringNotificationService');
  constructor(private readonly prisma: PrismaService) {}

  async notify(memberId: bigint | number, gatheringId: bigint | number, type: string, message: string, relatedPostId: bigint | number | null = null) {
    await this.prisma.gathering_notifications.create({ data: {
      member_id: BigInt(memberId), gathering_id: BigInt(gatheringId), type, message,
      related_post_id: relatedPostId == null ? null : BigInt(relatedPostId), is_read: false, created_at: now(),
    } });
  }

  /** 호출자 트랜잭션에 영향 없게 실패는 로그만 */
  async notifySafe(memberId: bigint | number, gatheringId: bigint | number, type: string, message: string, relatedPostId: bigint | number | null = null) {
    try {
      await this.notify(memberId, gatheringId, type, message, relatedPostId);
    } catch (e) {
      this.log.error(`[GATHERING_NOTIFICATION] ${type} 알림 실패: gatheringId=${gatheringId}, memberId=${memberId}: ${(e as Error).message}`);
    }
  }

  async list(memberId: number, page: number, size: number) {
    const p = pageRequest(page, Math.min(size, 50));
    const where = { member_id: BigInt(memberId) };
    const [rows, total] = await Promise.all([
      this.prisma.gathering_notifications.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: p.skip, take: p.take }),
      this.prisma.gathering_notifications.count({ where }),
    ]);
    // Lombok boolean isRead + @Getter → JSON 키 read
    const content = rows.map((n) => ({
      id: Number(n.id), gatheringId: Number(n.gathering_id), type: n.type, message: n.message,
      relatedPostId: n.related_post_id == null ? null : Number(n.related_post_id), read: n.is_read, createdAt: localDateTime(n.created_at),
    }));
    return springPage(content, p.page, p.size, total);
  }

  unreadCount(memberId: number) {
    return this.prisma.gathering_notifications.count({ where: { member_id: BigInt(memberId), is_read: false } });
  }

  async markRead(id: number, memberId: number) {
    const n = await this.prisma.gathering_notifications.findUnique({ where: { id: BigInt(id) } });
    if (!n) throw AppError.status(404, '알림을 찾을 수 없습니다.');
    if (Number(n.member_id) !== memberId) throw AppError.status(403, '본인의 알림만 읽음 처리할 수 있습니다.');
    if (!n.is_read) await this.prisma.gathering_notifications.update({ where: { id: n.id }, data: { is_read: true } });
  }

  async markAllRead(memberId: number) {
    await this.prisma.gathering_notifications.updateMany({ where: { member_id: BigInt(memberId), is_read: false }, data: { is_read: true } });
  }
}
