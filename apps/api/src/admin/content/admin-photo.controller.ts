import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { Prisma } from '../../generated/admin-prisma/client.js';
import { isBlank } from '../../common/json-body.js';
import { localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import { IllegalArgument } from '../common/admin-errors.js';
import { intParam, longParam, optIntParam, optLongParam, optStrParam, pageRequest, pageResponse, strParam } from '../common/admin-params.js';
import { stringMap } from '../common/admin-request.js';
import { categoryLevel } from './category-code.js';

/** Map.ofEntries 순회 순서는 JVM마다 다르다 — 여러 별칭이 한 번에 들어간 입력만 결과가 갈릴 수 있어 선언 순서로 본다 */
const MOOD_ALIASES: Array<[string, string]> = [
  ['따뜻', 'WARM'], ['웜', 'WARM'], ['차가운', 'COOL'], ['쿨', 'COOL'], ['중성', 'NEUTRAL'], ['뉴트럴', 'NEUTRAL'],
  ['선명', 'VIVID'], ['비비드', 'VIVID'], ['어두운', 'DARK'], ['다크', 'DARK'], ['부드러운', 'SOFT'], ['소프트', 'SOFT'],
];

function resolveColorMood(colorMood: string | null): string | null {
  if (colorMood === null || isBlank(colorMood)) return null;
  const upper = colorMood.trim().toUpperCase();
  if (/^(WARM|COOL|NEUTRAL|VIVID|DARK|SOFT)$/.test(upper)) return upper;
  for (const [k, v] of MOOD_ALIASES) if (colorMood.trim().includes(k)) return v;
  return upper;
}

const blank = (s: string | null) => (s !== null && !isBlank(s) ? s.trim() : null);

export interface PhotoWithMember {
  id: bigint; title: string; image_url: string | null; thumbnail_url: string | null; color_mood: string | null;
  likes_count: number; saves_count: number; shares_count: number; member_id: bigint; author_name: string;
  category_code: string | null; display_order: number; created_at: Date;
}

export function photoDto(p: PhotoWithMember) {
  return {
    id: Number(p.id), title: p.title, imageUrl: p.image_url, thumbnailUrl: p.thumbnail_url, colorMood: p.color_mood,
    likesCount: p.likes_count, savesCount: p.saves_count, sharesCount: p.shares_count, memberId: Number(p.member_id),
    authorName: p.author_name, categoryCode: p.category_code,
    l1Name: p.category_code !== null ? categoryLevel(p.category_code, 1) : '00',
    l2Name: p.category_code !== null ? categoryLevel(p.category_code, 2) : '00',
    displayOrder: p.display_order, createdAt: localDateTime(p.created_at),
  };
}

const PHOTO_SELECT = Prisma.sql`p.id, p.title, p.image_url, p.thumbnail_url, p.color_mood, p.likes_count, p.saves_count, p.shares_count,
  p.member_id, m.name AS author_name, p.category_code, p.display_order, p.created_at`;

/** Spring 어드민 AdminPhotoController — /api/admin/photos */
@Controller('api/admin/photos')
export class AdminPhotoController {
  constructor(private readonly prisma: AdminPrismaService) {}

  private async one(id: number) {
    const r = await this.prisma.$queryRaw<PhotoWithMember[]>`SELECT ${PHOTO_SELECT} FROM photos p JOIN members m ON m.id = p.member_id WHERE p.id = ${id}`;
    if (!r.length) throw new IllegalArgument('사진을 찾을 수 없습니다.');
    return r[0];
  }

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const memberId = optLongParam(q.memberId);
    const mood = resolveColorMood(optStrParam(q.colorMood));
    const [l1, l2, l3, l4, l5] = ['l1', 'l2', 'l3', 'l4', 'l5'].map((k) => blank(optStrParam(q[k])));
    const search = blank(optStrParam(q.search));
    const sortBy = strParam(q.sortBy, 'latest');
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 24);
    const p = pageRequest(page, size);
    const order = { likes: 'p.likes_count DESC', saves: 'p.saves_count DESC', shares: 'p.shares_count DESC' }[sortBy] ?? 'p.created_at DESC';
    const seg = (n: number, v: string | null) => Prisma.sql`(${v}::text IS NULL OR SUBSTRING(p.category_code, ${n * 2 - 1}, 2) = ${v}::text)`;
    const where = Prisma.sql`(${memberId}::bigint IS NULL OR m.id = ${memberId}::bigint) AND (${mood}::text IS NULL OR p.color_mood = ${mood}::text)
      AND ${seg(1, l1)} AND ${seg(2, l2)} AND ${seg(3, l3)} AND ${seg(4, l4)} AND ${seg(5, l5)}
      AND (${search}::text IS NULL OR LOWER(p.title) LIKE '%' || LOWER(${search}::text) || '%' OR LOWER(m.name) LIKE '%' || LOWER(${search}::text) || '%'
        OR LOWER(p.description) LIKE '%' || LOWER(${search}::text) || '%' OR LOWER(m.profile_name) LIKE '%' || LOWER(${search}::text) || '%')`;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<PhotoWithMember[]>`SELECT ${PHOTO_SELECT} FROM photos p JOIN members m ON m.id = p.member_id WHERE ${where} ORDER BY ${Prisma.raw(order)} LIMIT ${p.take} OFFSET ${p.skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM photos p JOIN members m ON m.id = p.member_id WHERE ${where}`,
    ]);
    return pageResponse(rows.map(photoDto), page, size, Number(total[0].c));
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return photoDto(await this.one(longParam(id)));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const photoId = longParam(id);
    await this.one(photoId);
    await this.prisma.$transaction([
      this.prisma.series_photos.deleteMany({ where: { photo_id: BigInt(photoId) } }),
      this.prisma.photos.delete({ where: { id: BigInt(photoId) } }),
    ]);
    return { message: '사진이 삭제되었습니다.' };
  }

  @Patch(':id/category-code')
  async updateCategoryCode(@Param('id') id: string, @Body() body: unknown) {
    const photoId = longParam(id);
    const code = stringMap(body).categoryCode ?? null;
    const p = await this.one(photoId);
    if (p.category_code !== code) {
      await this.prisma.photos.update({ where: { id: BigInt(photoId) }, data: { category_code: code, updated_at: new Date() } });
    }
    return photoDto({ ...p, category_code: code });
  }
}

/** Spring 어드민 AdminCategoryController — 활성 분류 (level을 주면 그 단계만, 아니면 단계별로 묶어서) */
@Controller('api/admin/categories')
export class AdminCategoryController {
  constructor(private readonly prisma: AdminPrismaService) {}

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const level = optIntParam(q.level);
    // sort_order가 null이면 Spring은 primitive int에 넣지 못해 500
    const dto = (c: { level: number; code: string; name_ko: string; name_en: string | null; sort_order: number | null }) => {
      if (c.sort_order === null) throw new Error('Null value was assigned to a property of primitive type: sortOrder');
      return { level: c.level, code: c.code, nameKo: c.name_ko, nameEn: c.name_en, sortOrder: c.sort_order };
    };
    if (level !== null) {
      return (await this.prisma.photo_categories.findMany({ where: { level, is_active: true }, orderBy: { sort_order: 'asc' } })).map(dto);
    }
    const all = await this.prisma.photo_categories.findMany({ where: { is_active: true }, orderBy: [{ level: 'asc' }, { sort_order: 'asc' }] });
    const grouped: Record<string, ReturnType<typeof dto>[]> = {};
    for (const c of all) (grouped[String(c.level)] ??= []).push(dto(c));
    return grouped;
  }
}
