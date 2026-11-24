import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { isBlank, javaTrim, jsonBool, jsonInt, jsonLocalDateTime, jsonLong, jsonString } from '../common/json-body.js';
import { pageRequest, springPage } from '../common/page.js';
import { localDateTime, now } from '../common/time.js';
import type { gathering_participants, gatherings, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GatheringNotificationService } from './gathering-notification.service.js';
import { GatheringPlacePollService } from './gathering-place-poll.service.js';

const bad = (m: string) => AppError.status(400, m);
const sanitize = (s: string | null) => (s == null ? null : javaTrim(s.replace(/<[^>]*>/g, '')));

export interface GatheringRequest {
  title: string | null; description: string | null; detailDescription: string | null; location: string | null;
  startDateTime: Date | null; endDateTime: Date | null; maxParticipants: number | null; recruitmentEndDateTime: Date | null;
  thumbnailUrl: string | null; preparationNote: string | null; fee: string | null; shootTheme: string | null; locationIntro: string | null;
  referenceImageUrl: string | null; hashtags: string | null; spotId: number | null; beginnerFriendly: boolean | null; portraitConsentRule: boolean | null;
}

export function readGatheringRequest(b: Record<string, unknown>): GatheringRequest {
  const s = (k: string) => jsonString(b[k], k);
  return {
    title: s('title'), description: s('description'), detailDescription: s('detailDescription'), location: s('location'),
    startDateTime: jsonLocalDateTime(b.startDateTime, 'startDateTime'), endDateTime: jsonLocalDateTime(b.endDateTime, 'endDateTime'),
    maxParticipants: jsonInt(b.maxParticipants, 'maxParticipants'), recruitmentEndDateTime: jsonLocalDateTime(b.recruitmentEndDateTime, 'recruitmentEndDateTime'),
    thumbnailUrl: s('thumbnailUrl'), preparationNote: s('preparationNote'), fee: s('fee'), shootTheme: s('shootTheme'), locationIntro: s('locationIntro'),
    referenceImageUrl: s('referenceImageUrl'), hashtags: s('hashtags'), spotId: jsonLong(b.spotId, 'spotId'),
    beginnerFriendly: jsonBool(b.beginnerFriendly, 'beginnerFriendly'), portraitConsentRule: jsonBool(b.portraitConsentRule, 'portraitConsentRule'),
  };
}

const participantBody = (p: gathering_participants) => ({
  id: Number(p.id), memberId: Number(p.member_id), status: p.status, reason: p.reason, joinedAt: localDateTime(p.joined_at),
});

/** Spring GatheringService — 모임 CRUD·참여/대기자·모집 마감 */
@Injectable()
export class GatheringService {
  private readonly log = new Logger('GatheringService');
  constructor(private readonly prisma: PrismaService, private readonly notifications: GatheringNotificationService,
    private readonly polls: GatheringPlacePollService) {}

  async toResponses(list: gatherings[]) {
    const spotIds = [...new Set(list.flatMap((g) => (g.spot_id == null ? [] : [g.spot_id])))];
    const ids = list.map((g) => g.id);
    const [spots, counts] = await Promise.all([
      spotIds.length ? this.prisma.spots.findMany({ where: { id: { in: spotIds } }, select: { id: true, name: true, region: true, lat: true, lng: true } }) : [],
      ids.length ? this.prisma.gathering_participants.groupBy({ by: ['gathering_id', 'status'], where: { gathering_id: { in: ids }, status: { in: ['PARTICIPATING', 'WAITING'] } }, _count: { _all: true } }) : [],
    ]);
    const spotById = new Map(spots.map((s) => [s.id, s]));
    const count = (gid: bigint, st: string) => counts.find((c) => c.gathering_id === gid && c.status === st)?._count._all ?? 0;
    return list.map((g) => {
      const spot = g.spot_id != null ? spotById.get(g.spot_id) : undefined;
      return {
        id: Number(g.id), title: g.title, description: g.description, detailDescription: g.detail_description, location: g.location,
        startDateTime: localDateTime(g.start_date_time), endDateTime: localDateTime(g.end_date_time), maxParticipants: g.max_participants,
        recruitmentEndDateTime: localDateTime(g.recruitment_end_date_time), status: g.status, thumbnailUrl: g.thumbnail_url,
        preparationNote: g.preparation_note, fee: g.fee, shootTheme: g.shoot_theme, locationIntro: g.location_intro,
        referenceImageUrl: g.reference_image_url, hashtags: g.hashtags, createdBy: Number(g.created_by), createdAt: localDateTime(g.created_at),
        spotId: spot ? Number(spot.id) : null, spotName: spot?.name ?? null, spotRegion: spot?.region ?? null, spotLat: spot?.lat ?? null, spotLng: spot?.lng ?? null,
        beginnerFriendly: g.beginner_friendly === true, portraitConsentRule: g.portrait_consent_rule === true,
        participantCount: count(g.id, 'PARTICIPATING'), waitingCount: count(g.id, 'WAITING'),
      };
    });
  }

