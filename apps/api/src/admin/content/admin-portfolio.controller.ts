import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { Prisma } from '../../generated/admin-prisma/client.js';
import { isBlank } from '../../common/json-body.js';
import { localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import { IllegalArgument } from '../common/admin-errors.js';
import { intParam, longParam, optLongParam, optStrParam, pageRequest, pageResponse } from '../common/admin-params.js';
import { stringMap } from '../common/admin-request.js';
import { enumValueOf } from '../member/admin-member.service.js';
import { parseCategoryCode } from './category-code.js';

const STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] as const;
const VISIBILITIES = ['PRIVATE', 'PUBLIC', 'UNLISTED'] as const;

interface PortfolioRow {
  id: bigint; title: string; subtitle: string | null; cover_image_url: string | null; member_id: bigint; author_name: string; author_profile: string | null;
  category_code: string | null; tags: string | null; status: string; visibility: string; view_count: number | null; likes_count: number | null;
  is_pinned: boolean | null; admin_note: string | null; reviewed_at: Date | null; created_at: Date;
}

const SELECT = Prisma.sql`p.id, p.title, p.subtitle, p.cover_image_url, p.member_id, m.name AS author_name, m.profile_name AS author_profile, p.category_code, p.tags,
  p.status, p.visibility, p.view_count, p.likes_count, p.is_pinned, p.admin_note, p.reviewed_at, p.created_at`;

/** primitive int/boolean 필드에 DB null이 들어오면 Hibernate가 실패(500) */
function prim<T>(v: T | null, name: string): T {
  if (v === null) throw new Error(`Null value was assigned to a property of primitive type: ${name}`);
  return v;
}

function dto(p: PortfolioRow, photoCount: number, seriesCount: number) {
  return {
    id: Number(p.id), title: p.title, subtitle: p.subtitle, coverImageUrl: p.cover_image_url, memberId: Number(p.member_id),
    authorName: p.author_name, authorProfile: p.author_profile, categoryCode: p.category_code, l1Name: parseCategoryCode(p.category_code)[0],
    tags: p.tags, status: p.status, visibility: p.visibility, viewCount: prim(p.view_count, 'viewCount'), likesCount: prim(p.likes_count, 'likesCount'),
    pinned: prim(p.is_pinned, 'pinned'), adminNote: p.admin_note, photoCount, seriesCount,
    reviewedAt: localDateTime(p.reviewed_at), createdAt: localDateTime(p.created_at),
  };
}

/** Spring 어드민 AdminPortfolioController — /api/admin/portfolios (어드민 전용 표) */
@Controller('api/admin/portfolios')
export class AdminPortfolioController {
  constructor(private readonly prisma: AdminPrismaService) {}

  private async itemCounts(ids: bigint[]) {
    const m = new Map<bigint, [number, number]>();
    if (!ids.length) return m;
    const rows = await this.prisma.$queryRaw<{ k: bigint; t: string | null; c: bigint }[]>`SELECT portfolio_id AS k, item_type AS t, COUNT(*) AS c FROM portfolio_items
      WHERE portfolio_id = ANY(${ids}::bigint[]) GROUP BY portfolio_id, item_type`;
    for (const r of rows) {
      const cur = m.get(r.k) ?? [0, 0];
      if (r.t === 'PHOTO') cur[0] = Number(r.c);
      else if (r.t === 'SERIES') cur[1] = Number(r.c);
      m.set(r.k, cur);
    }
    return m;
  }

  private async find(id: number) {
    const r = await this.prisma.$queryRaw<PortfolioRow[]>`SELECT ${SELECT} FROM portfolios p JOIN members m ON m.id = p.member_id WHERE p.id = ${id}`;
    if (!r.length) throw new IllegalArgument('포트폴리오를 찾을 수 없습니다.');
    return r[0];
  }

  private async full(id: number) {
    const p = await this.find(id);
    const c = (await this.itemCounts([p.id])).get(p.id) ?? [0, 0];
    return dto(p, c[0], c[1]);
  }

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const status = optStrParam(q.status);
    const visibility = optStrParam(q.visibility);
    const memberId = optLongParam(q.memberId);
    const search = optStrParam(q.search);
    const sortBy = optStrParam(q.sortBy);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const st = status !== null && !isBlank(status) ? enumValueOf('PortfolioStatus', STATUSES, status) : null;
    const vis = visibility !== null && !isBlank(visibility) ? enumValueOf('PortfolioVisibility', VISIBILITIES, visibility) : null;
    const s = search !== null && !isBlank(search) ? search.trim() : null;
    const p = pageRequest(page, size);
    const order = sortBy === null ? 'p.created_at DESC' : ({ likes: 'p.likes_count DESC', views: 'p.view_count DESC', oldest: 'p.created_at ASC' }[sortBy] ?? 'p.created_at DESC');
    const where = Prisma.sql`(${st}::text IS NULL OR p.status = ${st}::text) AND (${vis}::text IS NULL OR p.visibility = ${vis}::text)
      AND (${memberId}::bigint IS NULL OR m.id = ${memberId}::bigint)
      AND (${s}::text IS NULL OR LOWER(p.title) LIKE '%' || LOWER(${s}::text) || '%' OR LOWER(m.name) LIKE '%' || LOWER(${s}::text) || '%')`;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<PortfolioRow[]>`SELECT ${SELECT} FROM portfolios p JOIN members m ON m.id = p.member_id WHERE ${where} ORDER BY ${Prisma.raw(order)} LIMIT ${p.take} OFFSET ${p.skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM portfolios p JOIN members m ON m.id = p.member_id WHERE ${where}`,
    ]);
    const counts = await this.itemCounts(rows.map((r) => r.id));
    return pageResponse(rows.map((r) => { const c = counts.get(r.id) ?? [0, 0]; return dto(r, c[0], c[1]); }), page, size, Number(total[0].c));
  }

  @Get('stats')
  async stats() {
    const out: Record<string, number> = {};
    for (const st of STATUSES) out[st] = await this.prisma.portfolios.count({ where: { status: st } });
    return out;
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.full(longParam(id));
  }

  private async review(id: number, status: string, note: string | null) {
    await this.find(id);
    const now = new Date();
    await this.prisma.portfolios.update({ where: { id: BigInt(id) }, data: { status, admin_note: note, reviewed_at: now, updated_at: now } });
    return this.full(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() body: unknown) {
    const pid = longParam(id);
    return this.review(pid, 'APPROVED', stringMap(body, false).adminNote ?? null);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() body: unknown) {
    const pid = longParam(id);
    const b = stringMap(body);
    // Map.getOrDefault — 키가 있으면 null 값도 그대로
    return this.review(pid, 'REJECTED', 'adminNote' in b ? b.adminNote : '');
  }

  @Patch(':id/hide')
  async hide(@Param('id') id: string) {
    const pid = longParam(id);
    const p = await this.find(pid);
    if (p.visibility !== 'PRIVATE') await this.prisma.portfolios.update({ where: { id: p.id }, data: { visibility: 'PRIVATE', updated_at: new Date() } });
    return this.full(pid);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const pid = longParam(id);
    await this.find(pid);
    // Portfolio.items cascade=ALL, orphanRemoval
    await this.prisma.$transaction([
      this.prisma.portfolio_items.deleteMany({ where: { portfolio_id: BigInt(pid) } }),
      this.prisma.portfolios.delete({ where: { id: BigInt(pid) } }),
    ]);
    return { message: '포트폴리오가 삭제되었습니다.' };
  }
}
