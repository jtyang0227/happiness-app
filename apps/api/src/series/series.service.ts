import { Injectable, Logger } from '@nestjs/common';
import type { Prisma, series } from '../generated/prisma/client.js';
import { AppError } from '../common/app-error.js';
import { EmptyResponseError, RawBodyError } from '../common/raw-body-error.js';
import { localDateTime, now } from '../common/time.js';
import { AuthUser, isAdmin } from '../auth/auth.guard.js';
import { PhotoResponse, attachMembers, toPhotoResponse } from '../photo/photo.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** 문의 폼 SHOOT_TYPES와 같은 어휘 — 웹 constants/shootTypes.js와 일치해야 프리필이 동작 */
export const SHOOT_TYPES = new Set(['결혼식', '제품촬영', '인물/프로필', '풍경', '행사/이벤트', '가족', '기타']);

export interface Credit { role?: string | null; name?: string | null; profileName?: string | null; linked?: boolean }
export interface SeriesRequest {
  memberId?: number | null; title?: string | null; description?: string | null; coverImageUrl?: string | null; displayOrder?: number | null;
  shootType?: string | null; clientLabel?: string | null; shotOn?: string | null; story?: string | null; pinned?: boolean | null;
  draft?: boolean | null; credits?: Credit[] | null;
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').trim();
const empty = (status: number) => new EmptyResponseError(status);
const thumbOf = (p: { thumbnail_url: string | null; image_url: string }) => p.thumbnail_url ?? p.image_url;

/** CreditsJson.read — 깨진 JSON은 빈 목록, NON_NULL(값 없는 키는 빼고) */
function readCredits(json: string | null): Credit[] {
  if (json == null || json.trim() === '') return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v.map((c) => clean({ role: c?.role ?? null, name: c?.name ?? null, profileName: c?.profileName ?? null, linked: c?.linked ?? undefined }));
  } catch {
    return [];
  }
}
function clean(c: Credit): Credit {
  const o: Credit = {};
  if (c.role != null) o.role = c.role;
  if (c.name != null) o.name = c.name;
  if (c.profileName != null) o.profileName = c.profileName;
  if (c.linked != null) o.linked = c.linked;
  return o;
}

/** Spring SeriesResponse(Jackson 기본 — null 키도 내보냄) */
function seriesBody(s: series, extra: { photoCount: number; photos: PhotoResponse[] | null; previewPhotos: string[] | null; cover: string | null }) {
  return {
    id: Number(s.id), memberId: Number(s.member_id), title: s.title, description: s.description,
    coverImageUrl: s.cover_image_url ?? extra.cover, displayOrder: s.display_order,
    shootType: s.shoot_type, clientLabel: s.client_label, shotOn: s.shot_on, story: s.story,
    pinned: s.pinned === true, draft: s.draft === true, photoCount: extra.photoCount, photos: extra.photos, previewPhotos: extra.previewPhotos,
    createdAt: localDateTime(s.created_at), updatedAt: localDateTime(s.updated_at),
    appreciationCount: null as number | null, viewCount: null as number | null, appreciatedByMe: null as boolean | null,
    credits: readCredits(s.credits_json),
  };
}

/** Spring SeriesController / AdminSeriesController 1:1 */
@Injectable()
export class SeriesService {
  private readonly log = new Logger('SeriesController');
  constructor(private readonly prisma: PrismaService) {}

  private async orderedPhotos(seriesId: bigint): Promise<PhotoResponse[]> {
    const sps = await this.prisma.series_photos.findMany({ where: { series_id: seriesId }, orderBy: [{ display_order: 'asc' }, { id: 'asc' }] });
    const photos = await this.prisma.photos.findMany({ where: { id: { in: sps.map((x) => x.photo_id) } } });
    const byId = new Map(photos.map((p) => [p.id, p]));
    const list = sps.flatMap((sp) => (byId.has(sp.photo_id) ? [toPhotoResponse(byId.get(sp.photo_id)!)] : []));
    // 의도적 차이: Spring SeriesController는 작성자 이름·아바타를 붙이지 않아 화면에 "익명"으로 보였다(알려진 갭) — 다른 사진 API처럼 한 번에 붙인다
    return attachMembers(this.prisma, list);
  }

  private detailBody(s: series, photos: PhotoResponse[]) {
    const cover = photos.length ? (photos[0].thumbnailUrl ?? photos[0].imageUrl) : null;
    return seriesBody(s, { photoCount: photos.length, photos, previewPhotos: null, cover });
  }

