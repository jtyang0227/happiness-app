import { Injectable } from '@nestjs/common';
import type { Prisma, photos } from '../generated/prisma/client.js';
import { localDateTime } from '../common/time.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PhotoResponse, attachMembers, toPhotoResponse } from './photo.mapper.js';

const SORT_FIELDS: Record<string, keyof photos> = {
  createdAt: 'created_at', likesCount: 'likes_count', savesCount: 'saves_count', sharesCount: 'shares_count', displayOrder: 'display_order', title: 'title',
};

export interface PhotoListQuery {
  keyword?: string; colorMood?: string; memberId?: number; imageRatio?: string; genre?: string;
  sortBy: string; order: string; tags?: string; page?: number; size: number;
}

const blank = (s?: string) => s == null || s === '';

/** Spring PhotoController 조회 경로 1:1 */
@Injectable()
export class PhotoQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: PhotoListQuery) {
    const byViews = q.sortBy === 'views';
    const field = SORT_FIELDS[q.sortBy] ?? 'created_at';
    const dir: Prisma.SortOrder = q.order.toLowerCase() === 'asc' ? 'asc' : 'desc';

    let tagged: Set<number> | null = null;
    if (q.tags != null && q.tags.trim() !== '') {
      const names = q.tags.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (names.length) {
        const rows = await this.prisma.$queryRaw<{ photo_id: bigint }[]>`SELECT DISTINCT photo_id FROM photo_tags WHERE LOWER(member_name) = ANY(${names})`;
        tagged = new Set(rows.map((r) => Number(r.photo_id)));
      }
    }
    const hasKeyword = q.keyword != null && q.keyword.trim() !== '';
    const paged = q.page != null;
    const pageNo = paged ? Math.max(q.page!, 0) : 0;
    const pageSize = Math.min(Math.max(q.size, 1), 100);
    let hasNext: boolean | null = null;
    let list: PhotoResponse[];
    const where = this.filters(null, q);
    // Spring Sort.nullsLast() — 동점 순서는 Spring이 정하지 않아 id로 고정(README 알려진 차이)
    // nulls 옵션은 NULL 가능한 컬럼에만 허용 — 정렬 화이트리스트 중 display_order만 해당
    const first = field === 'display_order' ? { [field]: { sort: dir, nulls: 'last' as const } } : { [field]: dir };
    const orderBy: Prisma.photosOrderByWithRelationInput[] = [first, { id: dir }];

