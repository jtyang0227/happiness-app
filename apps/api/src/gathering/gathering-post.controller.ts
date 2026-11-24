import { Body, Controller, Delete, Get, HttpCode, Logger, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Public } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { isBlank, javaTrim, jsonBool, jsonInt, jsonLong, jsonString } from '../common/json-body.js';
import { pageRequest, springPage } from '../common/page.js';
import { localDateTime, now } from '../common/time.js';
import type { gathering_photos, gathering_post_comments, gathering_posts } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GatheringNotificationService } from './gathering-notification.service.js';

type Body_ = Record<string, unknown> | undefined;
const sanitize = (s: string | null) => (s == null ? null : javaTrim(s.replace(/<[^>]*>/g, '')));
const TEMPLATES = ['PHOTO_ONLY', 'PHOTO_PARTICIPANTS', 'PHOTO_TEXT'];

function intParam(v: string | undefined, def: number, name: string) {
  if (v == null) return def;
  const t = v.trim();
  if (!/^[+-]?\d+$/.test(t) || Math.abs(Number(t)) > 2147483647) throw new Error(`Failed to convert ${name}: ${v}`);
  return Number(t);
}

const commentBody = (c: gathering_post_comments) => ({
  id: Number(c.id), gatheringPostId: Number(c.gathering_post_id), memberId: Number(c.member_id), memberName: c.member_name,
  memberAvatarUrl: c.member_avatar_url, content: c.content, createdAt: localDateTime(c.created_at),
});

function postBody(p: gathering_posts, photos: gathering_photos[], likeCount: number, comments: gathering_post_comments[], likedByMe: boolean) {
  return {
    id: Number(p.id), gatheringId: Number(p.gathering_id), memberId: Number(p.member_id), memberName: p.member_name, memberAvatarUrl: p.member_avatar_url,
    content: p.content, hashtags: p.hashtags, wantsFeedback: p.wants_feedback === true,
    photos: photos.map((x) => ({ id: Number(x.id), imageUrl: x.image_url, caption: x.caption, sortOrder: x.sort_order })),
    likeCount, commentCount: comments.length, comments: comments.map(commentBody), likedByMe, createdAt: localDateTime(p.created_at),
  };
}

/** Spring GatheringPostController/Service — 피드·앨범 조회 공개, 작성·좋아요·댓글은 참여 확정 회원 */
@Controller('api/gatherings')
export class GatheringPostController {
  private readonly log = new Logger('GatheringPostService');
  constructor(private readonly prisma: PrismaService, private readonly notifications: GatheringNotificationService) {}

  private async gathering(id: number | bigint) {
    const g = await this.prisma.gatherings.findUnique({ where: { id: BigInt(id) } });
    if (!g) throw AppError.status(404, '모임을 찾을 수 없습니다.');
    return g;
  }

  private async requireParticipating(gatheringId: bigint, memberId: number, missing: string, notConfirmed: string) {
    const p = await this.prisma.gathering_participants.findFirst({ where: { gathering_id: gatheringId, member_id: BigInt(memberId) }, select: { status: true } });
    if (!p) throw AppError.status(403, missing);
    if (p.status !== 'PARTICIPATING') throw AppError.status(403, notConfirmed);
  }

  private async requireFeedAction(gatheringId: bigint, memberId: number) {
    const g = await this.gathering(gatheringId);
    if (g.status !== 'ONGOING' && g.status !== 'ENDED') throw AppError.status(400, '진행 중이거나 종료된 모임에서만 좋아요/댓글을 사용할 수 있습니다.');
    await this.requireParticipating(g.id, memberId, '모임 참여자만 이 기능을 사용할 수 있습니다.', '참여 확정된 회원만 이 기능을 사용할 수 있습니다.');
  }

  private async post(postId: number) {
    const p = await this.prisma.gathering_posts.findUnique({ where: { id: BigInt(postId) } });
    if (!p) throw AppError.status(404, '게시물을 찾을 수 없습니다.');
    return p;
  }