  private async toResponse(g: gatherings) {
    return (await this.toResponses([g]))[0];
  }

  private async resolveSpot(spotId: number | null) {
    if (spotId == null || spotId === 0) return null;
    const s = await this.prisma.spots.findUnique({ where: { id: BigInt(spotId) }, select: { id: true } });
    if (!s) throw bad('출사 스팟을 찾을 수 없습니다.');
    return s.id;
  }

  async create(memberId: number, req: GatheringRequest) {
    if (req.title == null || isBlank(req.title)) throw bad('모임 제목은 필수입니다.');
    if (req.location == null || isBlank(req.location)) throw bad('모임 장소는 필수입니다.');
    if (req.maxParticipants == null || req.maxParticipants <= 0) throw bad('최대 참여 인원은 1명 이상이어야 합니다.');
    if (req.startDateTime == null || req.endDateTime == null) throw bad('모임 시작/종료 시간은 필수입니다.');
    if (!(req.startDateTime < req.endDateTime)) throw bad('모임 시작 시간은 종료 시간보다 이전이어야 합니다.');
    if (req.recruitmentEndDateTime == null) throw bad('모집 마감 시간은 필수입니다.');
    if (req.recruitmentEndDateTime > req.startDateTime) throw bad('모집 마감 시간은 모임 시작 시간 이전이어야 합니다.');
    const spotId = await this.resolveSpot(req.spotId);
    const g = await this.prisma.gatherings.create({ data: {
      title: sanitize(req.title)!, description: sanitize(req.description), detail_description: sanitize(req.detailDescription), location: sanitize(req.location)!,
      start_date_time: req.startDateTime, end_date_time: req.endDateTime, max_participants: req.maxParticipants, recruitment_end_date_time: req.recruitmentEndDateTime,
      status: 'RECRUITING', thumbnail_url: sanitize(req.thumbnailUrl), preparation_note: sanitize(req.preparationNote), fee: sanitize(req.fee),
      shoot_theme: sanitize(req.shootTheme), location_intro: sanitize(req.locationIntro), reference_image_url: sanitize(req.referenceImageUrl),
      hashtags: sanitize(req.hashtags), created_by: BigInt(memberId), spot_id: spotId,
      beginner_friendly: req.beginnerFriendly === true ? true : null, portrait_consent_rule: req.portraitConsentRule === true ? true : null, created_at: now(),
    } });
    this.log.log(`[GATHERING] 모임 생성: id=${g.id}, createdBy=${memberId}`);
    return this.toResponse(g);
  }

  private async own(id: number, memberId: number, message: string) {
    const g = await this.prisma.gatherings.findFirst({ where: { id: BigInt(id), created_by: BigInt(memberId) } });
    if (!g) throw AppError.status(403, message);
    return g;
  }