    if (paged && !hasKeyword && tagged == null) {
      let rows: photos[];
      if (byViews) {
        rows = await this.byViewsPage(q, pageNo * pageSize, pageSize + 1);
      } else {
        rows = await this.prisma.photos.findMany({ where, orderBy, skip: pageNo * pageSize, take: pageSize + 1 });
      }
      hasNext = rows.length > pageSize;
      list = rows.slice(0, pageSize).map(toPhotoResponse);
    } else {
      let rows: photos[];
      if (hasKeyword) {
        rows = await this.fuzzy(q).catch(() => this.prisma.photos.findMany({ where: this.filters(q.keyword!, q), orderBy }));
      } else {
        rows = await this.prisma.photos.findMany({ where, orderBy });
      }
      list = rows.map(toPhotoResponse);
      if (tagged) list = list.filter((p) => tagged!.has(p.id));
      if (byViews && list.length) {
        const views = await this.photoViews(list.map((p) => p.id));
        list = [...list].sort((a, b) => (views.get(b.id) ?? 0) - (views.get(a.id) ?? 0)); // 안정 정렬
      }
      if (paged) {
        const from = Math.min(pageNo * pageSize, list.length);
        const to = Math.min(from + pageSize, list.length);
        hasNext = to < list.length;
        list = list.slice(from, to);
      }
    }
    await attachMembers(this.prisma, list);
    const result: Record<string, unknown> = { data: list };
    if (paged) Object.assign(result, { size: pageSize, hasNext, page: pageNo });
    result.status = 'success';
    return result;
  }

  /** JPQL search()의 조건 — 빈 문자열은 조건 없음, keyword는 제목·설명 부분 일치(대소문자 무시) */
  private filters(keyword: string | null, q: PhotoListQuery): Prisma.photosWhereInput {
    const and: Prisma.photosWhereInput[] = [];
    if (!blank(keyword ?? undefined)) {
      and.push({ OR: [{ title: { contains: keyword!, mode: 'insensitive' } }, { description: { contains: keyword!, mode: 'insensitive' } }] });
    }
    if (!blank(q.colorMood)) and.push({ color_mood: q.colorMood });
    if (q.memberId != null) and.push({ member_id: BigInt(q.memberId) });
    if (!blank(q.imageRatio)) and.push({ image_ratio: q.imageRatio });
    if (!blank(q.genre)) and.push({ genre: q.genre });
    return { AND: and };
  }

  /** pg_trgm 유사도 검색 — 확장이 없으면 예외 → 호출 측이 LIKE로 대체(Spring과 같음) */
  private fuzzy(q: PhotoListQuery): Promise<photos[]> {
    const kw = q.keyword!;
    const memberId = q.memberId == null ? null : BigInt(q.memberId);
    return this.prisma.$queryRaw<photos[]>`
      SELECT * FROM photos
      WHERE (
        title ILIKE CONCAT('%', ${kw}::text, '%') OR COALESCE(description, '') ILIKE CONCAT('%', ${kw}::text, '%') OR
        (CHAR_LENGTH(${kw}::text) >= 2 AND (
          LOWER(title) % LOWER(${kw}::text) OR LOWER(COALESCE(description, '')) % LOWER(${kw}::text) OR
          LOWER(${kw}::text) <% LOWER(title) OR LOWER(${kw}::text) <% LOWER(COALESCE(description, ''))))
      )
      AND (${q.colorMood ?? ''}::text = '' OR color_mood = ${q.colorMood ?? ''}::text)
      AND (${memberId}::bigint IS NULL OR member_id = ${memberId}::bigint)
      AND (${q.imageRatio ?? ''}::text = '' OR image_ratio = ${q.imageRatio ?? ''}::text)
      AND (${q.genre ?? ''}::text = '' OR genre = ${q.genre ?? ''}::text)
      ORDER BY GREATEST(
        similarity(LOWER(title), LOWER(${kw}::text)), similarity(LOWER(COALESCE(description, '')), LOWER(${kw}::text)),
        word_similarity(LOWER(${kw}::text), LOWER(title)), word_similarity(LOWER(${kw}::text), LOWER(COALESCE(description, '')))
      ) DESC, created_at DESC`;
  }

  private byViewsPage(q: PhotoListQuery, skip: number, take: number): Promise<photos[]> {
    const memberId = q.memberId == null ? null : BigInt(q.memberId);
    return this.prisma.$queryRaw<photos[]>`
      SELECT p.* FROM photos p
      WHERE (${q.colorMood ?? ''}::text = '' OR p.color_mood = ${q.colorMood ?? ''}::text)
        AND (${memberId}::bigint IS NULL OR p.member_id = ${memberId}::bigint)
        AND (${q.imageRatio ?? ''}::text = '' OR p.image_ratio = ${q.imageRatio ?? ''}::text)
        AND (${q.genre ?? ''}::text = '' OR p.genre = ${q.genre ?? ''}::text)
      ORDER BY (SELECT COUNT(*) FROM analytics_events e WHERE e.event_type = 'PHOTO_VIEW' AND e.target_type = 'PHOTO' AND e.target_id = p.id) DESC,
               p.created_at DESC, p.id DESC
      OFFSET ${skip} LIMIT ${take}`;
  }

  private async photoViews(ids: number[]) {
    const rows = await this.prisma.analytics_events.groupBy({
      by: ['target_id'],
      where: { event_type: 'PHOTO_VIEW', target_type: 'PHOTO', target_id: { in: ids.map(BigInt) } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [Number(r.target_id), r._count._all]));
  }

  async suggestions(q: string) {
    if (q.trim() === '') return [];
    const rows = await this.prisma.photos.findMany({ where: { title: { contains: q, mode: 'insensitive' } }, orderBy: { title: 'asc' }, take: 5, select: { title: true } });
    return rows.map((r) => r.title);
  }

  async one(id: number) {
    const p = await this.prisma.photos.findUnique({ where: { id: BigInt(id) } });
    if (!p) return null;
    return (await attachMembers(this.prisma, [toPhotoResponse(p)]))[0];
  }

  async similar(id: number, size: number) {
    const base = await this.prisma.photos.findUnique({ where: { id: BigInt(id) } });
    if (!base) return null;
    const limit = Math.min(Math.max(size, 1), 24);
    const notSelf = { id: { not: base.id } };
    const where: Prisma.photosWhereInput = base.genre == null && base.color_mood == null
      ? notSelf
      : { AND: [notSelf, { OR: [{ genre: base.genre ?? undefined }, { color_mood: base.color_mood ?? undefined }].filter((c) => Object.values(c)[0] !== undefined) }] };
    const candidates = await this.prisma.photos.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 300 });
    const baseSubs = new Set(splitGenres(base.sub_genres));
    const baseRgb = parseHex(base.dominant_color);
    const ranked = candidates
      .map((p) => {
        let s = 0;
        if (base.genre != null && base.genre === p.genre) s += 3;
        if (base.color_mood != null && base.color_mood === p.color_mood) s += 2;
        for (const sub of splitGenres(p.sub_genres)) if (baseSubs.has(sub)) s += 1;
        const rgb = parseHex(p.dominant_color);
        if (baseRgb && rgb) {
          const dist = Math.sqrt((baseRgb[0] - rgb[0]) ** 2 + (baseRgb[1] - rgb[1]) ** 2 + (baseRgb[2] - rgb[2]) ** 2);
          s += 2 * Math.max(0, 1 - dist / 220.0);
        }
        if (s > 0 && base.image_ratio != null && base.image_ratio === p.image_ratio) s += 0.5;
        return { p, s };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s); // 안정 정렬
    const perAuthor = new Map<bigint, number>();
    const result: PhotoResponse[] = [];
    for (const { p } of ranked) {
      if (result.length >= limit) break;
      const n = (perAuthor.get(p.member_id) ?? 0) + 1;
      perAuthor.set(p.member_id, n);
      if (n > 4) continue;
      result.push(toPhotoResponse(p));
    }
    return attachMembers(this.prisma, result);
  }

  async tags(photoId: number) {
    const rows = await this.prisma.photo_tags.findMany({ where: { photo_id: BigInt(photoId) }, orderBy: { id: 'asc' } });
    return rows.map((t) => ({ id: Number(t.id), memberId: Number(t.member_id), memberName: t.member_name, positionX: t.positionx, positionY: t.positiony, createdAt: localDateTime(t.created_at) }));
  }

  /** 엔티티를 그대로 직렬화하던 응답 — {id, photoId, memberId, createdAt} (공유는 platform 포함) */
  async likes(photoId: number) {
    const rows = await this.prisma.photo_likes.findMany({ where: { photo_id: BigInt(photoId) }, orderBy: { id: 'asc' } });
    return rows.map((l) => ({ id: Number(l.id), photoId: Number(l.photo_id), memberId: Number(l.member_id), createdAt: localDateTime(l.created_at) }));
  }

  async shares(photoId: number) {
    const rows = await this.prisma.photo_shares.findMany({ where: { photo_id: BigInt(photoId) }, orderBy: { id: 'asc' } });
    return rows.map((s) => ({ id: Number(s.id), photoId: Number(s.photo_id), memberId: Number(s.member_id), platform: s.platform, createdAt: localDateTime(s.created_at) }));
  }

  /** 저장 기록 순서대로, 지워진 사진은 빠짐. 작성자 정보는 Spring처럼 채우지 않는다 */
  async saved(memberId: number) {
    const saves = await this.prisma.photo_saves.findMany({ where: { member_id: BigInt(memberId) }, orderBy: { id: 'asc' } });
    const rows = await this.prisma.photos.findMany({ where: { id: { in: saves.map((s) => s.photo_id) } } });
    const byId = new Map(rows.map((p) => [p.id, p]));
    return saves.flatMap((s) => (byId.has(s.photo_id) ? [toPhotoResponse(byId.get(s.photo_id)!)] : []));
  }

  async genreStats(memberId?: number) {
    const rows = await this.prisma.photos.groupBy({
      by: ['genre'],
      where: { genre: { not: null }, ...(memberId != null ? { member_id: BigInt(memberId) } : {}) },
      _count: { _all: true },
      orderBy: { _count: { genre: 'desc' } },
    });
    return rows.map((r) => ({ count: r._count._all, genre: r.genre }));
  }
}

function splitGenres(raw: string | null): string[] {
  if (raw == null || raw.trim() === '') return [];
  return raw.replace(/[[\]"\s]/g, '').split(',').filter(Boolean);
}

function parseHex(hex: string | null): [number, number, number] | null {
  if (hex == null || !/^#?[0-9a-fA-F]{6}$/.test(hex)) return null;
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
