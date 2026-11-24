import { Body, Controller, Get, HttpCode, Logger, Post, Query } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { AuthUser, CurrentUser, Public, isAdmin } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { isBlank, jsonLong, jsonString } from '../common/json-body.js';
import { requiredLong } from '../common/params.js';
import { now } from '../common/time.js';
import type { photos } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const TRACK_LIMIT = 60;

/** `@RequestParam(defaultValue=…) int` — 숫자가 아니면 500 */
function intParam(v: string | undefined, def: number, name: string) {
  if (v == null) return def;
  const t = v.trim();
  if (!/^[+-]?\d+$/.test(t) || Math.abs(Number(t)) > 2147483647) throw new Error(`Failed to convert ${name}: ${v}`);
  return Number(t);
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);

/** Spring calcChange — 소수 둘째 자리 반올림, 이전 0이면 100/0 */
function calcChange(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100.0 : 0.0;
  return Math.round(((cur - prev) / prev) * 10000.0) / 100.0;
}

const topPhoto = (p: photos, metric: string, count: number) => ({
  photoId: Number(p.id), title: p.title, thumbnailUrl: p.thumbnail_url ?? p.image_url, count, metric,
  likesCount: p.likes_count, savesCount: p.saves_count, sharesCount: p.shares_count,
});

/** Spring AnalyticsController/Service — track만 공개, 나머지는 본인·관리자 */
@Controller('api/analytics')
export class AnalyticsController {
  private readonly log = new Logger('AnalyticsService');
  private readonly rate = new Map<string, { count: number; start: number }>();
  constructor(private readonly prisma: PrismaService) {}

  private verify(memberId: number, user: AuthUser) {
    if (memberId !== user.id && !isAdmin(user)) throw AppError.status(403, '접근 권한이 없습니다');
  }

  @Public()
  @Post('track')
  @HttpCode(200)
  async track(@Body() body: Record<string, unknown> | undefined) {
    const b = body ?? {};
    const req = {
      eventType: jsonString(b.eventType, 'eventType'), targetType: jsonString(b.targetType, 'targetType'), targetId: jsonLong(b.targetId, 'targetId'),
      memberId: jsonLong(b.memberId, 'memberId'), visitorToken: jsonString(b.visitorToken, 'visitorToken'),
    };
    try {
      if (req.memberId == null || req.eventType == null || isBlank(req.eventType)) return;
      // 작업·사진 조회는 실제 작가에게만 기록 — 남의 조회수 부풀리기 차단
      if (req.targetType === 'SERIES') {
        const s = req.targetId == null ? null : await this.prisma.series.findUnique({ where: { id: BigInt(req.targetId) }, select: { member_id: true } });
        if (Number(s?.member_id) !== req.memberId) return;
      }
      if (req.targetType === 'PHOTO') {
        const p = req.targetId == null ? null : await this.prisma.photos.findUnique({ where: { id: BigInt(req.targetId) }, select: { member_id: true } });
        if (Number(p?.member_id) !== req.memberId) return;
      }
      if (req.visitorToken != null) this.checkRate(req.visitorToken);
      await this.prisma.analytics_events.create({ data: {
        event_type: req.eventType, target_type: req.targetType, target_id: req.targetId == null ? null : BigInt(req.targetId),
        member_id: BigInt(req.memberId), visitor_token: req.visitorToken, created_at: now(),
      } });
    } catch (e) {
      if (e instanceof AppError) throw e;
      // Spring: 저장 실패를 잡아도 트랜잭션이 rollback-only로 표시돼 커밋에서 실패(500)
      this.log.warn(`Failed to track analytics event: ${(e as Error).message}`);
      throw new Error('Transaction silently rolled back because it has been marked as rollback-only');
    }
  }

  private checkRate(token: string) {
    const nowSec = Math.floor(Date.now() / 1000);
    const s = this.rate.get(token);
    const st = !s || nowSec - s.start > 60 ? { count: 1, start: nowSec } : { count: s.count + 1, start: s.start };
    this.rate.set(token, st);
    if (st.count > TRACK_LIMIT) throw AppError.status(429, '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.');
  }

  private count(memberId: bigint, type: string, since: Date) {
    return this.prisma.analytics_events.count({ where: { member_id: memberId, event_type: type, created_at: { gte: since } } });
  }

  @Get('summary')
  async summary(@Query('memberId') memberIdQ: string | undefined, @Query('period') periodQ: string | undefined, @CurrentUser() user: AuthUser) {
    const memberId = requiredLong(memberIdQ, 'memberId');
    const period = intParam(periodQ, 7, 'period');
    this.verify(memberId, user);
    const id = BigInt(memberId);
    const cur = daysAgo(period);
    const prev = daysAgo(period * 2);
    const [pv, pv2, phv, phv2, iq, iq2, sums] = await Promise.all([
      this.count(id, 'PORTFOLIO_VIEW', cur), this.count(id, 'PORTFOLIO_VIEW', prev),
      this.count(id, 'PHOTO_VIEW', cur), this.count(id, 'PHOTO_VIEW', prev),
      this.count(id, 'INQUIRY_SENT', cur), this.count(id, 'INQUIRY_SENT', prev),
      this.prisma.photos.aggregate({ where: { member_id: id }, _sum: { likes_count: true, saves_count: true } }),
    ]);
    return {
      portfolioViews: pv, portfolioViewsPrev: pv2 - pv, portfolioViewsChange: calcChange(pv, pv2 - pv),
      photoViews: phv, photoViewsPrev: phv2 - phv, photoViewsChange: calcChange(phv, phv2 - phv),
      totalLikes: sums._sum.likes_count ?? 0, totalLikesPrev: 0, totalLikesChange: 0.0,
      totalSaves: sums._sum.saves_count ?? 0, totalSavesPrev: 0, totalSavesChange: 0.0,
      inquiryCount: iq, inquiryCountPrev: iq2 - iq, inquiryCountChange: calcChange(iq, iq2 - iq),
      period,
    };
  }

