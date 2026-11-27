import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { localDate, localDateTime, now } from '../common/time.js';
import type { outing_polls } from '../generated/prisma/client.js';
import { GatheringNotificationService } from '../gathering/gathering-notification.service.js';
import { GatheringService } from '../gathering/gathering.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HolidayService } from './holiday.service.js';

const bad = (m: string) => AppError.status(400, m);
const strip = (s: string | null | undefined) => (s == null ? null : s.replace(/<[^>]*>/g, '').trim() || null);
const AVAIL = new Set(['AVAILABLE', 'UNAVAILABLE']);
/** 투표 알림은 모임이 아직 없으므로 gathering_id 0 + related_post_id = 투표 id (웹 알림함이 type POLL_*로 투표 화면에 연결) */
const POLL_GATHERING_ID = 0;

export interface PollCreate {
  year: number; month: number; title?: string | null; description?: string | null; region?: string | null;
  startsAt?: Date | null; endsAt?: Date | null; minParticipants?: number | null; maxParticipants?: number | null;
}
export interface PollConfirm {
  optionId: number; title?: string | null; location: string | null; startTime: string | null; endTime: string | null;
  maxParticipants?: number | null; description?: string | null;
}

const dateOnly = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const dayKindOf = (d: Date) => (d.getUTCDay() === 6 ? 'SAT' : d.getUTCDay() === 0 ? 'SUN' : 'WEEKDAY');

/** SNAPDAY 월간 출사 투표 — 가능/불가 응답 집계, 운영자(관리자) 확정 시 모임 생성 */
@Injectable()
export class OutingPollService {
  private readonly log = new Logger('OutingPollService');
  constructor(private readonly prisma: PrismaService, private readonly holidays: HolidayService,
    private readonly gatherings: GatheringService, private readonly notifications: GatheringNotificationService) {}

  /** 투표 중(OPEN이고 기간 안)인지 */
  private votingOpen(p: outing_polls, at = now()) {
    return p.status === 'OPEN' && p.starts_at <= at && at < p.ends_at;
  }

  private async get(id: number) {
    const p = await this.prisma.outing_polls.findUnique({ where: { id: BigInt(id) } });
    if (!p) throw AppError.status(404, '출사 투표를 찾을 수 없습니다.');
    return p;
  }

  async list(year: number) {
    const polls = await this.prisma.outing_polls.findMany({ where: { poll_year: year }, orderBy: { poll_month: 'asc' } });
    if (polls.length === 0) return [];
    const ids = polls.map((p) => p.id);
    const [voters, optionCounts, confirmed] = await Promise.all([
      this.prisma.outing_poll_votes.groupBy({ by: ['poll_id', 'member_id'], where: { poll_id: { in: ids } } }),
      this.prisma.outing_poll_options.groupBy({ by: ['poll_id'], where: { poll_id: { in: ids } }, _count: { _all: true } }),
      this.prisma.outing_poll_options.findMany({ where: { id: { in: polls.flatMap((p) => (p.confirmed_option_id ? [p.confirmed_option_id] : [])) } } }),
    ]);
    const confirmedById = new Map(confirmed.map((o) => [o.id, o]));
    return polls.map((p) => ({
      ...this.summary(p),
      voterCount: voters.filter((v) => v.poll_id === p.id).length,
      optionCount: optionCounts.find((c) => c.poll_id === p.id)?._count._all ?? 0,
      confirmedDate: p.confirmed_option_id ? localDate(confirmedById.get(p.confirmed_option_id)?.option_date) : null,
    }));
  }

  private summary(p: outing_polls) {
    return {
      id: Number(p.id), year: p.poll_year, month: p.poll_month, title: p.title, description: p.description, region: p.region,
      status: p.status, votingOpen: this.votingOpen(p), startsAt: localDateTime(p.starts_at), endsAt: localDateTime(p.ends_at),
      minParticipants: p.min_participants, maxParticipants: p.max_participants,
      confirmedOptionId: p.confirmed_option_id == null ? null : Number(p.confirmed_option_id),
      gatheringId: p.gathering_id == null ? null : Number(p.gathering_id), createdBy: Number(p.created_by), createdAt: localDateTime(p.created_at),
    };
  }

