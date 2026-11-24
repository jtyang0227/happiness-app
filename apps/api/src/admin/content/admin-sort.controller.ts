import { Body, Controller, Get, HttpCode, Param, Put, Query } from '@nestjs/common';
import { jsonLong, jsonPrimitiveInt } from '../../common/json-body.js';
import { localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import { invalidRequest } from '../common/admin-errors.js';
import { longParam, optLongParam } from '../common/admin-params.js';
import { jsonField } from '../common/admin-request.js';

/** @RequestBody List<ReorderItem> — {id: Long, displayOrder: int} */
function reorderItems(body: unknown): Array<{ id: number | null; displayOrder: number }> {
  if (!Array.isArray(body)) throw invalidRequest();
  return body.map((x) => {
    if (x === null) throw new Error('ReorderItem null');
    if (typeof x !== 'object' || Array.isArray(x)) throw invalidRequest();
    const o = x as Record<string, unknown>;
    return { id: jsonField(() => jsonLong(o.id, 'id')), displayOrder: jsonField(() => jsonPrimitiveInt(o.displayOrder, 'displayOrder')) };
  });
}

/** 같은 id가 여러 번 오면 마지막 값 — save를 차례로 부르므로 */
function lastWins(items: Array<{ id: number | null; displayOrder: number }>) {
  const m = new Map<number, number>();
  for (const i of items) if (i.id !== null) m.set(i.id, i.displayOrder);
  return m;
}

/** Spring 어드민 AdminSortController — 표시 순서(0은 "지정 안 함"이라 맨 뒤) */
@Controller('api/admin/sort')
export class AdminSortController {
  constructor(private readonly prisma: AdminPrismaService) {}

  @Get('photos')
  async photos(@Query() q: Record<string, unknown>) {
    const memberId = optLongParam(q.memberId);
    const rows = await this.prisma.$queryRaw<Array<{ id: bigint; title: string; thumbnail_url: string | null; display_order: number; member_name: string; created_at: Date }>>`
      SELECT p.id, p.title, p.thumbnail_url, p.display_order, m.name AS member_name, p.created_at FROM photos p JOIN members m ON m.id = p.member_id
      WHERE (${memberId}::bigint IS NULL OR p.member_id = ${memberId}::bigint)
      ORDER BY CASE WHEN p.display_order = 0 THEN 1 ELSE 0 END ASC, p.display_order ASC, p.created_at DESC, p.id DESC`;
    return rows.map((p) => ({ id: Number(p.id), title: p.title, thumbnailUrl: p.thumbnail_url, displayOrder: p.display_order, memberName: p.member_name, createdAt: localDateTime(p.created_at) }));
  }

  @Put('photos')
  @HttpCode(200)
  async reorderPhotos(@Body() body: unknown) {
    const items = lastWins(reorderItems(body));
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const found = await tx.photos.findMany({ where: { id: { in: [...items.keys()].map(BigInt) } }, select: { id: true, display_order: true } });
      for (const p of found) {
        const order = items.get(Number(p.id))!;
        if (p.display_order !== order) await tx.photos.update({ where: { id: p.id }, data: { display_order: order, updated_at: now } });
      }
    });
  }

  @Get('series')
  async series() {
    const rows = await this.prisma.$queryRaw<Array<{ id: bigint; title: string; cover_image_url: string | null; display_order: number; member_name: string; c: bigint }>>`
      SELECT s.id, s.title, s.cover_image_url, s.display_order, m.name AS member_name, (SELECT COUNT(*) FROM series_photos sp WHERE sp.series_id = s.id) AS c
      FROM series s JOIN members m ON m.id = s.member_id
      ORDER BY CASE WHEN s.display_order = 0 THEN 1 ELSE 0 END ASC, s.display_order ASC, s.created_at DESC, s.id DESC`;
    return rows.map((s) => ({ id: Number(s.id), title: s.title, coverImageUrl: s.cover_image_url, displayOrder: s.display_order, memberName: s.member_name, photoCount: Number(s.c) }));
  }

  @Put('series')
  @HttpCode(200)
  async reorderSeries(@Body() body: unknown) {
    const items = lastWins(reorderItems(body));
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const found = await tx.series.findMany({ where: { id: { in: [...items.keys()].map(BigInt) } }, select: { id: true, display_order: true } });
      for (const s of found) {
        const order = items.get(Number(s.id))!;
        if (s.display_order !== order) await tx.series.update({ where: { id: s.id }, data: { display_order: order, updated_at: now } });
      }
    });
  }

  @Get('series/:id/photos')
  async seriesPhotos(@Param('id') id: string) {
    const sid = longParam(id);
    const rows = await this.prisma.series_photos.findMany({ where: { series_id: BigInt(sid) }, orderBy: [{ display_order: 'asc' }, { id: 'asc' }], include: { photos: true } });
    return rows.map((sp) => ({ id: Number(sp.id), photoId: sp.photos ? Number(sp.photos.id) : null, title: sp.photos?.title ?? null, thumbnailUrl: sp.photos?.thumbnail_url ?? null, displayOrder: sp.display_order }));
  }

  @Put('series/:id/photos')
  @HttpCode(200)
  async reorderSeriesPhotos(@Param('id') id: string, @Body() body: unknown) {
    const sid = longParam(id);
    const items = lastWins(reorderItems(body));
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.series_photos.findMany({ where: { series_id: BigInt(sid) }, select: { id: true, display_order: true } });
      for (const r of rows) {
        const order = items.get(Number(r.id));
        if (order !== undefined && order !== r.display_order) await tx.series_photos.update({ where: { id: r.id }, data: { display_order: order } });
      }
    });
  }

  @Get('portfolios/:id/items')
  async portfolioItems(@Param('id') id: string) {
    const pid = longParam(id);
    const rows = await this.prisma.portfolio_items.findMany({ where: { portfolio_id: BigInt(pid) }, orderBy: [{ display_order: 'asc' }, { id: 'asc' }], include: { photos: true, series: true } });
    return rows.map((pi) => {
      let title: string | null = null;
      let thumbnailUrl: string | null = null;
      if (pi.item_type === 'PHOTO' && pi.photos) { title = pi.photos.title; thumbnailUrl = pi.photos.thumbnail_url; }
      else if (pi.item_type === 'SERIES' && pi.series) { title = pi.series.title; thumbnailUrl = pi.series.cover_image_url; }
      return { id: Number(pi.id), itemType: pi.item_type, title, thumbnailUrl, displayOrder: pi.display_order, featured: pi.is_featured };
    });
  }

  @Put('portfolios/:id/items')
  @HttpCode(200)
  async reorderPortfolioItems(@Param('id') id: string, @Body() body: unknown) {
    const pid = longParam(id);
    const items = lastWins(reorderItems(body));
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.portfolio_items.findMany({ where: { portfolio_id: BigInt(pid) }, select: { id: true, display_order: true } });
      for (const r of rows) {
        const order = items.get(Number(r.id));
        if (order !== undefined && order !== r.display_order) await tx.portfolio_items.update({ where: { id: r.id }, data: { display_order: order } });
      }
    });
  }
}