  @Public()
  @Get(':gatheringId/posts')
  async feed(@Param('gatheringId', ParseIntPipe) gatheringId: number, @Query('page') page: string | undefined, @Query('size') size: string | undefined,
    @CurrentUser() user?: AuthUser) {
    const pr = pageRequest(intParam(page, 0, 'page'), Math.min(intParam(size, 20, 'size'), 50));
    const g = await this.gathering(gatheringId);
    if (g.status !== 'ONGOING' && g.status !== 'ENDED') throw AppError.status(400, '진행 중이거나 종료된 모임의 피드만 조회할 수 있습니다.');
    const where = { gathering_id: g.id };
    const [posts, total] = await Promise.all([
      this.prisma.gathering_posts.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: pr.skip, take: pr.take }),
      this.prisma.gathering_posts.count({ where }),
    ]);
    const ids = posts.map((p) => p.id);
    const [photos, likes, comments] = ids.length ? await Promise.all([
      this.prisma.gathering_photos.findMany({ where: { gathering_post_id: { in: ids } }, orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] }),
      this.prisma.gathering_post_likes.findMany({ where: { gathering_post_id: { in: ids } }, select: { gathering_post_id: true, member_id: true } }),
      this.prisma.gathering_post_comments.findMany({ where: { gathering_post_id: { in: ids } }, orderBy: [{ created_at: 'asc' }, { id: 'asc' }] }),
    ]) : [[], [], []];
    const content = posts.map((p) => {
      const pl = likes.filter((l) => l.gathering_post_id === p.id);
      return postBody(p, photos.filter((x) => x.gathering_post_id === p.id), pl.length, comments.filter((c) => c.gathering_post_id === p.id),
        user != null && pl.some((l) => Number(l.member_id) === user.id));
    });
    return springPage(content, pr.page, pr.size, total);
  }

  @Public()
  @Get(':gatheringId/album')
  async album(@Param('gatheringId', ParseIntPipe) gatheringId: number) {
    const g = await this.gathering(gatheringId);
    if (g.status !== 'ENDED') throw AppError.status(400, '종료된 모임의 앨범만 조회할 수 있습니다.');
    const postIds = (await this.prisma.gathering_posts.findMany({ where: { gathering_id: g.id }, select: { id: true } })).map((p) => p.id);
    const [photos, participantCount] = await Promise.all([
      postIds.length ? this.prisma.gathering_photos.findMany({ where: { gathering_post_id: { in: postIds } }, orderBy: [{ created_at: 'asc' }, { id: 'asc' }] }) : [],
      this.prisma.gathering_participants.count({ where: { gathering_id: g.id, status: 'PARTICIPATING' } }),
    ]);
    return {
      gatheringId: Number(g.id), title: g.title, photoCount: photos.length, postCount: postIds.length, participantCount,
      photos: photos.map((p) => ({ imageUrl: p.image_url, caption: p.caption, postId: Number(p.gathering_post_id), createdAt: localDateTime(p.created_at) })),
    };
  }

  @Post(':gatheringId/posts')
  @HttpCode(201)
  async create(@Param('gatheringId', ParseIntPipe) gatheringId: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const content = jsonString(b.content, 'content');
    const hashtags = jsonString(b.hashtags, 'hashtags');
    const wantsFeedback = jsonBool(b.wantsFeedback, 'wantsFeedback');
    if (b.photos != null && !Array.isArray(b.photos)) throw new Error('Cannot deserialize photos');
    const items = ((b.photos ?? []) as unknown[]).map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return { imageUrl: jsonString(o.imageUrl, 'imageUrl'), caption: jsonString(o.caption, 'caption'), sortOrder: jsonInt(o.sortOrder, 'sortOrder') };
    });
    const g = await this.gathering(gatheringId);
    if (g.status !== 'ONGOING') throw AppError.status(400, '진행 중인 모임에만 게시물을 올릴 수 있습니다.');
    await this.requireParticipating(g.id, user.id, '모임 참여자만 게시물을 올릴 수 있습니다.', '참여 확정된 회원만 게시물을 올릴 수 있습니다.');
    const hasContent = content != null && !isBlank(content);
    if (!hasContent && !items.length) throw AppError.status(400, '내용 또는 사진 중 하나 이상을 입력해야 합니다.');
    const member = await this.prisma.members.findUnique({ where: { id: BigInt(user.id) }, select: { name: true, avatar_url: true } });
    if (!member) throw AppError.status(404, '사용자를 찾을 수 없습니다.');
    const { post, photos } = await this.prisma.$transaction(async (tx) => {
      const post = await tx.gathering_posts.create({ data: {
        gathering_id: g.id, member_id: BigInt(user.id), member_name: member.name, member_avatar_url: member.avatar_url,
        content: sanitize(content), hashtags: sanitize(hashtags), wants_feedback: wantsFeedback === true ? true : null, created_at: now(),
      } });
      const photos = [];
      for (const it of items) {
        if (it.imageUrl == null || isBlank(it.imageUrl)) continue;
        photos.push(await tx.gathering_photos.create({ data: {
          gathering_post_id: post.id, image_url: sanitize(it.imageUrl)!, caption: sanitize(it.caption), sort_order: it.sortOrder ?? 0, created_at: now(),
        } }));
      }
      return { post, photos };
    });
    this.log.log(`[GATHERING_POST] 게시물 작성: gatheringId=${gatheringId}, postId=${post.id}, memberId=${user.id}`);
    const others = await this.prisma.gathering_participants.findMany({ where: { gathering_id: g.id, status: 'PARTICIPATING' }, orderBy: { id: 'asc' } });
    for (const p of others) {
      if (Number(p.member_id) === user.id) continue;
      await this.notifications.notifySafe(p.member_id, g.id, 'NEW_POST', `'${g.title}'에 새 사진이 올라왔습니다.`, post.id);
    }
    return postBody(post, photos, 0, [], false);
  }

  @Delete('posts/:postId')
  @HttpCode(204)
  async remove(@Param('postId', ParseIntPipe) postId: number, @CurrentUser() user: AuthUser) {
    const p = await this.prisma.gathering_posts.findFirst({ where: { id: BigInt(postId), member_id: BigInt(user.id) } });
    if (!p) throw AppError.status(403, '게시물을 찾을 수 없거나 삭제 권한이 없습니다.');
    await this.prisma.$transaction([
      this.prisma.gathering_post_likes.deleteMany({ where: { gathering_post_id: p.id } }),
      this.prisma.gathering_post_comments.deleteMany({ where: { gathering_post_id: p.id } }),
      this.prisma.gathering_photos.deleteMany({ where: { gathering_post_id: p.id } }),
      this.prisma.gathering_posts.delete({ where: { id: p.id } }),
    ]);
    this.log.log(`[GATHERING_POST] 게시물 삭제: postId=${postId}, deletedBy=${user.id}`);
  }

  @Post('posts/:postId/like')
  @HttpCode(200)
  async like(@Param('postId', ParseIntPipe) postId: number, @CurrentUser() user: AuthUser) {
    const p = await this.post(postId);
    await this.requireFeedAction(p.gathering_id, user.id);
    if (await this.prisma.gathering_post_likes.count({ where: { gathering_post_id: p.id, member_id: BigInt(user.id) } })) throw AppError.status(409, '이미 좋아요를 눌렀습니다.');
    await this.prisma.gathering_post_likes.create({ data: { gathering_post_id: p.id, member_id: BigInt(user.id), created_at: now() } });
    if (Number(p.member_id) !== user.id) await this.notifications.notifySafe(p.member_id, p.gathering_id, 'NEW_LIKE', '회원님의 게시물에 좋아요를 받았습니다.', p.id);
  }

  @Delete('posts/:postId/like')
  @HttpCode(200)
  async unlike(@Param('postId', ParseIntPipe) postId: number, @CurrentUser() user: AuthUser) {
    const p = await this.post(postId);
    await this.requireFeedAction(p.gathering_id, user.id);
    const n = await this.prisma.gathering_post_likes.deleteMany({ where: { gathering_post_id: p.id, member_id: BigInt(user.id) } });
    if (n.count === 0) throw AppError.status(404, '좋아요 기록이 없습니다.');
  }

  @Post('posts/:postId/comments')
  @HttpCode(201)
  async comment(@Param('postId', ParseIntPipe) postId: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const content = jsonString(body?.content, 'content');
    if (content == null || isBlank(content)) throw AppError.status(400, '댓글 내용을 입력해주세요.');
    const p = await this.post(postId);
    await this.requireFeedAction(p.gathering_id, user.id);
    const member = await this.prisma.members.findUnique({ where: { id: BigInt(user.id) }, select: { name: true, avatar_url: true } });
    if (!member) throw AppError.status(404, '사용자를 찾을 수 없습니다.');
    const c = await this.prisma.gathering_post_comments.create({ data: {
      gathering_post_id: p.id, member_id: BigInt(user.id), member_name: member.name, member_avatar_url: member.avatar_url, content: sanitize(content)!, created_at: now(),
    } });
    if (Number(p.member_id) !== user.id) await this.notifications.notifySafe(p.member_id, p.gathering_id, 'NEW_COMMENT', '회원님의 게시물에 댓글이 달렸습니다.', p.id);
    return commentBody(c);
  }

  // ── Instagram (Spring GatheringInstagramController — 전부 인증, 참여 확정 회원만) ──

  @Get(':id/instagram-candidates')
  async candidates(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const g = await this.gathering(id);
    await this.requireParticipating(g.id, user.id, '모임 참여자만 이 기능을 사용할 수 있습니다.', '참여 확정된 회원만 이 기능을 사용할 수 있습니다.');
    const others = (await this.prisma.gathering_participants.findMany({ where: { gathering_id: g.id, status: 'PARTICIPATING' }, select: { member_id: true } }))
      .map((p) => p.member_id).filter((m) => Number(m) !== user.id);
    if (!others.length) return [];
    const members = await this.prisma.members.findMany({ where: { id: { in: others } }, orderBy: { id: 'asc' }, select: { id: true, name: true, avatar_url: true, instagram_id: true } });
    return members.filter((m) => m.instagram_id != null && !isBlank(m.instagram_id))
      .map((m) => ({ memberId: Number(m.id), name: m.name, avatarUrl: m.avatar_url, instagramId: m.instagram_id }));
  }

  @Post(':id/instagram-share')
  @HttpCode(200)
  async share(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const postId = jsonLong(b.gatheringPostId, 'gatheringPostId');
    const template = jsonString(b.template, 'template');
    const caption = jsonString(b.captionText, 'captionText');
    if (b.taggedMemberIds != null && !Array.isArray(b.taggedMemberIds)) throw new Error('Cannot deserialize taggedMemberIds');
    const tagged = ((b.taggedMemberIds ?? []) as unknown[]).map((x) => jsonLong(x, 'taggedMemberIds'));
    const g = await this.gathering(id);
    await this.requireParticipating(g.id, user.id, '모임 참여자만 이 기능을 사용할 수 있습니다.', '참여 확정된 회원만 이 기능을 사용할 수 있습니다.');
    if (template == null || !TEMPLATES.includes(template)) throw AppError.status(400, '유효하지 않은 템플릿입니다. PHOTO_ONLY, PHOTO_PARTICIPANTS, PHOTO_TEXT 중 하나를 사용하세요.');
    const s = await this.prisma.instagram_story_shares.create({ data: {
      gathering_id: g.id, member_id: BigInt(user.id), gathering_post_id: postId == null ? null : BigInt(postId), template,
      caption_text: sanitize(caption), tagged_member_ids: tagged.length ? tagged.map((x) => String(x)).join(',') : null, shared_at: now(),
    } });
    this.log.log(`[INSTAGRAM_SHARE] gatheringId=${id}, memberId=${user.id}, template=${template}, taggedCount=${tagged.length}`);
    return { id: Number(s.id), sharedAt: localDateTime(s.shared_at) };
  }
}