  async detail(id: number, memberId?: number) {
    const p = await this.get(id);
    const [options, counts, voters, mine] = await Promise.all([
      this.prisma.outing_poll_options.findMany({ where: { poll_id: p.id }, orderBy: { option_date: 'asc' } }),
      this.prisma.outing_poll_votes.groupBy({ by: ['option_id', 'availability'], where: { poll_id: p.id }, _count: { _all: true } }),
      this.prisma.outing_poll_votes.groupBy({ by: ['member_id'], where: { poll_id: p.id } }),
      memberId ? this.prisma.outing_poll_votes.findMany({ where: { poll_id: p.id, member_id: BigInt(memberId) } }) : Promise.resolve([]),
    ]);
    const count = (oid: bigint, a: string) => counts.find((c) => c.option_id === oid && c.availability === a)?._count._all ?? 0;
    const mineBy = new Map(mine.map((v) => [v.option_id, v.availability]));
    const opts = options.map((o) => ({
      id: Number(o.id), date: localDate(o.option_date), dayKind: o.day_kind, label: o.label,
      available: count(o.id, 'AVAILABLE'), unavailable: count(o.id, 'UNAVAILABLE'), mine: mineBy.get(o.id) ?? null,
    }));
    // 추천: 가능 인원 최다(동률 모두), 최소 인원이 있으면 그 이상만, 아무도 가능하지 않으면 없음
    const eligible = opts.filter((o) => o.available > 0 && (p.min_participants == null || o.available >= p.min_participants));
    const top = eligible.reduce((m, o) => Math.max(m, o.available), 0);
    const lastAt = mine.reduce<Date | null>((m, v) => (m == null || v.updated_at > m ? v.updated_at : m), null);
    return {
      ...this.summary(p), voterCount: voters.length, options: opts,
      recommended: top > 0 ? eligible.filter((o) => o.available === top).map((o) => o.id) : [],
      myRespondedAt: localDateTime(lastAt),
    };
  }

  async create(adminId: number, req: PollCreate) {
    const { year, month } = req;
    if (!Number.isInteger(year) || year < 2024 || year > 2100) throw bad('연도가 올바르지 않습니다.');
    if (!Number.isInteger(month) || month < 1 || month > 12) throw bad('월은 1~12 사이여야 합니다.');
    if (await this.prisma.outing_polls.findFirst({ where: { poll_year: year, poll_month: month }, select: { id: true } })) {
      throw AppError.status(409, `${year}년 ${month}월 출사 투표가 이미 있습니다.`);
    }
    this.checkCounts(req.minParticipants, req.maxParticipants);
    const at = now();
    const firstOfMonth = dateOnly(year, month, 1);
    const startsAt = req.startsAt ?? at;
    const endsAt = req.endsAt ?? (firstOfMonth > at ? firstOfMonth : new Date(at.getTime() + 7 * 86400000));
    if (!(startsAt < endsAt)) throw bad('투표 시작 시각은 마감 시각보다 이전이어야 합니다.');
    const poll = await this.prisma.outing_polls.create({ data: {
      poll_year: year, poll_month: month, title: strip(req.title)?.slice(0, 100) ?? `${year}년 ${month}월 출사`,
      description: strip(req.description), region: strip(req.region)?.slice(0, 50) ?? null, status: 'OPEN',
      starts_at: startsAt, ends_at: endsAt, min_participants: req.minParticipants ?? null, max_participants: req.maxParticipants ?? null,
      created_by: BigInt(adminId), created_at: at, updated_at: at,
    } });
    // 후보: 그 달의 토·일 + 등록된 공휴일
    const holidays = new Map((await this.holidays.inMonth(year, month)).map((h) => [localDate(h.holiday_date), h.name]));
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const rows: { poll_id: bigint; option_date: Date; day_kind: string; label: string | null; created_at: Date }[] = [];
    for (let d = 1; d <= last; d++) {
      const date = dateOnly(year, month, d);
      const holiday = holidays.get(localDate(date));
      const kind = dayKindOf(date);
      if (holiday || kind !== 'WEEKDAY') rows.push({ poll_id: poll.id, option_date: date, day_kind: holiday ? 'HOLIDAY' : kind, label: holiday ?? null, created_at: at });
    }
    if (rows.length) await this.prisma.outing_poll_options.createMany({ data: rows });
    this.log.log(`[OUTING_POLL] 생성: id=${poll.id} ${year}-${month}, 후보 ${rows.length}개, by=${adminId}`);
    const audience = await this.audience(poll.id);
    for (const m of audience) await this.notifications.notifySafe(m, POLL_GATHERING_ID, 'POLL_OPENED', `${poll.title} 투표가 시작됐어요. 가능한 날짜를 알려 주세요.`, poll.id);
    return this.detail(Number(poll.id), adminId);
  }

