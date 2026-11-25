import { Body, Controller, Delete, Get, HttpCode, Logger, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Public, isAdmin } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { jsonString } from '../common/json-body.js';
import { localDateTime, now } from '../common/time.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GatheringNotificationService } from './gathering-notification.service.js';
import { GatheringPlacePollService } from './gathering-place-poll.service.js';

type Body_ = Record<string, unknown> | undefined;
const MAX_BEST_VOTES = 3;
const strip = (s: string | null) => (s == null ? null : s.replace(/<[^>]*>/g, '').trim() || null);

/**
 * SNAPDAY — 출사 시작·종료(현장 모드), 베스트 포토(1인 3표), 스토리, 내 출사 기록. 새 API에만 있는 경로.
 * 기획: DESIGN_PROMPTS/planning/snapday/API_SPEC.md
 */
@Controller('api/gatherings')
export class GatheringSnapdayController {
  private readonly log = new Logger('GatheringSnapday');
  constructor(private readonly prisma: PrismaService, private readonly notifications: GatheringNotificationService,
    private readonly places: GatheringPlacePollService) {}

  private async gathering(id: number | bigint) {
    const g = await this.prisma.gatherings.findUnique({ where: { id: BigInt(id) } });
    if (!g) throw AppError.status(404, '모임을 찾을 수 없습니다.');
    return g;
  }

  private async participating(gatheringId: bigint, memberId: number) {
    const p = await this.prisma.gathering_participants.findFirst({ where: { gathering_id: gatheringId, member_id: BigInt(memberId) }, select: { status: true } });
    return p?.status === 'PARTICIPATING';
  }

  private async notifyParticipants(gatheringId: bigint, type: string, message: string) {
    const ps = await this.prisma.gathering_participants.findMany({ where: { gathering_id: gatheringId, status: 'PARTICIPATING' }, select: { member_id: true } });
    for (const p of ps) await this.notifications.notifySafe(p.member_id, gatheringId, type, message);
  }

  // ── 현장 모드 ──────────────────────────────────────────────────────
  @Post(':id/start')
  async start(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const g = await this.gathering(id);
    if (Number(g.created_by) !== user.id && !isAdmin(user)) throw AppError.status(403, '모임을 만든 사람이나 관리자만 출사를 시작할 수 있습니다.');
    if (g.status === 'ONGOING') throw AppError.status(400, '이미 진행 중인 출사입니다.');
    if (!['RECRUITING', 'RECRUITMENT_CLOSED', 'SCHEDULED'].includes(g.status)) throw AppError.status(400, `현재 상태(${g.status})에서는 출사를 시작할 수 없습니다.`);
    // 모집 중에 바로 시작하면 모집 마감처럼 장소 투표 결과를 반영한다
    const place = g.status === 'RECRUITING' ? await this.places.applyWinner(g) : null;
    await this.prisma.gatherings.update({ where: { id: g.id }, data: { status: 'ONGOING', ...(place ?? {}) } });
    this.log.log(`[GATHERING] 출사 시작: id=${g.id}, by=${user.id}`);
    await this.notifyParticipants(g.id, 'GATHERING_STARTED', `'${g.title}' 출사가 시작됐어요. 현장 사진을 올려 주세요.`);
    return { id: Number(g.id), status: 'ONGOING' };
  }

  @Post(':id/end')
  async end(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const g = await this.gathering(id);
    if (Number(g.created_by) !== user.id && !isAdmin(user)) throw AppError.status(403, '모임을 만든 사람이나 관리자만 출사를 종료할 수 있습니다.');
    if (g.status !== 'ONGOING') throw AppError.status(400, '진행 중인 출사만 종료할 수 있습니다.');
    await this.prisma.gatherings.update({ where: { id: g.id }, data: { status: 'ENDED' } });
    this.log.log(`[GATHERING] 출사 종료: id=${g.id}, by=${user.id}`);
    await this.notifyParticipants(g.id, 'GATHERING_ENDED', `'${g.title}' 출사가 끝났어요. 앨범에서 베스트 포토에 투표해 주세요.`);
    return { id: Number(g.id), status: 'ENDED' };
  }