  /** 목록용 — photos는 null, 커버·미리보기 3장(Spring은 한 장씩 조회, 여기선 한 번에) */
  private async summaries(list: series[]) {
    const sps = list.length === 0 ? [] : await this.prisma.series_photos.findMany({
      where: { series_id: { in: list.map((s) => s.id) } }, orderBy: [{ series_id: 'asc' }, { display_order: 'asc' }, { id: 'asc' }],
    });
    const bySeries = new Map<bigint, bigint[]>();
    for (const sp of sps) bySeries.set(sp.series_id, [...(bySeries.get(sp.series_id) ?? []), sp.photo_id]);
    const need = [...bySeries.values()].flatMap((ids) => ids.slice(0, 3));
    const photos = await this.prisma.photos.findMany({ where: { id: { in: need } }, select: { id: true, thumbnail_url: true, image_url: true } });
    const thumb = new Map(photos.map((p) => [p.id, thumbOf(p)]));
    return list.map((s) => {
      const ids = bySeries.get(s.id) ?? [];
      const cover = ids.length ? (thumb.get(ids[0]) ?? null) : null;
      const previews = ids.slice(0, 3).flatMap((id) => (thumb.has(id) ? [thumb.get(id)!] : []));
      return seriesBody(s, { photoCount: ids.length, photos: null, previewPhotos: previews, cover });
    });
  }