  private checkCounts(min?: number | null, max?: number | null) {
    if (min != null && (!Number.isInteger(min) || min < 1)) throw bad('최소 인원은 1명 이상이어야 합니다.');
    if (max != null && (!Number.isInteger(max) || max < 1)) throw bad('최대 인원은 1명 이상이어야 합니다.');
    if (min != null && max != null && min > max) throw bad('최소 인원이 최대 인원보다 클 수 없습니다.');
  }

  async update(id: number, req: { title?: string | null; description?: string | null; region?: string | null; endsAt?: Date | null; minParticipants?: number | null; maxParticipants?: number | null }) {
    const p = await this.get(id);
    if (p.status === 'CONFIRMED') throw bad('확정된 투표는 수정할 수 없습니다.');
    const min = req.minParticipants !== undefined ? req.minParticipants : p.min_participants;
    const max = req.maxParticipants !== undefined ? req.maxParticipants : p.max_participants;
    this.checkCounts(min, max);
    if (req.endsAt && !(p.starts_at < req.endsAt)) throw bad('마감 시각은 투표 시작 시각 이후여야 합니다.');
    await this.prisma.outing_polls.update({ where: { id: p.id }, data: {
      ...(req.title != null ? { title: strip(req.title)?.slice(0, 100) ?? p.title } : {}),
      ...(req.description !== undefined ? { description: strip(req.description) } : {}),
      ...(req.region !== undefined ? { region: strip(req.region)?.slice(0, 50) ?? null } : {}),
      ...(req.endsAt ? { ends_at: req.endsAt, closing_notified: null } : {}),
      min_participants: min ?? null, max_participants: max ?? null, updated_at: now(),
    } });
    return this.detail(id);
  }

  async addOption(id: number, date: Date) {
    const p = await this.get(id);
    if (p.status === 'CONFIRMED') throw bad('확정된 투표에는 날짜를 추가할 수 없습니다.');
    if (date.getUTCFullYear() !== p.poll_year || date.getUTCMonth() + 1 !== p.poll_month) throw bad(`${p.poll_year}년 ${p.poll_month}월 날짜만 추가할 수 있습니다.`);
    if (await this.prisma.outing_poll_options.findFirst({ where: { poll_id: p.id, option_date: date }, select: { id: true } })) throw AppError.status(409, '이미 후보에 있는 날짜입니다.');
    const holiday = await this.prisma.public_holidays.findUnique({ where: { holiday_date: date } });
    await this.prisma.outing_poll_options.create({ data: { poll_id: p.id, option_date: date, day_kind: holiday ? 'HOLIDAY' : dayKindOf(date), label: holiday?.name ?? null, created_at: now() } });
    return this.detail(id);
  }

  async removeOption(id: number, optionId: number) {
    const p = await this.get(id);
    if (p.status === 'CONFIRMED') throw bad('확정된 투표의 날짜는 지울 수 없습니다.');
    const o = await this.prisma.outing_poll_options.findFirst({ where: { id: BigInt(optionId), poll_id: p.id } });
    if (!o) throw AppError.status(404, '후보 날짜를 찾을 수 없습니다.');
    await this.prisma.$transaction([
      this.prisma.outing_poll_votes.deleteMany({ where: { option_id: o.id } }),
      this.prisma.outing_poll_options.delete({ where: { id: o.id } }),
    ]);
    return this.detail(id);
  }

