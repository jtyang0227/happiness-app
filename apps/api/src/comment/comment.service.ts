import { Injectable } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { localDateTime, now } from '../common/time.js';
import type { comments } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CommentResponse {
  id: number;
  photoId: number;
  memberId: number;
  memberName: string;
  memberAvatarUrl: string | null;
  content: string;
  parentId: number | null;
  createdAt: string | null;
  replies: CommentResponse[];
}

const toResponse = (c: comments): CommentResponse => ({
  id: Number(c.id),
  photoId: Number(c.photo_id),
  memberId: Number(c.member_id),
  memberName: c.member_name,
  memberAvatarUrl: c.member_avatar_url,
  content: c.content,
  parentId: c.parent_id == null ? null : Number(c.parent_id),
  createdAt: localDateTime(c.created_at),
  replies: [],
});

/** Spring CommentService 1:1 — 작성자는 로그인 회원, 요청의 memberId·memberName은 무시 */
@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async add(photoId: number, req: { content?: string; parentId?: number | null }, me: number): Promise<CommentResponse> {
    if (req.content == null || req.content.trim() === '') throw AppError.badInput('댓글 내용을 입력해주세요.');
    if (req.content.length > 500) throw AppError.badInput('댓글은 500자 이하로 작성해주세요.');
    if (req.parentId != null) {
      const parent = await this.prisma.comments.findUnique({ where: { id: BigInt(req.parentId) } });
      if (!parent || Number(parent.photo_id) !== photoId) throw AppError.badInput('답글을 달 댓글을 찾을 수 없습니다.');
    }
    const author = await this.prisma.members.findUnique({ where: { id: BigInt(me) } });
    if (!author) throw AppError.badInput('회원을 찾을 수 없습니다.');
    const c = await this.prisma.comments.create({
      data: {
        photo_id: BigInt(photoId),
        member_id: author.id,
        member_name: author.name,
        member_avatar_url: author.avatar_url,
        content: req.content.trim(),
        parent_id: req.parentId == null ? null : BigInt(req.parentId),
        created_at: now(),
      },
    });
    return toResponse(c);
  }

  /** 최상위 댓글(작성순) + 각자의 답글. 부모가 없는 답글은 빠진다 */
  async list(photoId: number): Promise<CommentResponse[]> {
    const all = await this.prisma.comments.findMany({ where: { photo_id: BigInt(photoId) }, orderBy: [{ created_at: 'asc' }, { id: 'asc' }] });
    const top = new Map<bigint, CommentResponse>();
    for (const c of all) if (c.parent_id == null) top.set(c.id, toResponse(c));
    for (const c of all) if (c.parent_id != null) top.get(c.parent_id)?.replies.push(toResponse(c));
    return [...top.values()];
  }

  async remove(id: number, me: number, admin: boolean): Promise<void> {
    const c = await this.prisma.comments.findUnique({ where: { id: BigInt(id) } });
    if (!c) throw AppError.badInput('댓글을 찾을 수 없습니다.');
    if (!admin && Number(c.member_id) !== me) throw AppError.badInput('본인의 댓글만 삭제할 수 있습니다.');
    await this.prisma.$transaction([
      this.prisma.comments.deleteMany({ where: { parent_id: c.id } }),
      this.prisma.comments.delete({ where: { id: c.id } }),
    ]);
  }
}
