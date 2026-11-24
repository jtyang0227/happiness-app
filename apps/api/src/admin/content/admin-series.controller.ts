import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import { Prisma } from '../../generated/admin-prisma/client.js';
import { isBlank } from '../../common/json-body.js';
import { localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-auth.middleware.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { AdminActivityRecorder } from '../common/activity-recorder.js';
import { IllegalArgument } from '../common/admin-errors.js';
import { intParam, longParam, optBoolParam, optLongParam, optStrParam, pageRequest, pageResponse } from '../common/admin-params.js';
import { objectBody } from '../common/admin-request.js';

interface SeriesRow {
  id: bigint; title: string; cover_image_url: string | null; member_id: bigint; author_name: string; likes_count: number; view_count: number;
  shoot_type: string | null; draft: boolean | null; featured_at: Date | null; created_at: Date;
}

const SERIES_SELECT = Prisma.sql`s.id, s.title, s.cover_image_url, s.member_id, m.name AS author_name, s.likes_count, s.view_count, s.shoot_type, s.draft, s.featured_at, s.created_at`;

function seriesDto(s: SeriesRow, photoCount: number) {
  return {
    id: Number(s.id), title: s.title, coverImageUrl: s.cover_image_url, memberId: Number(s.member_id), authorName: s.author_name,
    photoCount, likesCount: s.likes_count, viewCount: s.view_count, shootType: s.shoot_type, draft: s.draft === true,
    featured: s.featured_at !== null, featuredAt: localDateTime(s.featured_at), createdAt: localDateTime(s.created_at),
  };
}

/** Spring 어드민 AdminSeriesController — /api/admin/series (어드민 스키마의 series — 앱 /api/admin/series/{id}/featured와 별도 서버) */
@Controller('api/admin/series')
export class AdminSeriesController {
  constructor(
    private readonly prisma: AdminPrismaService,
    private readonly activity: AdminActivityRecorder,
  ) {}

  private async photoCounts(ids: bigint[]) {
    if (!ids.length) return new Map<bigint, number>();
    const rows = await this.prisma.$queryRaw<{ k: bigint; c: bigint }[]>`SELECT series_id AS k, COUNT(*) AS c FROM series_photos WHERE series_id = ANY(${ids}::bigint[]) GROUP BY series_id`;
    return new Map(rows.map((r) => [r.k, Number(r.c)]));
  }

  private async page(where: Prisma.Sql, order: string, page: number, size: number) {
    const p = pageRequest(page, size);
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<SeriesRow[]>`SELECT ${SERIES_SELECT} FROM series s JOIN members m ON m.id = s.member_id WHERE ${where} ORDER BY ${Prisma.raw(order)} LIMIT ${p.take} OFFSET ${p.skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM series s JOIN members m ON m.id = s.member_id WHERE ${where}`,
    ]);
    const counts = await this.photoCounts(rows.map((r) => r.id));
    return pageResponse(rows.map((r) => seriesDto(r, counts.get(r.id) ?? 0)), page, size, Number(total[0].c));
  }

  private searchSql(search: string | null) {
    return Prisma.sql`(${search}::text IS NULL OR LOWER(s.title) LIKE '%' || LOWER(${search}::text) || '%' OR LOWER(m.name) LIKE '%' || LOWER(${search}::text) || '%')`;
  }

  private async find(id: number, message: string) {
    const r = await this.prisma.$queryRaw<SeriesRow[]>`SELECT ${SERIES_SELECT} FROM series s JOIN members m ON m.id = s.member_id WHERE s.id = ${id}`;
    if (!r.length) throw new IllegalArgument(message);
    return r[0];
  }

  @Get()
  list(@Query() q: Record<string, unknown>) {
    const memberId = optLongParam(q.memberId);
    const search = optStrParam(q.search);
    const sortBy = optStrParam(q.sortBy);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const term = search !== null && !isBlank(search) ? search.trim() : null;
    const where = Prisma.sql`(${memberId}::bigint IS NULL OR m.id = ${memberId}::bigint) AND ${this.searchSql(term)}`;
    return this.page(where, sortBy === 'likes' ? 's.likes_count DESC' : 's.created_at DESC', page, size);
  }

  @Get('curation')
  curation(@Query() q: Record<string, unknown>) {
    const featured = optBoolParam(q.featured);
    const search = optStrParam(q.search);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 24);
    const term = search !== null && !isBlank(search) ? search.trim() : null;
    const where = Prisma.sql`(s.draft IS NULL OR s.draft = false) AND EXISTS (SELECT 1 FROM series_photos sp WHERE sp.series_id = s.id)
      AND (${featured}::boolean IS NULL OR (${featured}::boolean = true AND s.featured_at IS NOT NULL) OR (${featured}::boolean = false AND s.featured_at IS NULL))
      AND ${this.searchSql(term)}`;
    return this.page(where, featured === true ? 's.featured_at DESC, s.id DESC' : 's.created_at DESC, s.id DESC', page, size);
  }

  @Put(':id/featured')
  async setFeatured(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string, @Body() body: unknown) {
    const seriesId = longParam(id);
    const b = objectBody(body);
    if (typeof b.featured !== 'boolean') throw new IllegalArgument('featured(true/false)가 필요합니다.');
    const featured = b.featured;
    const s = await this.find(seriesId, '작업을 찾을 수 없습니다.');
    const photoCount = await this.prisma.series_photos.count({ where: { series_id: BigInt(seriesId) } });
    if (featured && s.draft === true) throw new IllegalArgument('초안 작업은 추천할 수 없어요.');
    if (featured && photoCount === 0) throw new IllegalArgument('사진이 없는 작업은 추천할 수 없어요.');
    // updatedAt을 건드리지 않는 bulk UPDATE — 앱 탐색 "최신순"이 추천 때문에 흔들리지 않게
    await this.prisma.series.updateMany({ where: { id: BigInt(seriesId) }, data: { featured_at: featured ? new Date() : null } });
    await this.activity.record(admin, featured ? 'CURATION_FEATURE' : 'CURATION_UNFEATURE', 'SERIES', seriesId, s.title);
    return seriesDto(await this.find(seriesId, '작업을 찾을 수 없습니다.'), photoCount);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const seriesId = longParam(id);
    const s = await this.find(seriesId, '시리즈를 찾을 수 없습니다.');
    return seriesDto(s, await this.prisma.series_photos.count({ where: { series_id: s.id } }));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const seriesId = longParam(id);
    await this.find(seriesId, '시리즈를 찾을 수 없습니다.');
    // Series.seriesPhotos cascade=ALL
    await this.prisma.$transaction([
      this.prisma.series_photos.deleteMany({ where: { series_id: BigInt(seriesId) } }),
      this.prisma.series.delete({ where: { id: BigInt(seriesId) } }),
    ]);
    return { message: '시리즈가 삭제되었습니다.' };
  }
}
