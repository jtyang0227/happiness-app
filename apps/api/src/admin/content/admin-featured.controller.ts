import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { jsonLocalDate, jsonLong } from '../../common/json-body.js';
import { localDate, localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import { IllegalArgument, invalidRequest } from '../common/admin-errors.js';
import { longParam } from '../common/admin-params.js';
import { jsonField, objectBody } from '../common/admin-request.js';

const MAX_FEATURED = 10;

/** Spring 어드민 AdminFeaturedController — 메인 피처드 사진(최대 10장) */
@Controller('api/admin/featured')
export class AdminFeaturedController {
  constructor(private readonly prisma: AdminPrismaService) {}

  private async all() {
    const rows = await this.prisma.featured_items.findMany({ orderBy: { display_order: 'asc' }, include: { photos: { include: { members: true } } } });
    return rows.map((f) => ({
      id: Number(f.id), photoId: Number(f.photo_id), photoTitle: f.photos.title, thumbnailUrl: f.photos.thumbnail_url, authorName: f.photos.members.name,
      likesCount: f.photos.likes_count, displayOrder: f.display_order, startsAt: localDate(f.starts_at), endsAt: localDate(f.ends_at), addedAt: localDateTime(f.added_at),
    }));
  }

  @Get()
  list() {
    return this.all();
  }

  @Post()
  @HttpCode(200)
  async add(@Body() body: unknown) {
    const b = objectBody(body);
    const photoId = jsonField(() => jsonLong(b.photoId, 'photoId'));
    const startsAt = jsonField(() => jsonLocalDate(b.startsAt, 'startsAt'));
    const endsAt = jsonField(() => jsonLocalDate(b.endsAt, 'endsAt'));
    if (b.orderedIds !== undefined && b.orderedIds !== null && !Array.isArray(b.orderedIds)) throw invalidRequest();
    const count = await this.prisma.featured_items.count();
    if (count >= MAX_FEATURED) throw new IllegalArgument(`피처드 사진은 최대 ${MAX_FEATURED}개까지 등록할 수 있습니다.`);
    if (photoId !== null && (await this.prisma.featured_items.count({ where: { photo_id: BigInt(photoId) } })) > 0) {
      throw new IllegalArgument('이미 피처드에 등록된 사진입니다.');
    }
    // findById(null) — 저장소 예외 변환(InvalidDataAccessApiUsageException)이라 400이 아니라 500
    if (photoId === null) throw new Error('The given id must not be null');
    const photo = await this.prisma.photos.findUnique({ where: { id: BigInt(photoId) } });
    if (!photo) throw new IllegalArgument('사진을 찾을 수 없습니다.');
    // 관리자 id는 Authentication.getName()(이메일)을 Long으로 읽으려다 실패해 항상 null — Spring 그대로
    const item = await this.prisma.featured_items.create({
      data: { photo_id: photo.id, display_order: count, starts_at: startsAt, ends_at: endsAt, added_by_id: null, added_at: new Date() },
    });
    return (await this.all()).find((x) => x.id === Number(item.id));
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const fid = longParam(id);
    const item = await this.prisma.featured_items.findUnique({ where: { id: BigInt(fid) } });
    if (!item) throw new IllegalArgument('피처드 항목을 찾을 수 없습니다.');
    await this.prisma.$transaction(async (tx) => {
      await tx.featured_items.delete({ where: { id: item.id } });
      const rest = await tx.featured_items.findMany({ orderBy: { display_order: 'asc' } });
      for (let i = 0; i < rest.length; i++) if (rest[i].display_order !== i) await tx.featured_items.update({ where: { id: rest[i].id }, data: { display_order: i } });
    });
    return { message: '피처드에서 제거되었습니다.' };
  }

  @Patch('reorder')
  async reorder(@Body() body: unknown) {
    const b = objectBody(body);
    const raw = b.orderedIds;
    if (raw !== undefined && raw !== null && !Array.isArray(raw)) throw invalidRequest();
    const ids = Array.isArray(raw) ? raw.map((x) => jsonField(() => jsonLong(x, 'orderedIds'))) : null;
    for (const v of Object.values(b)) if (v !== null && !Array.isArray(v)) throw invalidRequest();
    if (ids === null) throw new Error('orderedIds is null');
    await this.prisma.$transaction(async (tx) => {
      const items = await tx.featured_items.findMany({ orderBy: { display_order: 'asc' } });
      const next = new Map(items.map((f) => [Number(f.id), f.display_order]));
      ids.forEach((fid, idx) => { if (fid !== null && next.has(fid)) next.set(fid, idx); });
      for (const f of items) if (next.get(Number(f.id)) !== f.display_order) await tx.featured_items.update({ where: { id: f.id }, data: { display_order: next.get(Number(f.id))! } });
    });
    return this.all();
  }
}
