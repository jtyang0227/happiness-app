import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { Prisma } from '../../generated/admin-prisma/client.js';
import { isBlank } from '../../common/json-body.js';
import { localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-auth.middleware.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { AdminActivityRecorder } from '../common/activity-recorder.js';
import { IllegalArgument } from '../common/admin-errors.js';
import { intParam, longParam, optLongParam, optStrParam, pageRequest, pageResponse } from '../common/admin-params.js';

type CommentRow = Prisma.commentsGetPayload<object>;

/** Spring 어드민 AdminCommentController — 사진 댓글 모더레이션 */
@Controller('api/admin/comments')
export class AdminCommentController {
  constructor(
    private readonly prisma: AdminPrismaService,
    private readonly activity: AdminActivityRecorder,
  ) {}

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const photoId = optLongParam(q.photoId);
    const memberId = optLongParam(q.memberId);
    const search = optStrParam(q.search);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const term = search !== null && !isBlank(search) ? search.trim() : null;
    const p = pageRequest(page, size);
    const where = Prisma.sql`(${photoId}::bigint IS NULL OR photo_id = ${photoId}::bigint) AND (${memberId}::bigint IS NULL OR member_id = ${memberId}::bigint)
      AND (${term}::text IS NULL OR LOWER(content) LIKE '%' || LOWER(${term}::text) || '%' OR LOWER(member_name) LIKE '%' || LOWER(${term}::text) || '%')`;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<CommentRow[]>`SELECT * FROM comments WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ${p.take} OFFSET ${p.skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM comments WHERE ${where}`,
    ]);
    const photoIds = [...new Set(rows.map((c) => c.photo_id))];
    const photos = new Map((photoIds.length ? await this.prisma.photos.findMany({ where: { id: { in: photoIds } }, select: { id: true, title: true, thumbnail_url: true } }) : []).map((x) => [x.id, x]));
    const top = rows.filter((c) => c.parent_id === null).map((c) => c.id);
    const replies = new Map<bigint, number>();
    if (top.length) {
      for (const r of await this.prisma.$queryRaw<{ k: bigint; c: bigint }[]>`SELECT parent_id AS k, COUNT(*) AS c FROM comments WHERE parent_id = ANY(${top}::bigint[]) GROUP BY parent_id`) {
        replies.set(r.k, Number(r.c));
      }
    }
    const content = rows.map((c) => {
      const ph = photos.get(c.photo_id);
      return {
        id: Number(c.id), photoId: Number(c.photo_id), photoTitle: ph?.title ?? null, photoThumbnailUrl: ph?.thumbnail_url ?? null,
        memberId: Number(c.member_id), memberName: c.member_name, content: c.content, parentId: c.parent_id === null ? null : Number(c.parent_id),
        replyCount: replies.get(c.id) ?? 0, createdAt: localDateTime(c.created_at),
      };
    });
    return pageResponse(content, page, size, Number(total[0].c));
  }

  @Get('counts')
  async counts() {
    const n = new Date();
    const today = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
    return { total: await this.prisma.comments.count(), today: await this.prisma.comments.count({ where: { created_at: { gte: today } } }) };
  }

  /** 최상위 댓글을 지우면 답글도 함께 — 앱 CommentService.deleteComment와 같은 규칙 */
  @Delete(':id')
  async delete(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string) {
    const cid = longParam(id);
    const c = await this.prisma.comments.findUnique({ where: { id: BigInt(cid) } });
    if (!c) throw new IllegalArgument('댓글을 찾을 수 없습니다.');
    let replyCount = 0;
    await this.prisma.$transaction(async (tx) => {
      if (c.parent_id === null) replyCount = (await tx.comments.deleteMany({ where: { parent_id: c.id } })).count;
      await tx.comments.delete({ where: { id: c.id } });
      const preview = c.content.length > 60 ? c.content.slice(0, 60) + '…' : c.content;
      await this.activity.record(admin, 'COMMENT_DELETE', 'COMMENT', cid, `${c.member_name}: ${preview}${replyCount ? ` (답글 ${replyCount}개 포함)` : ''}`, tx);
    });
    return { message: '댓글이 삭제되었습니다.', deleted: replyCount + 1 };
  }
}