  // ── 베스트 포토 ────────────────────────────────────────────────────
  private async photosOf(gatheringId: bigint) {
    const posts = await this.prisma.gathering_posts.findMany({ where: { gathering_id: gatheringId }, select: { id: true, member_id: true, member_name: true } });
    const byPost = new Map(posts.map((p) => [p.id, p]));
    const photos = posts.length ? await this.prisma.gathering_photos.findMany({ where: { gathering_post_id: { in: posts.map((p) => p.id) } }, orderBy: [{ created_at: 'asc' }, { id: 'asc' }] }) : [];
    return photos.map((ph) => ({ ph, post: byPost.get(ph.gathering_post_id)! }));
  }

  /**
   * 월간·연말 베스트 포토 — 그 기간에 시작한 끝난 출사들의 베스트 포토 표를 모아 순위. month가 없으면 연간.
   * 경로가 `:id/best`와 겹치지 않게 두 칸(`best/ranking`)으로 둔다.
   */
  @Public()
  @Get('best/ranking')
  async ranking(@Query('year') yearQ?: string, @Query('month') monthQ?: string, @Query('size') sizeQ?: string) {
    const year = yearQ ? Number(yearQ) : now().getUTCFullYear();
    const month = monthQ ? Number(monthQ) : null;
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw AppError.status(400, '연도가 올바르지 않습니다.');
    if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) throw AppError.status(400, '월은 1~12 사이여야 합니다.');
    const size = Math.min(Math.max(Number(sizeQ) || 12, 1), 50);
    const from = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
    const to = month ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1));
    const gs = await this.prisma.gatherings.findMany({
      where: { status: 'ENDED', start_date_time: { gte: from, lt: to } }, select: { id: true, title: true, start_date_time: true },
    });
    const empty = { year, month, items: [] as unknown[] };
    if (!gs.length) return empty;
    const votes = await this.prisma.gathering_best_votes.groupBy({ by: ['photo_id'], where: { gathering_id: { in: gs.map((g) => g.id) } }, _count: { _all: true } });
    const top = votes.map((v) => ({ photoId: v.photo_id, votes: v._count._all }))
      .sort((a, b) => b.votes - a.votes || Number(a.photoId - b.photoId)).slice(0, size);
    if (!top.length) return empty;
    const photos = await this.prisma.gathering_photos.findMany({ where: { id: { in: top.map((t) => t.photoId) } } });
    const posts = await this.prisma.gathering_posts.findMany({
      where: { id: { in: [...new Set(photos.map((p) => p.gathering_post_id))] } },
      select: { id: true, gathering_id: true, member_id: true, member_name: true, member_avatar_url: true },
    });
    const photoBy = new Map(photos.map((p) => [p.id, p]));
    const postBy = new Map(posts.map((p) => [p.id, p]));
    const gBy = new Map(gs.map((g) => [g.id, g]));
    let rank = 0;
    let prev = -1;
    const items = top.flatMap((t, i) => {
      const ph = photoBy.get(t.photoId);
      const post = ph && postBy.get(ph.gathering_post_id);
      const g = post && gBy.get(post.gathering_id);
      if (!ph || !post || !g) return [];
      if (t.votes !== prev) { rank = i + 1; prev = t.votes; }
      return [{
        rank, photoId: Number(ph.id), imageUrl: ph.image_url, caption: ph.caption, votes: t.votes,
        gatheringId: Number(g.id), gatheringTitle: g.title, gatheringStartDateTime: localDateTime(g.start_date_time),
        memberId: Number(post.member_id), memberName: post.member_name, memberAvatarUrl: post.member_avatar_url,
      }];
    });
    return { year, month, items };
  }

  @Public()
  @Get(':id/best')
  async best(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: AuthUser) {
    const g = await this.gathering(id);
    const [list, votes, mine] = await Promise.all([
      this.photosOf(g.id),
      this.prisma.gathering_best_votes.groupBy({ by: ['photo_id'], where: { gathering_id: g.id }, _count: { _all: true } }),
      user ? this.prisma.gathering_best_votes.findMany({ where: { gathering_id: g.id, member_id: BigInt(user.id) }, select: { photo_id: true } }) : Promise.resolve([]),
    ]);
    const count = new Map(votes.map((v) => [v.photo_id, v._count._all]));
    const photos = list.map(({ ph, post }) => ({
      photoId: Number(ph.id), imageUrl: ph.image_url, caption: ph.caption, postId: Number(post.id), memberId: Number(post.member_id),
      memberName: post.member_name, votes: count.get(ph.id) ?? 0, createdAt: localDateTime(ph.created_at),
    })).sort((a, b) => b.votes - a.votes || a.photoId - b.photoId);
    return {
      open: g.status === 'ENDED', maxVotes: MAX_BEST_VOTES, myVotes: mine.map((v) => Number(v.photo_id)),
      canVote: !!user && g.status === 'ENDED' && (await this.participating(g.id, user.id)), photos,
    };
  }

  private async checkVoter(gatheringId: number, photoId: number, user: AuthUser) {
    const g = await this.gathering(gatheringId);
    if (g.status !== 'ENDED') throw AppError.status(400, '출사가 끝난 뒤에 베스트 포토 투표를 할 수 있습니다.');
    if (!(await this.participating(g.id, user.id))) throw AppError.status(403, '출사 참여자만 투표할 수 있습니다.');
    const ph = await this.prisma.gathering_photos.findUnique({ where: { id: BigInt(photoId) }, select: { id: true, gathering_post_id: true } });
    const post = ph ? await this.prisma.gathering_posts.findUnique({ where: { id: ph.gathering_post_id }, select: { gathering_id: true } }) : null;
    if (!ph || post?.gathering_id !== g.id) throw AppError.status(404, '이 출사의 사진이 아닙니다.');
    return g;
  }

  @Post(':id/best/:photoId')
  async voteBest(@Param('id', ParseIntPipe) id: number, @Param('photoId', ParseIntPipe) photoId: number, @CurrentUser() user: AuthUser) {
    const g = await this.checkVoter(id, photoId, user);
    const m = BigInt(user.id);
    const existing = await this.prisma.gathering_best_votes.findFirst({ where: { photo_id: BigInt(photoId), member_id: m }, select: { id: true } });
    if (!existing) {
      const used = await this.prisma.gathering_best_votes.count({ where: { gathering_id: g.id, member_id: m } });
      if (used >= MAX_BEST_VOTES) throw AppError.status(400, `베스트 포토는 ${MAX_BEST_VOTES}장까지 고를 수 있어요. 다른 사진의 표를 먼저 빼 주세요.`);
      await this.prisma.gathering_best_votes.create({ data: { gathering_id: g.id, photo_id: BigInt(photoId), member_id: m, created_at: now() } });
    }
    return this.best(id, user);
  }

  @Delete(':id/best/:photoId')
  async unvoteBest(@Param('id', ParseIntPipe) id: number, @Param('photoId', ParseIntPipe) photoId: number, @CurrentUser() user: AuthUser) {
    await this.checkVoter(id, photoId, user);
    await this.prisma.gathering_best_votes.deleteMany({ where: { photo_id: BigInt(photoId), member_id: BigInt(user.id) } });
    return this.best(id, user);
  }

  // ── 스토리 ─────────────────────────────────────────────────────────
  private async storyBodies(rows: { id: bigint; gathering_id: bigint; member_id: bigint; image_url: string; caption: string | null; tagged_member_ids: string | null; created_at: Date }[]) {
    const tagIds = rows.flatMap((r) => (r.tagged_member_ids ?? '').split(',').filter(Boolean)).map(BigInt);
    const memberIds = [...new Set([...rows.map((r) => r.member_id), ...tagIds].map(String))].map(BigInt);
    const members = memberIds.length ? await this.prisma.members.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true, instagram_id: true, avatar_url: true } }) : [];
    const byId = new Map(members.map((m) => [m.id, m]));
    return rows.map((r) => ({
      id: Number(r.id), gatheringId: Number(r.gathering_id), memberId: Number(r.member_id), memberName: byId.get(r.member_id)?.name ?? null,
      memberAvatarUrl: byId.get(r.member_id)?.avatar_url ?? null, imageUrl: r.image_url, caption: r.caption,
      taggedMembers: (r.tagged_member_ids ?? '').split(',').filter(Boolean).map((t) => {
        const m = byId.get(BigInt(t));
        return { memberId: Number(t), name: m?.name ?? null, instagramId: m?.instagram_id ?? null };
      }),
      createdAt: localDateTime(r.created_at),
    }));
  }

  @Get('stories/mine')
  async myStories(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.gathering_stories.findMany({ where: { member_id: BigInt(user.id) }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 100 });
    return this.storyBodies(rows);
  }

  @Public()
  @Get(':id/stories')
  async stories(@Param('id', ParseIntPipe) id: number) {
    const g = await this.gathering(id);
    const rows = await this.prisma.gathering_stories.findMany({ where: { gathering_id: g.id }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] });
    return this.storyBodies(rows);
  }

  @Post(':id/stories')
  @HttpCode(201)
  async createStory(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const g = await this.gathering(id);
    if (g.status !== 'ONGOING' && g.status !== 'ENDED') throw AppError.status(400, '진행 중이거나 끝난 출사에만 스토리를 올릴 수 있습니다.');
    if (!(await this.participating(g.id, user.id))) throw AppError.status(403, '출사 참여자만 스토리를 올릴 수 있습니다.');
    const b = body ?? {};
    const imageUrl = jsonString(b.imageUrl, 'imageUrl')?.trim();
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl) || imageUrl.length > 500) throw AppError.status(400, '스토리 이미지 주소가 올바르지 않습니다.');
    const caption = strip(jsonString(b.caption, 'caption'))?.slice(0, 300) ?? null;
    if (b.taggedMemberIds != null && !Array.isArray(b.taggedMemberIds)) throw AppError.status(400, 'taggedMemberIds는 목록이어야 합니다.');
    const wanted = [...new Set(((b.taggedMemberIds as unknown[]) ?? []).map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0))].slice(0, 30);
    // 태그는 같은 출사 참여자만 남긴다
    const valid = wanted.length ? (await this.prisma.gathering_participants.findMany({
      where: { gathering_id: g.id, status: 'PARTICIPATING', member_id: { in: wanted.map(BigInt) } }, select: { member_id: true },
    })).map((p) => p.member_id.toString()) : [];
    const ordered = wanted.map(String).filter((w) => valid.includes(w));
    const row = await this.prisma.gathering_stories.create({ data: {
      gathering_id: g.id, member_id: BigInt(user.id), image_url: imageUrl, caption, tagged_member_ids: ordered.length ? ordered.join(',').slice(0, 500) : null, created_at: now(),
    } });
    this.log.log(`[GATHERING] 스토리 등록: gathering=${g.id}, member=${user.id}, tags=${ordered.length}`);
    for (const t of ordered) if (t !== String(user.id)) await this.notifications.notifySafe(BigInt(t), g.id, 'STORY_TAG', `'${g.title}' 스토리에 태그됐어요.`);
    return (await this.storyBodies([row]))[0];
  }

  @Delete('stories/:storyId')
  @HttpCode(204)
  async deleteStory(@Param('storyId', ParseIntPipe) storyId: number, @CurrentUser() user: AuthUser) {
    const s = await this.prisma.gathering_stories.findUnique({ where: { id: BigInt(storyId) } });
    if (!s) throw AppError.status(404, '스토리를 찾을 수 없습니다.');
    if (Number(s.member_id) !== user.id && !isAdmin(user)) throw AppError.status(403, '본인 스토리만 삭제할 수 있습니다.');
    await this.prisma.gathering_stories.delete({ where: { id: s.id } });
  }

  // ── 내 출사 기록 ───────────────────────────────────────────────────
  @Get('my/history')
  async history(@CurrentUser() user: AuthUser) {
    const parts = await this.prisma.gathering_participants.findMany({ where: { member_id: BigInt(user.id), status: 'PARTICIPATING' }, select: { gathering_id: true } });
    const gs = parts.length ? await this.prisma.gatherings.findMany({
      where: { id: { in: parts.map((p) => p.gathering_id) }, status: { in: ['ONGOING', 'ENDED'] } }, orderBy: [{ start_date_time: 'desc' }, { id: 'desc' }],
    }) : [];
    const [photoCounts, storyCount] = await Promise.all([
      gs.length ? this.prisma.gathering_posts.groupBy({ by: ['gathering_id'], where: { gathering_id: { in: gs.map((g) => g.id) }, member_id: BigInt(user.id) }, _count: { _all: true } }) : [],
      this.prisma.gathering_stories.count({ where: { member_id: BigInt(user.id) } }),
    ]);
    return {
      count: gs.length, storyCount,
      items: gs.map((g) => ({
        id: Number(g.id), title: g.title, location: g.location, status: g.status, startDateTime: localDateTime(g.start_date_time),
        thumbnailUrl: g.thumbnail_url, myPostCount: photoCounts.find((c) => c.gathering_id === g.id)?._count._all ?? 0,
      })),
    };
  }
}