  @Get('daily')
  async daily(@Query('memberId') memberIdQ: string | undefined, @Query('period') periodQ: string | undefined, @CurrentUser() user: AuthUser) {
    const memberId = requiredLong(memberIdQ, 'memberId');
    const period = intParam(periodQ, 30, 'period');
    this.verify(memberId, user);
    const rows = await this.prisma.$queryRaw<{ d: string; cnt: bigint }[]>(Prisma.sql`
      SELECT to_char(created_at, 'YYYY-MM-DD') AS d, COUNT(*) AS cnt FROM analytics_events
      WHERE member_id = ${BigInt(memberId)} AND event_type = 'PORTFOLIO_VIEW' AND created_at >= ${daysAgo(period)}
      GROUP BY d ORDER BY d`);
    return rows.map((r) => ({ date: r.d, count: Number(r.cnt) }));
  }

  @Get('top-photos')
  async topPhotos(@Query('memberId') memberIdQ: string | undefined, @Query('metric') metricQ: string | undefined,
    @Query('limit') limitQ: string | undefined, @CurrentUser() user: AuthUser) {
    const memberId = requiredLong(memberIdQ, 'memberId');
    const metric = metricQ ?? 'views';
    const limit = Math.max(1, Math.min(20, intParam(limitQ, 5, 'limit')));
    this.verify(memberId, user);
    const id = BigInt(memberId);
    const m = metric.toLowerCase();
    if (m !== 'views') {
      const field = m === 'saves' ? 'saves_count' : m === 'shares' ? 'shares_count' : 'likes_count';
      const rows = await this.prisma.photos.findMany({ where: { member_id: id }, orderBy: [{ [field]: 'desc' }, { created_at: 'desc' }, { id: 'desc' }], take: limit });
      return rows.map((p) => topPhoto(p, m, p[field] ?? 0)).filter((d) => d.count > 0);
    }
    const groups = await this.prisma.analytics_events.groupBy({
      by: ['target_id'], where: { member_id: id, target_type: 'PHOTO', event_type: 'PHOTO_VIEW' },
      _count: { _all: true }, orderBy: [{ _count: { target_id: 'desc' } }, { target_id: 'asc' }], take: limit,
    });
    const ids = groups.flatMap((g) => (g.target_id == null ? [] : [g.target_id]));
    const photos = ids.length ? await this.prisma.photos.findMany({ where: { id: { in: ids } } }) : [];
    const byId = new Map(photos.map((p) => [p.id, p]));
    return groups.filter((g) => g.target_id != null && byId.has(g.target_id)).map((g) => topPhoto(byId.get(g.target_id!)!, 'views', g._count._all));
  }

  @Get('top-works')
  async topWorks(@Query('memberId') memberIdQ: string | undefined, @Query('period') periodQ: string | undefined,
    @Query('limit') limitQ: string | undefined, @CurrentUser() user: AuthUser) {
    const memberId = requiredLong(memberIdQ, 'memberId');
    const period = Math.max(1, Math.min(365, intParam(periodQ, 30, 'period')));
    const limit = Math.max(1, Math.min(20, intParam(limitQ, 5, 'limit')));
    this.verify(memberId, user);
    const id = BigInt(memberId);
    const since = daysAgo(period);
    const groups = await this.prisma.analytics_events.groupBy({
      by: ['target_id'], where: { member_id: id, event_type: 'WORK_VIEW', target_type: 'SERIES', target_id: { not: null }, created_at: { gte: since } },
      _count: { _all: true }, orderBy: [{ _count: { target_id: 'desc' } }, { target_id: 'asc' }], take: limit,
    });
    const ids = groups.map((g) => g.target_id!);
    if (!ids.length) return [];
    const [series, inquiries] = await Promise.all([
      this.prisma.series.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, cover_image_url: true } }),
      this.prisma.inquiries.groupBy({ by: ['source_series_id'], where: { receiver_member_id: id, source_series_id: { in: ids }, created_at: { gte: since } }, _count: { _all: true } }),
    ]);
    const byId = new Map(series.map((s) => [s.id, s]));
    const iq = new Map(inquiries.map((g) => [g.source_series_id, g._count._all]));
    return groups.filter((g) => byId.has(g.target_id!)).map((g) => {
      const s = byId.get(g.target_id!)!;
      return { seriesId: Number(s.id), title: s.title, coverImageUrl: s.cover_image_url, views: g._count._all, inquiries: iq.get(s.id) ?? 0 };
    });
  }

  @Get('genre-distribution')
  async genres(@Query('memberId') memberIdQ: string | undefined, @CurrentUser() user: AuthUser) {
    const memberId = requiredLong(memberIdQ, 'memberId');
    this.verify(memberId, user);
    const rows = await this.prisma.photos.groupBy({ by: ['genre'], where: { member_id: BigInt(memberId), genre: { not: null } }, _count: { _all: true },
      orderBy: [{ _count: { genre: 'desc' } }, { genre: 'asc' }] });
    return rows.map((r) => ({ genre: r.genre ?? 'UNKNOWN', count: r._count._all }));
  }
}