  async update(id: number, memberId: number, req: GatheringRequest) {
    const g = await this.own(id, memberId, '모임을 찾을 수 없거나 수정 권한이 없습니다.');
    const d: Prisma.gatheringsUpdateInput = {};
    if (req.title != null && !isBlank(req.title)) d.title = sanitize(req.title)!;
    if (req.description != null) d.description = sanitize(req.description);
    if (req.detailDescription != null) d.detail_description = sanitize(req.detailDescription);
    if (req.location != null && !isBlank(req.location)) d.location = sanitize(req.location)!;
    const start = req.startDateTime ?? g.start_date_time;
    const end = req.endDateTime ?? g.end_date_time;
    if (req.startDateTime != null) d.start_date_time = req.startDateTime;
    if (req.endDateTime != null) d.end_date_time = req.endDateTime;
    if (!(start < end)) throw bad('모임 시작 시간은 종료 시간보다 이전이어야 합니다.');
    if (req.maxParticipants != null) {
      if (req.maxParticipants <= 0) throw bad('최대 참여 인원은 1명 이상이어야 합니다.');
      d.max_participants = req.maxParticipants;
    }
    if (req.recruitmentEndDateTime != null) {
      if (req.recruitmentEndDateTime > start) throw bad('모집 마감 시간은 모임 시작 시간 이전이어야 합니다.');
      d.recruitment_end_date_time = req.recruitmentEndDateTime;
    }
    if (req.thumbnailUrl != null) d.thumbnail_url = sanitize(req.thumbnailUrl);
    if (req.preparationNote != null) d.preparation_note = sanitize(req.preparationNote);
    if (req.fee != null) d.fee = sanitize(req.fee);
    if (req.shootTheme != null) d.shoot_theme = sanitize(req.shootTheme);
    if (req.locationIntro != null) d.location_intro = sanitize(req.locationIntro);
    if (req.referenceImageUrl != null) d.reference_image_url = sanitize(req.referenceImageUrl);
    if (req.hashtags != null) d.hashtags = sanitize(req.hashtags);
    if (req.spotId != null) d.spot_id = req.spotId === 0 ? null : await this.resolveSpot(req.spotId);
    if (req.beginnerFriendly != null) d.beginner_friendly = req.beginnerFriendly ? true : null;
    if (req.portraitConsentRule != null) d.portrait_consent_rule = req.portraitConsentRule ? true : null;
    const saved = Object.keys(d).length ? await this.prisma.gatherings.update({ where: { id: g.id }, data: d }) : g;
    return this.toResponse(saved);
  }

  async remove(id: number, memberId: number) {
    const g = await this.own(id, memberId, '모임을 찾을 수 없거나 삭제 권한이 없습니다.');
    await this.prisma.gathering_participants.deleteMany({ where: { gathering_id: g.id } });
    await this.polls.deleteForGathering(g.id);
    await this.prisma.gatherings.delete({ where: { id: g.id } });
    this.log.log(`[GATHERING] 모임 삭제: id=${id}, deletedBy=${memberId}`);
  }

