import { Injectable, Logger } from '@nestjs/common';
import { now, wallClockNow } from '../common/time.js';
import type { gatherings } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GatheringNotificationService } from './gathering-notification.service.js';

const HOUR = 3600000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** 모임이 없는 알림(이번 달 모집 소식)은 출사 투표 알림과 같이 gatheringId 0 */
export const DIGEST_GATHERING_ID = 0n;

/** 벽시계 시각(한국 시간 그대로 저장된 값) → "3월 27일(토) 10:00" */
function label(d: Date) {
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WEEKDAYS[d.getUTCDay()]}) ${hh}:${mm}`;
}
const hhmm = (d: Date) => `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

/**
 * 모임 일정 알림(새 API에만 있음, PLANNING_gathering-schedule-reminders.md):
 * 모집 마감 임박·전날·곧 시작 리마인더, 정원 마감, 최소 인원 미달, 새 모임(팔로워), 이번 달 출사 모집 소식.
 * 스키마를 늘리지 않으려고 "같은 모임·같은 종류·같은 회원 알림이 이미 있으면 다시 보내지 않는다"로 중복을 막는다.
 * 모든 알림은 notifySafe — 알림 실패가 본 동작(참여·마감·생성)을 막지 않는다.
 */
@Injectable()
export class GatheringReminderService {
  private readonly log = new Logger('GatheringReminderService');
  constructor(private readonly prisma: PrismaService, private readonly notifications: GatheringNotificationService) {}

  /** 이미 받은 회원(`gatheringId:memberId`) — 리마인더 중복 방지 */
  private async alreadySent(ids: bigint[], type: string) {
    if (!ids.length) return new Set<string>();
    const rows = await this.prisma.gathering_notifications.findMany({ where: { gathering_id: { in: ids }, type }, select: { gathering_id: true, member_id: true } });
    return new Set(rows.map((r) => `${r.gathering_id}:${r.member_id}`));
  }

  private async participatingCount(gatheringId: bigint) {
    return this.prisma.gathering_participants.count({ where: { gathering_id: gatheringId, status: 'PARTICIPATING' } });
  }

  /** 5분 배치 — 모집 마감 24시간 안(만든 사람), 시작 2~24시간 전·2시간 안(참여 확정자) */
  async sendReminders() {
    const t = wallClockNow();
    let sent = 0;

    // 1) 모집 마감 임박 → 만든 사람에게 현재 인원
    const closing = await this.prisma.gatherings.findMany({ where: { status: 'RECRUITING', recruitment_end_date_time: { gt: t, lte: new Date(t.getTime() + 24 * HOUR) } } });
    const closingSent = await this.alreadySent(closing.map((g) => g.id), 'RECRUITMENT_CLOSING');
    for (const g of closing) {
      if (closingSent.has(`${g.id}:${g.created_by}`)) continue;
      const n = await this.participatingCount(g.id);
      const short = g.min_participants != null && n < g.min_participants ? ` · 최소 ${g.min_participants}명까지 ${g.min_participants - n}명 더 필요해요` : '';
      await this.notifications.notifySafe(g.created_by, g.id, 'RECRUITMENT_CLOSING',
        `'${g.title}' 모집이 ${label(g.recruitment_end_date_time)}에 마감돼요. 지금 ${n}/${g.max_participants}명${short}`.slice(0, 300));
      sent++;
    }

    // 2) 시작 전 리마인더 → 참여 확정자(모집 중에 참여한 사람도 포함)
    const active = ['RECRUITING', 'RECRUITMENT_CLOSED', 'SCHEDULED'];
    const windows: { type: string; from: number; to: number; message: (g: gatherings) => string }[] = [
      { type: 'GATHERING_REMINDER_DAY', from: 2 * HOUR, to: 24 * HOUR,
        message: (g) => `'${g.title}' 출사가 ${label(g.start_date_time)}에 시작해요 · ${g.location}${g.preparation_note ? ` · 준비물: ${g.preparation_note}` : ''}` },
      { type: 'GATHERING_REMINDER_SOON', from: 0, to: 2 * HOUR,
        message: (g) => `'${g.title}' 출사가 곧 시작해요(${hhmm(g.start_date_time)}) · ${g.location}` },
    ];
    for (const w of windows) {
      const list = await this.prisma.gatherings.findMany({ where: { status: { in: active }, start_date_time: { gt: new Date(t.getTime() + w.from), lte: new Date(t.getTime() + w.to) } } });
      if (!list.length) continue;
      const done = await this.alreadySent(list.map((g) => g.id), w.type);
      const parts = await this.prisma.gathering_participants.findMany({ where: { gathering_id: { in: list.map((g) => g.id) }, status: 'PARTICIPATING' }, orderBy: { id: 'asc' }, select: { gathering_id: true, member_id: true } });
      for (const g of list) {
        const msg = w.message(g).slice(0, 300);
        for (const p of parts) {
          if (p.gathering_id !== g.id || done.has(`${g.id}:${p.member_id}`)) continue;
          await this.notifications.notifySafe(p.member_id, g.id, w.type, msg);
          sent++;
        }
      }
    }
    if (sent) this.log.log(`[GATHERING_REMINDER] 리마인더 ${sent}건 발송`);
    return sent;
  }