  /** 보낸 날짜만 갱신 — availability null이면 그 날짜 응답 삭제(미응답으로) */
  async vote(id: number, memberId: number, votes: { optionId: number; availability: string | null }[]) {
    const p = await this.get(id);
    if (!this.votingOpen(p)) throw bad(p.status === 'CONFIRMED' ? '이미 날짜가 확정된 투표입니다.' : '투표 기간이 아닙니다.');
    if (votes.length === 0) throw bad('응답할 날짜를 골라 주세요.');
    if (votes.length > 31) throw bad('한 번에 31개 날짜까지 응답할 수 있습니다.');
    const ids = [...new Set(votes.map((v) => v.optionId))];
    if (ids.length !== votes.length) throw bad('같은 날짜가 두 번 들어 있습니다.');
    const options = await this.prisma.outing_poll_options.findMany({ where: { id: { in: ids.map(BigInt) }, poll_id: p.id }, select: { id: true } });
    if (options.length !== ids.length) throw bad('이 투표의 날짜가 아닌 항목이 있습니다.');
    for (const v of votes) if (v.availability != null && !AVAIL.has(v.availability)) throw bad('응답은 AVAILABLE 또는 UNAVAILABLE이어야 합니다.');
    const m = BigInt(memberId);
    const at = now();
    await this.prisma.$transaction(votes.map((v) => (v.availability == null
      ? this.prisma.outing_poll_votes.deleteMany({ where: { option_id: BigInt(v.optionId), member_id: m } })
      : this.prisma.outing_poll_votes.upsert({
        where: { option_id_member_id: { option_id: BigInt(v.optionId), member_id: m } },
        create: { poll_id: p.id, option_id: BigInt(v.optionId), member_id: m, availability: v.availability, updated_at: at },
        update: { availability: v.availability, updated_at: at },
      }))));
    return this.detail(id, memberId);
  }

  async close(id: number) {
    const p = await this.get(id);
    if (p.status !== 'OPEN') throw bad('투표 중인 투표만 마감할 수 있습니다.');
    await this.prisma.outing_polls.update({ where: { id: p.id }, data: { status: 'CLOSED', updated_at: now() } });
    this.log.log(`[OUTING_POLL] 마감: id=${p.id}`);
    return this.detail(id);
  }

  async reopen(id: number) {
    const p = await this.get(id);
    if (p.status !== 'CLOSED') throw bad('마감된 투표만 다시 열 수 있습니다.');
    if (p.ends_at <= now()) throw bad('마감 시각이 지났습니다. 마감 시각을 먼저 늦춰 주세요.');
    await this.prisma.outing_polls.update({ where: { id: p.id }, data: { status: 'OPEN', updated_at: now() } });
    return this.detail(id);
  }