  async list(status: string | undefined, page: number, size: number) {
    const p = pageRequest(page, Math.min(size, 50));
    const where = status != null && !isBlank(status) ? { status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.gatherings.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: p.skip, take: p.take }),
      this.prisma.gatherings.count({ where }),
    ]);
    return springPage(await this.toResponses(rows), p.page, p.size, total);
  }

  async detail(id: number) {
    const g = await this.prisma.gatherings.findUnique({ where: { id: BigInt(id) } });
    if (!g) throw AppError.status(404, '모임을 찾을 수 없습니다.');
    return this.toResponse(g);
  }

  async mine(memberId: number) {
    const mid = BigInt(memberId);
    const created = await this.prisma.gatherings.findMany({ where: { created_by: mid } });
    const createdIds = new Set(created.map((g) => g.id));
    const parts = await this.prisma.gathering_participants.findMany({ where: { member_id: mid, status: { in: ['PARTICIPATING', 'WAITING'] } }, select: { gathering_id: true } });
    const otherIds = [...new Set(parts.map((p) => p.gathering_id).filter((id) => !createdIds.has(id)))];
    const joined = otherIds.length ? await this.prisma.gatherings.findMany({ where: { id: { in: otherIds } } }) : [];
    const all = [...created, ...joined].sort((a, b) => b.created_at.getTime() - a.created_at.getTime() || Number(b.id - a.id));
    return this.toResponses(all);
  }

  async respond(gatheringId: number, memberId: number, status: string | null, reason: string | null) {
    if (status !== 'PARTICIPATING' && status !== 'NOT_PARTICIPATING') throw bad('status는 PARTICIPATING 또는 NOT_PARTICIPATING만 가능합니다.');
    const g = await this.prisma.gatherings.findUnique({ where: { id: BigInt(gatheringId) } });
    if (!g) throw AppError.status(404, '모임을 찾을 수 없습니다.');
    if (g.status !== 'RECRUITING') throw bad('모집이 마감된 모임에는 참여/미참여 응답을 변경할 수 없습니다.');
    const existing = await this.prisma.gathering_participants.findFirst({ where: { gathering_id: g.id, member_id: BigInt(memberId) } });
    let resolved = 'NOT_PARTICIPATING';
    let newReason: string | null = sanitize(reason);
    if (status === 'PARTICIPATING') {
      const count = await this.prisma.gathering_participants.count({ where: { gathering_id: g.id, status: 'PARTICIPATING' } });
      const already = existing?.status === 'PARTICIPATING';
      resolved = !already && count >= g.max_participants ? 'WAITING' : 'PARTICIPATING';
      newReason = null;
    }
    const p = existing
      ? (existing.status === resolved && existing.reason === newReason ? existing
        : await this.prisma.gathering_participants.update({ where: { id: existing.id }, data: { status: resolved, reason: newReason } }))
      : await this.prisma.gathering_participants.create({ data: { gathering_id: g.id, member_id: BigInt(memberId), status: resolved, reason: newReason, joined_at: now() } });
    this.log.log(`[GATHERING] 참여 응답: gatheringId=${gatheringId}, memberId=${memberId}, status=${resolved}`);
    return participantBody(p);
  }

  async cancel(gatheringId: number, memberId: number) {
    const p = await this.prisma.gathering_participants.findFirst({ where: { gathering_id: BigInt(gatheringId), member_id: BigInt(memberId) } });
    if (!p) throw AppError.status(404, '참여 정보를 찾을 수 없습니다.');
    if (p.status !== 'PARTICIPATING' && p.status !== 'WAITING') throw bad('취소할 수 있는 상태가 아닙니다.');
    const wasParticipating = p.status === 'PARTICIPATING';
    await this.prisma.gathering_participants.update({ where: { id: p.id }, data: { status: 'CANCELLED' } });
    if (wasParticipating) {
      const g = await this.prisma.gatherings.findUnique({ where: { id: BigInt(gatheringId) } });
      if (g?.status === 'RECRUITING') {
        const waiter = await this.prisma.gathering_participants.findFirst({ where: { gathering_id: g.id, status: 'WAITING' }, orderBy: [{ joined_at: 'asc' }, { id: 'asc' }] });
        if (waiter) {
          await this.prisma.gathering_participants.update({ where: { id: waiter.id }, data: { status: 'PARTICIPATING' } });
          this.log.log(`[GATHERING] 대기자 승격: gatheringId=${gatheringId}, memberId=${waiter.member_id}`);
          await this.notifications.notifySafe(waiter.member_id, g.id, 'PARTICIPATION_CONFIRMED', `'${g.title}' 모임 참여가 확정되었습니다.`);
        }
      }
    }
    this.log.log(`[GATHERING] 참여 취소: gatheringId=${gatheringId}, memberId=${memberId}`);
  }

  async closeRecruitment(gatheringId: number, memberId: number) {
    const g = await this.own(gatheringId, memberId, '모임을 찾을 수 없거나 권한이 없습니다.');
    if (g.status === 'RECRUITMENT_CLOSED') return this.toResponse(g);
    if (g.status !== 'RECRUITING') throw bad(`현재 상태(${g.status})에서는 모집을 마감할 수 없습니다.`);
    const place = await this.polls.applyWinner(g);
    const saved = await this.prisma.gatherings.update({ where: { id: g.id }, data: { status: 'RECRUITMENT_CLOSED', ...(place ?? {}) } });
    this.log.log(`[GATHERING] 모집 마감: id=${gatheringId}, closedBy=${memberId}`);
    await this.notifyClosed(saved);
    return this.toResponse(saved);
  }

  /** 모집 마감 알림 — 참여자, 그다음 대기자 */
  async notifyClosed(g: Pick<gatherings, 'id' | 'title'>) {
    for (const st of ['PARTICIPATING', 'WAITING']) {
      const ps = await this.prisma.gathering_participants.findMany({ where: { gathering_id: g.id, status: st }, orderBy: { id: 'asc' } });
      for (const p of ps) await this.notifications.notifySafe(p.member_id, g.id, 'RECRUITMENT_CLOSED', `'${g.title}' 모집이 마감되었습니다.`);
    }
  }

  async participants(gatheringId: number, memberId: number) {
    const g = await this.own(gatheringId, memberId, '모임을 찾을 수 없거나 접근 권한이 없습니다.');
    const all = await this.prisma.gathering_participants.findMany({ where: { gathering_id: g.id }, orderBy: [{ joined_at: 'asc' }, { id: 'asc' }] });
    const by = (st: string) => all.filter((p) => p.status === st).map(participantBody);
    const participating = by('PARTICIPATING');
    const waiting = by('WAITING');
    return { participating, waiting, notParticipating: by('NOT_PARTICIPATING'), participantCount: participating.length, waitingCount: waiting.length, maxParticipants: g.max_participants };
  }
}