  /** 참여 응답으로 정원이 찼을 때 만든 사람에게 1회(본인이 채운 경우 제외) */
  async notifyIfFull(g: gatherings) {
    try {
      const n = await this.participatingCount(g.id);
      if (n < g.max_participants) return;
      if ((await this.alreadySent([g.id], 'GATHERING_FULL')).has(`${g.id}:${g.created_by}`)) return;
      await this.notifications.notifySafe(g.created_by, g.id, 'GATHERING_FULL', `'${g.title}' 정원 ${g.max_participants}명이 다 찼어요. 이제 신청하는 사람은 대기자로 등록돼요.`.slice(0, 300));
    } catch (e) {
      this.log.error(`[GATHERING_REMINDER] 정원 마감 알림 실패: gatheringId=${g.id}: ${(e as Error).message}`);
    }
  }

  /** 모집 마감(수동·자동) 때 최소 인원 미달이면 만든 사람에게 */
  async notifyIfMinNotMet(g: gatherings) {
    try {
      if (g.min_participants == null) return;
      const n = await this.participatingCount(g.id);
      if (n >= g.min_participants) return;
      if ((await this.alreadySent([g.id], 'MIN_NOT_MET')).has(`${g.id}:${g.created_by}`)) return;
      await this.notifications.notifySafe(g.created_by, g.id, 'MIN_NOT_MET',
        `'${g.title}' 모집이 끝났지만 최소 인원 ${g.min_participants}명에 못 미쳐요(참여 ${n}명). 일정 변경이나 취소를 검토해 주세요.`.slice(0, 300));
    } catch (e) {
      this.log.error(`[GATHERING_REMINDER] 최소 인원 알림 실패: gatheringId=${g.id}: ${(e as Error).message}`);
    }
  }

  /** 새 모임 → 만든 사람의 팔로워(서로 차단한 사람 제외) */
  async notifyFollowersOfNew(g: gatherings) {
    try {
      const followers = await this.prisma.follows.findMany({ where: { following_id: g.created_by }, select: { follower_id: true } });
      if (!followers.length) return;
      const blocks = await this.prisma.member_blocks.findMany({ where: { OR: [{ blocker_id: g.created_by }, { blocked_id: g.created_by }] }, select: { blocker_id: true, blocked_id: true } });
      const blocked = new Set(blocks.map((b) => (b.blocker_id === g.created_by ? b.blocked_id : b.blocker_id).toString()));
      const creator = await this.prisma.members.findUnique({ where: { id: g.created_by }, select: { name: true } });
      const msg = `${creator?.name ?? '팔로우한 작가'}님이 새 출사 모임을 열었어요: '${g.title}' · ${label(g.start_date_time)}`.slice(0, 300);
      for (const f of followers) {
        if (f.follower_id === g.created_by || blocked.has(f.follower_id.toString())) continue;
        await this.notifications.notifySafe(f.follower_id, g.id, 'NEW_GATHERING', msg);
      }
    } catch (e) {
      this.log.error(`[GATHERING_REMINDER] 새 모임 알림 실패: gatheringId=${g.id}: ${(e as Error).message}`);
    }
  }

  /**
   * 이번 달 출사 모집 소식(매월 1일 10:00 한국 시간 배치) — 그 달에 시작하는 모집 중 모임이 있을 때만,
   * 출사 투표와 같은 대상(최근 6개월 참여자 ∪ 투표 응답자)에게 한 달에 한 번.
   */
  async sendMonthlyDigest() {
    const t = wallClockNow();
    const monthStart = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1));
    const list = await this.prisma.gatherings.findMany({
      where: { status: 'RECRUITING', start_date_time: { gte: monthStart, lt: nextMonth } }, orderBy: [{ start_date_time: 'asc' }, { id: 'asc' }], select: { title: true },
    });
    if (!list.length) return 0;
    // 이번 달에 이미 받은 회원은 건너뜀 — created_at은 UTC 실제 시각이라 벽시계 달 시작을 실제 시각으로 되돌려 비교
    const offset = t.getTime() - now().getTime();
    const sinceReal = new Date(monthStart.getTime() - offset);
    const got = new Set((await this.prisma.gathering_notifications.findMany({ where: { type: 'MONTHLY_DIGEST', created_at: { gte: sinceReal } }, select: { member_id: true } })).map((r) => r.member_id.toString()));
    const month = t.getUTCMonth() + 1;
    const more = list.length > 1 ? ` 외 ${list.length - 1}개` : '';
    const msg = `${month}월 출사 모집 소식 — 모집 중인 모임 ${list.length}개: '${list[0].title}'${more}. 자리 있을 때 신청해 보세요.`.slice(0, 300);
    let sent = 0;
    for (const m of await this.audience()) {
      if (got.has(m.toString())) continue;
      await this.notifications.notifySafe(m, DIGEST_GATHERING_ID, 'MONTHLY_DIGEST', msg);
      sent++;
    }
    this.log.log(`[GATHERING_REMINDER] ${month}월 모집 소식 ${sent}건 발송(모임 ${list.length}개)`);
    return sent;
  }

  /** 대상자 = 최근 6개월 모임 참여자 ∪ 출사 투표 응답자 (OutingPollService.audience와 같은 기준) */
  private async audience() {
    const since = new Date(now().getTime() - 183 * 86400000);
    const recent = await this.prisma.gatherings.findMany({ where: { start_date_time: { gte: since } }, select: { id: true } });
    const [parts, voters] = await Promise.all([
      recent.length ? this.prisma.gathering_participants.findMany({ where: { gathering_id: { in: recent.map((g) => g.id) }, status: 'PARTICIPATING' }, select: { member_id: true } }) : [],
      this.prisma.outing_poll_votes.findMany({ select: { member_id: true }, distinct: ['member_id'] }),
    ]);
    return [...new Set([...parts, ...voters].map((r) => r.member_id.toString()))].map(BigInt);
  }
}
