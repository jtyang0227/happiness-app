import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { pageRequest, springPage } from '../common/page.js';
import { localDateTime, now } from '../common/time.js';
import type { reports } from '../generated/prisma/client.js';
import { FixedWindowLimiter } from '../recovery/fixed-window-limiter.js';
import { PrismaService } from '../prisma/prisma.service.js';

const VALID_REASONS = new Set(['COPYRIGHT', 'INAPPROPRIATE', 'PRIVACY', 'SPAM', 'OTHER']);

export interface ReportRequest { reason?: string; detail?: string | null; evidenceUrl?: string | null }

const toResponse = (r: reports) => ({
  id: Number(r.id),
  photoId: Number(r.photo_id),
  reason: r.reason,
  detail: r.detail,
  evidenceUrl: r.evidence_url,
  status: r.status,
  resolutionNote: r.resolution_note,
  reporterSeen: r.reporter_seen,
  createdAt: localDateTime(r.created_at),
  resolvedAt: localDateTime(r.resolved_at),
});

/** Spring ReportService 1:1 — 신고 rate limit은 회원당 10분 5건(사진·댓글 공유, 인메모리) */
@Injectable()
export class ReportService {
  private readonly log = new Logger('ReportService');
  private readonly limiter = new FixedWindowLimiter();

  constructor(private readonly prisma: PrismaService) {}

  async createPhotoReport(photoId: number, reporterId: number, req: ReportRequest) {
    const reason = validReason(req);
    if (!(await this.prisma.photos.findUnique({ where: { id: BigInt(photoId) }, select: { id: true } }))) {
      throw AppError.status(404, '사진을 찾을 수 없습니다.');
    }
    this.checkRate(reporterId);
    const saved = await this.prisma.reports.create({
      data: { photo_id: BigInt(photoId), reporter_id: BigInt(reporterId), reason, detail: req.detail ?? null, evidence_url: req.evidenceUrl ?? null, status: 'PENDING', reporter_seen: false, created_at: now() },
    });
    this.log.log(`[ADMIN] 신고 접수 — reportId=${saved.id} photoId=${photoId} reporterId=${reporterId} reason=${reason}`);
    return toResponse(saved);
  }

  async createCommentReport(commentId: number, reporterId: number, req: ReportRequest) {
    const reason = validReason(req);
    const c = await this.prisma.comments.findUnique({ where: { id: BigInt(commentId) } });
    if (!c) throw AppError.status(404, '댓글을 찾을 수 없습니다.');
    if (Number(c.member_id) === reporterId) throw AppError.status(400, '본인 댓글은 신고할 수 없습니다.');
    this.checkRate(reporterId);
    // 댓글 신고는 evidenceUrl을 저장하지 않는다(Spring과 같음)
    const saved = await this.prisma.reports.create({
      data: { photo_id: c.photo_id, comment_id: c.id, reporter_id: BigInt(reporterId), reason, detail: req.detail ?? null, status: 'PENDING', reporter_seen: false, created_at: now() },
    });
    this.log.log(`[ADMIN] 댓글 신고 접수 — reportId=${saved.id} commentId=${commentId} reporterId=${reporterId} reason=${reason}`);
    return toResponse(saved);
  }