  async confirm(id: number, adminId: number, req: PollConfirm) {
    const p = await this.get(id);
    if (p.status === 'CONFIRMED') throw AppError.status(409, '이미 확정된 투표입니다.');
    const o = await this.prisma.outing_poll_options.findFirst({ where: { id: BigInt(req.optionId), poll_id: p.id } });
    if (!o) throw AppError.status(404, '후보 날짜를 찾을 수 없습니다.');
    const time = (s: string | null, name: string) => {
      const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s ?? '');
      if (!m) throw bad(`${name}은 HH:MM 형식이어야 합니다.`);
      return [Number(m[1]), Number(m[2])] as const;
    };
    const [sh, sm] = time(req.startTime, '집합 시각');
    const [eh, em] = time(req.endTime, '종료 시각');
    const d = o.option_date;
    const at = (h: number, mi: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, mi));
    const start = at(sh, sm);
    const end = at(eh, em);
    if (start <= now()) throw bad('이미 지난 날짜·시각으로는 확정할 수 없습니다.');
    // 모집 마감 = 출사 전날 18시(이미 지났으면 출사 시작 시각)
    const dayBefore = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1, 18, 0));
    const recruitmentEnd = dayBefore > now() ? dayBefore : start;
    const available = await this.prisma.outing_poll_votes.findMany({ where: { option_id: o.id, availability: 'AVAILABLE' }, select: { member_id: true } });
    const maxParticipants = req.maxParticipants ?? p.max_participants ?? Math.max(available.length, 10);
    const g = await this.gatherings.create(adminId, {
      title: strip(req.title) ?? p.title, description: strip(req.description) ?? p.description, detailDescription: null,
      location: req.location, startDateTime: start, endDateTime: end,
      maxParticipants, minParticipants: p.min_participants != null && p.min_participants <= maxParticipants ? p.min_participants : null,
      recruitmentEndDateTime: recruitmentEnd,
      thumbnailUrl: null, preparationNote: null, fee: null, shootTheme: null, locationIntro: null, referenceImageUrl: null,
      hashtags: null, spotId: null, beginnerFriendly: null, portraitConsentRule: null,
    });
    await this.prisma.outing_polls.update({ where: { id: p.id }, data: { status: 'CONFIRMED', confirmed_option_id: o.id, gathering_id: BigInt(g.id), updated_at: now() } });
    const label = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
    for (const v of available) {
      await this.notifications.notifySafe(v.member_id, g.id, 'POLL_CONFIRMED', `${p.title} 날짜가 ${label}로 확정됐어요. 참가 신청을 해 주세요.`, p.id);
    }
    this.log.log(`[OUTING_POLL] 확정: id=${p.id} → gathering=${g.id}, ${localDate(d)}, by=${adminId}`);
    return { pollId: Number(p.id), gatheringId: g.id };
  }

  async remind(id: number) {
    const p = await this.get(id);
    if (!this.votingOpen(p)) throw bad('투표 중일 때만 리마인드를 보낼 수 있습니다.');
    const targets = await this.nonResponders(p.id);
    for (const m of targets) await this.notifications.notifySafe(m, POLL_GATHERING_ID, 'POLL_REMIND', `${p.title} 투표에 아직 응답하지 않으셨어요.`, p.id);
    return { sent: targets.length };
  }

  async remove(id: number) {
    const p = await this.get(id);
    if (p.status === 'CONFIRMED') throw bad('확정된 투표는 삭제할 수 없습니다.');
    await this.prisma.$transaction([
      this.prisma.outing_poll_votes.deleteMany({ where: { poll_id: p.id } }),
      this.prisma.outing_poll_options.deleteMany({ where: { poll_id: p.id } }),
      this.prisma.outing_polls.delete({ where: { id: p.id } }),
    ]);
    this.log.log(`[OUTING_POLL] 삭제: id=${p.id}`);
  }

  /** 대상자 = 최근 6개월 모임 참여자 ∪ 다른 투표 응답자 */
  private async audience(excludePollId?: bigint) {
    const since = new Date(now().getTime() - 183 * 86400000);
    const recent = await this.prisma.gatherings.findMany({ where: { start_date_time: { gte: since } }, select: { id: true } });
    const [parts, voters] = await Promise.all([
      recent.length ? this.prisma.gathering_participants.findMany({ where: { gathering_id: { in: recent.map((g) => g.id) }, status: 'PARTICIPATING' }, select: { member_id: true } }) : [],
      this.prisma.outing_poll_votes.findMany({ where: excludePollId ? { poll_id: { not: excludePollId } } : {}, select: { member_id: true }, distinct: ['member_id'] }),
    ]);
    return [...new Set([...parts, ...voters].map((r) => r.member_id.toString()))].map(BigInt);
  }

  private async nonResponders(pollId: bigint) {
    const responded = new Set((await this.prisma.outing_poll_votes.findMany({ where: { poll_id: pollId }, select: { member_id: true }, distinct: ['member_id'] })).map((v) => v.member_id.toString()));
    return (await this.audience(pollId)).filter((m) => !responded.has(m.toString()));
  }

  /** 배치(10분) — 마감 시각 지난 OPEN 마감, 24시간 안 마감이면 미응답 대상자에게 1회 알림 */
  async runBatch() {
    const at = now();
    const closed = await this.prisma.outing_polls.updateMany({ where: { status: 'OPEN', ends_at: { lte: at } }, data: { status: 'CLOSED', updated_at: at } });
    const soon = await this.prisma.outing_polls.findMany({ where: { status: 'OPEN', ends_at: { gt: at, lte: new Date(at.getTime() + 86400000) }, closing_notified: null } });
    for (const p of soon) {
      const targets = await this.nonResponders(p.id);
      for (const m of targets) await this.notifications.notifySafe(m, POLL_GATHERING_ID, 'POLL_CLOSING', `${p.title} 투표가 24시간 안에 마감돼요.`, p.id);
      await this.prisma.outing_polls.update({ where: { id: p.id }, data: { closing_notified: true } });
    }
    if (closed.count || soon.length) this.log.log(`[OUTING_POLL] 배치: 자동 마감 ${closed.count}, 마감 임박 알림 ${soon.length}`);
    return { closed: closed.count, closingNotified: soon.length };
  }
}