  private memberSeries(memberId: number) {
    return this.prisma.series.findMany({ where: { member_id: BigInt(memberId) }, orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }, { id: 'desc' }] });
  }

  async publicList(memberId?: number) {
    if (memberId == null) return [];
    return this.summaries((await this.memberSeries(memberId)).filter((s) => s.draft !== true));
  }

  async mine(user: AuthUser) {
    return this.summaries(await this.memberSeries(user.id));
  }

  private visible(s: series, user?: AuthUser) {
    if (s.draft !== true) return true;
    return !!user && (Number(s.member_id) === user.id || isAdmin(user));
  }

  async detail(id: number, user?: AuthUser) {
    const s = await this.prisma.series.findUnique({ where: { id: BigInt(id) } });
    if (!s || !this.visible(s, user)) throw empty(404);
    const body = this.detailBody(s, await this.orderedPhotos(s.id));
    body.appreciationCount = await this.prisma.series_appreciations.count({ where: { series_id: s.id } });
    body.credits = await this.withLinks(body.credits);
    body.viewCount = (await this.viewCounts([s.id])).get(s.id) ?? 0;
    body.appreciatedByMe = !!user && (await this.prisma.series_appreciations.count({ where: { series_id: s.id, member_id: BigInt(user.id) } })) > 0;
    return body;
  }

  private async withLinks(credits: Credit[]) {
    const names = [...new Set(credits.map((c) => c.profileName).filter((n): n is string => n != null))];
    const pub = names.length === 0 ? new Set<string>() : new Set(
      (await this.prisma.members.findMany({ where: { profile_name: { in: names } }, select: { profile_name: true, public_profile: true } }))
        .filter((m) => m.public_profile).map((m) => m.profile_name!),
    );
    return credits.map((c) => clean({ role: c.role, name: c.name, profileName: c.profileName, linked: c.profileName != null && pub.has(c.profileName) }));
  }

  private async viewCounts(ids: bigint[]) {
    if (ids.length === 0) return new Map<bigint, number>();
    const rows = await this.prisma.analytics_events.groupBy({
      by: ['target_id'], where: { event_type: 'WORK_VIEW', target_type: 'SERIES', target_id: { in: ids } }, _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.target_id!, r._count._all]));
  }

  private async appreciationCounts(ids: bigint[]) {
    if (ids.length === 0) return new Map<bigint, number>();
    const rows = await this.prisma.series_appreciations.groupBy({ by: ['series_id'], where: { series_id: { in: ids } }, _count: { _all: true } });
    return new Map(rows.map((r) => [r.series_id, r._count._all]));
  }

  // ── 감상 ──
  async appreciate(id: number, user: AuthUser) {
    const s = await this.prisma.series.findUnique({ where: { id: BigInt(id) } });
    if (!s || !this.visible(s, user)) throw AppError.status(404, '작업을 찾을 수 없습니다.');
    if (Number(s.member_id) === user.id) throw AppError.status(400, '본인 작업에는 감상할 수 없어요.');
    await this.prisma.series_appreciations.createMany({ data: [{ series_id: s.id, member_id: BigInt(user.id), created_at: now() }], skipDuplicates: true });
    return { appreciationCount: await this.prisma.series_appreciations.count({ where: { series_id: s.id } }), appreciatedByMe: true };
  }

  async myAppreciation(id: number, user: AuthUser) {
    if (!(await this.prisma.series.findUnique({ where: { id: BigInt(id) }, select: { id: true } }))) throw AppError.status(404, '작업을 찾을 수 없습니다.');
    const sid = BigInt(id);
    return {
      appreciationCount: await this.prisma.series_appreciations.count({ where: { series_id: sid } }),
      appreciatedByMe: (await this.prisma.series_appreciations.count({ where: { series_id: sid, member_id: BigInt(user.id) } })) > 0,
    };
  }

  async unappreciate(id: number, user: AuthUser) {
    if (!(await this.prisma.series.findUnique({ where: { id: BigInt(id) }, select: { id: true } }))) throw AppError.status(404, '작업을 찾을 수 없습니다.');
    const sid = BigInt(id);
    await this.prisma.series_appreciations.deleteMany({ where: { series_id: sid, member_id: BigInt(user.id) } });
    return { appreciationCount: await this.prisma.series_appreciations.count({ where: { series_id: sid } }), appreciatedByMe: false };
  }

  // ── 탐색 ──
  async discover(q: { shootType?: string; location?: string; sort: string; featured: boolean; page: number; size: number }) {
    const type = q.shootType != null && SHOOT_TYPES.has(q.shootType.trim()) ? q.shootType.trim() : null;
    let loc = q.location == null ? null : q.location.trim();
    if (loc === '') loc = null;
    if (loc != null && loc.length > 50) loc = loc.slice(0, 50);
    const page = Math.max(q.page, 0);
    const size = Math.min(Math.max(q.size, 1), 60);
    const rows = await this.discoverRows(type, loc, q.sort, q.featured, page * size, size + 1);
    const hasNext = rows.length > size;
    const works = rows.slice(0, size);
    const memberIds = [...new Set(works.map((s) => s.member_id))];
    const [members, avail] = await Promise.all([
      this.prisma.members.findMany({ where: { id: { in: memberIds } } }),
      this.prisma.booking_availability.findMany({ where: { member_id: { in: memberIds } }, select: { member_id: true, is_active: true } }),
    ]);
    const memberById = new Map(members.map((m) => [m.id, m]));
    const accepting = new Set(avail.filter((a) => a.is_active).map((a) => a.member_id));
    const ids = works.map((s) => s.id);
    const sps = ids.length === 0 ? [] : await this.prisma.series_photos.findMany({
      where: { series_id: { in: ids } }, orderBy: [{ series_id: 'asc' }, { display_order: 'asc' }, { id: 'asc' }],
    });
    const bySeries = new Map<bigint, bigint[]>();
    for (const sp of sps) bySeries.set(sp.series_id, [...(bySeries.get(sp.series_id) ?? []), sp.photo_id]);
    const [appr, views, thumbs] = await Promise.all([
      this.appreciationCounts(ids), this.viewCounts(ids),
      this.prisma.photos.findMany({ where: { id: { in: [...bySeries.values()].flatMap((x) => x.slice(0, 3)) } }, select: { id: true, thumbnail_url: true, image_url: true } }),
    ]);
    const thumb = new Map(thumbs.map((p) => [p.id, thumbOf(p)]));
    const data = works.map((s) => {
      const pids = bySeries.get(s.id) ?? [];
      const previews = pids.slice(0, 3).flatMap((id) => (thumb.has(id) ? [thumb.get(id)!] : []));
      const m = memberById.get(s.member_id);
      return {
        id: Number(s.id), title: s.title, coverImageUrl: s.cover_image_url ?? (previews[0] ?? null),
        shootType: s.shoot_type, clientLabel: s.client_label, shotOn: s.shot_on, photoCount: pids.length, previewPhotos: previews,
        updatedAt: localDateTime(s.updated_at), memberId: Number(s.member_id),
        memberName: m?.name ?? null, memberProfileName: m?.profile_name ?? null, memberAvatarUrl: m?.avatar_url ?? null, memberLocation: m?.location ?? null,
        acceptingBookings: accepting.has(s.member_id), appreciationCount: appr.get(s.id) ?? 0, viewCount: views.get(s.id) ?? 0,
        featured: s.featured_at != null,
      };
    });
    return { data, size, hasNext, page };
  }

  /** SeriesRepository.discover* 4종 — 공개 작가·초안 아님·사진 1장 이상 */
  private discoverRows(type: string | null, loc: string | null, sort: string, featured: boolean, skip: number, take: number): Promise<series[]> {
    if (featured) {
      return this.prisma.$queryRaw<series[]>`
        SELECT s.* FROM series s JOIN members m ON s.member_id = m.id
        WHERE m.public_profile = true AND s.featured_at IS NOT NULL AND (s.draft IS NULL OR s.draft = false)
          AND EXISTS (SELECT 1 FROM series_photos sp WHERE sp.series_id = s.id)
        ORDER BY s.featured_at DESC, s.id DESC OFFSET ${skip} LIMIT ${take}`;
    }
    const order = sort === 'appreciated'
      ? 'ORDER BY (SELECT COUNT(*) FROM series_appreciations a WHERE a.series_id = s.id) DESC, s.updated_at DESC, s.id DESC'
      : sort === 'viewed'
        ? "ORDER BY (SELECT COUNT(*) FROM analytics_events e WHERE e.event_type = 'WORK_VIEW' AND e.target_type = 'SERIES' AND e.target_id = s.id) DESC, s.updated_at DESC, s.id DESC"
        : 'ORDER BY s.updated_at DESC, s.id DESC';
    return this.prisma.$queryRawUnsafe<series[]>(
      `SELECT s.* FROM series s JOIN members m ON s.member_id = m.id
       WHERE m.public_profile = true
         AND ($1::text IS NULL OR s.shoot_type = $1::text)
         AND ($2::text IS NULL OR LOWER(m.location) LIKE CONCAT('%', LOWER($2::text), '%'))
         AND (s.draft IS NULL OR s.draft = false)
         AND EXISTS (SELECT 1 FROM series_photos sp WHERE sp.series_id = s.id)
       ${order} OFFSET $3 LIMIT $4`,
      type, loc, skip, take,
    );
  }

  // ── 쓰기 ──
  private applyWorkNote(d: Prisma.seriesUncheckedUpdateInput, req: SeriesRequest) {
    if (req.draft != null) d.draft = req.draft ? true : null;
    if (req.shootType != null) {
      const v = req.shootType.trim();
      if (v !== '' && !SHOOT_TYPES.has(v)) throw AppError.status(400, '지원하지 않는 촬영 유형입니다.');
      d.shoot_type = v === '' ? null : v;
    }
    if (req.clientLabel != null) {
      const v = stripTags(req.clientLabel);
      if (v.length > 100) throw AppError.status(400, '클라이언트는 100자 이내로 입력해주세요.');
      d.client_label = v === '' ? null : v;
    }
    if (req.shotOn != null) {
      const v = req.shotOn.trim();
      if (v !== '' && !/^\d{4}\.(0[1-9]|1[0-2])$/.test(v)) throw AppError.status(400, '작업 시기는 YYYY.MM 형식으로 입력해주세요.');
      d.shot_on = v === '' ? null : v;
    }
    if (req.story != null) {
      const v = stripTags(req.story);
      if (v.length > 3000) throw AppError.status(400, '작업 이야기는 3000자 이내로 입력해주세요.');
      d.story = v === '' ? null : v;
    }
  }

  private applyCredits(d: Prisma.seriesUncheckedUpdateInput, req: SeriesRequest) {
    if (req.credits == null) return;
    if (req.credits.length > 20) throw AppError.status(400, '함께한 사람은 20명까지 적을 수 있어요.');
    const out: Credit[] = [];
    for (const c of req.credits) {
      const role = c?.role == null ? '' : stripTags(c.role);
      const name = c?.name == null ? '' : stripTags(c.name);
      const profile = c?.profileName == null ? '' : c.profileName.trim().replace(/^@/, '');
      if (role === '' && name === '' && profile === '') continue;
      if (role === '' || name === '') throw AppError.status(400, '함께한 사람은 역할과 이름을 모두 적어 주세요.');
      if (role.length > 20 || name.length > 40) throw AppError.status(400, '역할은 20자, 이름은 40자 이내로 적어 주세요.');
      if (profile !== '' && !/^[A-Za-z0-9_.-]{1,30}$/.test(profile)) throw AppError.status(400, '프로필명 형식이 올바르지 않아요.');
      out.push(clean({ role, name, profileName: profile === '' ? null : profile }));
    }
    d.credits_json = out.length === 0 ? null : JSON.stringify(out);
  }

  async create(req: SeriesRequest, user: AuthUser) {
    if (req.title == null || req.title.trim() === '') throw empty(400);
    let memberId = req.memberId;
    if (memberId == null) memberId = user.id;
    else if (memberId !== user.id && !isAdmin(user)) throw empty(403);
    const nextOrder = await this.prisma.series.count({ where: { member_id: BigInt(memberId) } });
    const d: Prisma.seriesUncheckedUpdateInput = {};
    this.applyWorkNote(d, req);
    this.applyCredits(d, req);
    const t = now();
    const saved = await this.prisma.series.create({
      data: {
        member_id: BigInt(memberId), title: req.title.trim(), description: req.description ?? null, cover_image_url: req.coverImageUrl ?? null,
        display_order: req.displayOrder ?? nextOrder, created_at: t, updated_at: t, ...(d as object),
      },
    });
    return this.detailBody(saved, []);
  }

  async update(id: number, req: SeriesRequest, user: AuthUser) {
    const s = await this.prisma.series.findUnique({ where: { id: BigInt(id) } });
    if (!s) throw empty(404);
    if (Number(s.member_id) !== user.id) throw empty(403);
    const d: Prisma.seriesUncheckedUpdateInput = {};
    if (req.title != null && req.title.trim() !== '') d.title = req.title.trim();
    if (req.description != null) d.description = req.description;
    if (req.coverImageUrl != null) d.cover_image_url = req.coverImageUrl;
    if (req.displayOrder != null) d.display_order = req.displayOrder;
    this.applyWorkNote(d, req);
    this.applyCredits(d, req);
    if (req.pinned != null) d.pinned = req.pinned;
    const changed = Object.entries(d).some(([k, v]) => (s as Record<string, unknown>)[k] !== v);
    const saved = await this.prisma.$transaction(async (tx) => {
      const r = changed ? await tx.series.update({ where: { id: s.id }, data: { ...d, updated_at: now() } }) : s;
      if (req.pinned === true) await tx.series.updateMany({ where: { member_id: s.member_id, id: { not: s.id }, pinned: true }, data: { pinned: false } });
      return r;
    });
    return this.detailBody(saved, await this.orderedPhotos(s.id));
  }

  async remove(id: number, user: AuthUser) {
    const s = await this.prisma.series.findUnique({ where: { id: BigInt(id) } });
    if (!s) throw empty(404);
    if (Number(s.member_id) !== user.id) throw empty(403);
    await this.prisma.$transaction([
      this.prisma.series_photos.deleteMany({ where: { series_id: s.id } }),
      this.prisma.series_appreciations.deleteMany({ where: { series_id: s.id } }),
      this.prisma.series.delete({ where: { id: s.id } }),
    ]);
  }

  async addPhoto(id: number, body: Record<string, unknown> | undefined, user: AuthUser) {
    const photoId = typeof body?.photoId === 'number' ? Math.trunc(body.photoId) : null;
    if (photoId == null) throw empty(400);
    const s = await this.prisma.series.findUnique({ where: { id: BigInt(id) } });
    if (!s) throw empty(404);
    if (Number(s.member_id) !== user.id) throw empty(403);
    if (!(await this.prisma.photos.findUnique({ where: { id: BigInt(photoId) }, select: { id: true } }))) throw empty(404);
    if (await this.prisma.series_photos.count({ where: { series_id: s.id, photo_id: BigInt(photoId) } })) throw new RawBodyError(409, { message: '이미 추가된 사진입니다.' });
    const next = await this.prisma.series_photos.count({ where: { series_id: s.id } });
    const order = typeof body?.displayOrder === 'number' ? Math.trunc(body.displayOrder) : next;
    await this.prisma.series_photos.create({ data: { series_id: s.id, photo_id: BigInt(photoId), display_order: order, created_at: now() } });
  }

  async removePhoto(id: number, photoId: number, user: AuthUser) {
    const s = await this.prisma.series.findUnique({ where: { id: BigInt(id) } });
    if (!s) throw empty(404);
    if (Number(s.member_id) !== user.id) throw empty(403);
    await this.prisma.series_photos.deleteMany({ where: { series_id: s.id, photo_id: BigInt(photoId) } });
  }

  /** 에디터 추천 — updated_at을 건드리지 않는다(최근 수정순 유지) */
  async setFeatured(id: number, body: Record<string, unknown> | undefined, user: AuthUser) {
    const featured = body?.featured;
    if (typeof featured !== 'boolean') throw AppError.status(400, 'featured(true/false)가 필요합니다.');
    const s = await this.prisma.series.findUnique({ where: { id: BigInt(id) } });
    if (!s) throw AppError.status(404, '작업을 찾을 수 없습니다.');
    if (featured && s.draft === true) throw AppError.status(400, '초안 작업은 추천할 수 없어요.');
    await this.prisma.series.update({ where: { id: s.id }, data: { featured_at: featured ? now() : null } });
    this.log.log(`[ADMIN] series featured: seriesId=${id} featured=${featured} by memberId=${user.id}`);
    return { id, featured };
  }
}