  async mine(reporterId: number) {
    const rows = await this.prisma.reports.findMany({ where: { reporter_id: BigInt(reporterId) }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] });
    return rows.map(toResponse);
  }

  async unreadCount(reporterId: number) {
    return this.prisma.reports.count({ where: { reporter_id: BigInt(reporterId), status: { not: 'PENDING' }, reporter_seen: false } });
  }

  async markSeen(id: number, reporterId: number) {
    const r = await this.prisma.reports.findFirst({ where: { id: BigInt(id), reporter_id: BigInt(reporterId) } });
    if (!r) throw AppError.status(404, '신고를 찾을 수 없습니다.');
    await this.prisma.reports.update({ where: { id: r.id }, data: { reporter_seen: true } });
  }

  async adminList(status: string | undefined, page: number, size: number) {
    const p = pageRequest(page, size);
    const where = status == null || status.trim() === '' || status.toUpperCase() === 'ALL' ? {} : { status: status.toUpperCase() };
    const [rows, total] = await Promise.all([
      this.prisma.reports.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: p.skip, take: p.take }),
      this.prisma.reports.count({ where }),
    ]);
    return springPage(await this.toAdmin(rows), page, size, total);
  }

  async adminUpdate(id: number, req: { status?: string; resolutionNote?: string | null }, adminEmail: string) {
    const r = await this.prisma.reports.findUnique({ where: { id: BigInt(id) } });
    if (!r) throw AppError.status(404, '신고를 찾을 수 없습니다.');
    if (req.status !== 'RESOLVED' && req.status !== 'DISMISSED') throw AppError.status(400, 'status 는 RESOLVED 또는 DISMISSED 여야 합니다.');
    const saved = await this.prisma.reports.update({ where: { id: r.id }, data: { status: req.status, resolution_note: req.resolutionNote ?? null, resolved_at: now() } });
    this.log.log(`[ADMIN] 신고 처리 — reportId=${id} status=${req.status} by ${adminEmail}`);
    return (await this.toAdmin([saved]))[0];
  }

  private async toAdmin(rows: reports[]) {
    const [photos, members, comments] = await Promise.all([
      this.prisma.photos.findMany({ where: { id: { in: rows.map((r) => r.photo_id) } }, select: { id: true, title: true, thumbnail_url: true } }),
      this.prisma.members.findMany({ where: { id: { in: rows.map((r) => r.reporter_id) } }, select: { id: true, name: true, email: true } }),
      this.prisma.comments.findMany({ where: { id: { in: rows.flatMap((r) => (r.comment_id == null ? [] : [r.comment_id])) } } }),
    ]);
    const photo = new Map(photos.map((x) => [x.id, x]));
    const member = new Map(members.map((x) => [x.id, x]));
    const comment = new Map(comments.map((x) => [x.id, x]));
    return rows.map((r) => {
      const p = photo.get(r.photo_id);
      const m = member.get(r.reporter_id);
      const c = r.comment_id == null ? undefined : comment.get(r.comment_id);
      return {
        id: Number(r.id),
        photo: { id: p ? Number(p.id) : Number(r.photo_id), title: p ? p.title : '(사진 없음)', thumbnailUrl: p ? p.thumbnail_url : null },
        reason: r.reason,
        detail: r.detail,
        evidenceUrl: r.evidence_url,
        reporterName: m ? m.name : '(알 수 없음)',
        reporterEmail: m ? m.email : '',
        reportedAt: localDateTime(r.created_at),
        status: r.status,
        resolutionNote: r.resolution_note,
        commentId: r.comment_id == null ? null : Number(r.comment_id),
        commentContent: c ? c.content : null,
        commentAuthorName: c ? c.member_name : null,
      };
    });
  }

  private checkRate(memberId: number) {
    if (!this.limiter.allow(`report:${memberId}`, 5, 600)) throw AppError.status(429, '너무 많은 신고를 제출했습니다. 10분 후에 다시 시도해주세요.');
  }
}

function validReason(req: ReportRequest): string {
  if (req.reason == null || !VALID_REASONS.has(req.reason.toUpperCase())) {
    throw AppError.status(400, 'reason 은 COPYRIGHT / INAPPROPRIATE / PRIVACY / SPAM / OTHER 중 하나여야 합니다.');
  }
  const reason = req.reason.toUpperCase();
  if (reason === 'OTHER' && (req.detail == null || req.detail.trim() === '')) {
    throw AppError.status(400, 'reason 이 OTHER 일 때는 detail 을 반드시 입력해야 합니다.');
  }
  return reason;
}
