import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppError } from '../common/app-error.js';
import { optionalLong } from '../common/params.js';
import { localDateTime, now } from '../common/time.js';
import { AuthUser, CurrentUser, Public } from '../auth/auth.guard.js';
import type { moodboards } from '../generated/prisma/client.js';
import { attachMembers, toPhotoResponse } from '../photo/photo.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';

const MAX_BOARDS = 30;
const MAX_ITEMS = 500;
const NAME_MAX = 50;

function cleanName(raw: unknown): string {
  const name = raw == null ? '' : String(raw).replace(/<[^>]*>/g, '').trim();
  if (name === '') throw AppError.status(400, '보드 이름을 입력해 주세요.');
  if (name.length > NAME_MAX) throw AppError.status(400, '보드 이름은 50자 이내로 입력해 주세요.');
  return name;
}

/** Spring MoodboardController 1:1 — 래퍼 없는 JSON, 남의 보드는 404. 공유 보기(`/shared/{token}`)만 공개 */
@Controller('api/moodboards')
export class MoodboardController {
  constructor(private readonly prisma: PrismaService) {}

  private async myBoard(id: number, me: number): Promise<moodboards> {
    const b = await this.prisma.moodboards.findFirst({ where: { id: BigInt(id), member_id: BigInt(me) } });
    if (!b) throw AppError.status(404, '보드를 찾을 수 없습니다.');
    return b;
  }

  /** 담긴 사진(최근 담은 순), 지워진 사진은 건너뜀 */
  private async boardPhotos(boardId: bigint) {
    const items = await this.prisma.moodboard_items.findMany({ where: { moodboard_id: boardId }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] });
    const photos = await this.prisma.photos.findMany({ where: { id: { in: items.map((i) => i.photo_id) } } });
    const byId = new Map(photos.map((p) => [p.id, p]));
    return items.flatMap((i) => (byId.has(i.photo_id) ? [toPhotoResponse(byId.get(i.photo_id)!)] : []));
  }

  @Get()
  async myBoards(@Query('photoId') photoIdRaw: string | undefined, @CurrentUser() user: AuthUser) {
    const photoId = optionalLong(photoIdRaw, 'photoId');
    const boards = await this.prisma.moodboards.findMany({ where: { member_id: BigInt(user.id) }, orderBy: [{ updated_at: 'desc' }, { id: 'desc' }] });
    const items = boards.length === 0 ? [] : await this.prisma.moodboard_items.findMany({
      where: { moodboard_id: { in: boards.map((b) => b.id) } }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    const byBoard = new Map<bigint, typeof items>();
    for (const i of items) byBoard.set(i.moodboard_id, [...(byBoard.get(i.moodboard_id) ?? []), i]);
    const previewIds = [...byBoard.values()].flatMap((list) => list.slice(0, 3).map((i) => i.photo_id));
    const photos = await this.prisma.photos.findMany({ where: { id: { in: previewIds } }, select: { id: true, thumbnail_url: true, image_url: true } });
    const thumbs = new Map(photos.map((p) => [p.id, p.thumbnail_url ?? p.image_url]));
    return boards.map((b) => {
      const list = byBoard.get(b.id) ?? [];
      const m: Record<string, unknown> = {
        id: Number(b.id), name: b.name, itemCount: list.length,
        previewPhotos: list.slice(0, 3).flatMap((i) => (thumbs.has(i.photo_id) ? [thumbs.get(i.photo_id)] : [])),
      };
      if (photoId != null) m.containsPhoto = list.some((i) => Number(i.photo_id) === photoId);
      m.updatedAt = localDateTime(b.updated_at);
      return m;
    });
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: Record<string, unknown> | undefined, @CurrentUser() user: AuthUser) {
    const name = cleanName(body?.name);
    if ((await this.prisma.moodboards.count({ where: { member_id: BigInt(user.id) } })) >= MAX_BOARDS) {
      throw AppError.status(400, '보드는 최대 30개까지 만들 수 있어요.');
    }
    const t = now();
    const saved = await this.prisma.moodboards.create({ data: { member_id: BigInt(user.id), name, created_at: t, updated_at: t } });
    return { id: Number(saved.id), name: saved.name };
  }

  @Public()
  @Get('shared/:token')
  async shared(@Param('token') token: string) {
    const b = token.length !== 32 ? null : await this.prisma.moodboards.findUnique({ where: { share_token: token } });
    if (!b) throw AppError.status(404, '공유가 끝났거나 없는 보드예요.');
    const photos = await attachMembers(this.prisma, await this.boardPhotos(b.id));
    const owner = await this.prisma.members.findUnique({ where: { id: b.member_id }, select: { name: true } });
    return { name: b.name, ownerName: owner?.name ?? null, photos };
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const b = await this.myBoard(id, user.id);
    return { id: Number(b.id), name: b.name, shareToken: b.share_token, photos: await this.boardPhotos(b.id) };
  }

  /** {"enabled":true} → 토큰 발급(있으면 유지), false → 삭제(이전 링크 즉시 무효) */
  @Put(':id/share')
  async share(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown> | undefined, @CurrentUser() user: AuthUser) {
    const b = await this.myBoard(id, user.id);
    const enabled = body?.enabled === true;
    let token = b.share_token;
    if (enabled && token == null) token = randomUUID().replace(/-/g, '');
    else if (!enabled) token = null;
    if (token !== b.share_token) await this.prisma.moodboards.update({ where: { id: b.id }, data: { share_token: token, updated_at: now() } });
    return { id: Number(b.id), shareToken: token };
  }

  @Put(':id')
  async rename(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown> | undefined, @CurrentUser() user: AuthUser) {
    const b = await this.myBoard(id, user.id);
    const name = cleanName(body?.name);
    if (name !== b.name) await this.prisma.moodboards.update({ where: { id: b.id }, data: { name, updated_at: now() } });
    return { id: Number(b.id), name };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const b = await this.myBoard(id, user.id);
    await this.prisma.$transaction([
      this.prisma.moodboard_items.deleteMany({ where: { moodboard_id: b.id } }),
      this.prisma.moodboards.delete({ where: { id: b.id } }),
    ]);
  }

  /** 멱등 — 이미 담겨 있으면 그대로 성공. 새로 담으면 보드 updated_at 갱신(최근 사용 보드가 위로) */
  @Post(':id/photos')
  @HttpCode(200)
  async addPhoto(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown> | undefined, @CurrentUser() user: AuthUser) {
    const b = await this.myBoard(id, user.id);
    const raw = body?.photoId;
    if (typeof raw !== 'number') throw AppError.status(400, 'photoId가 필요합니다.');
    const photoId = Math.trunc(raw);
    if (!(await this.prisma.photos.findUnique({ where: { id: BigInt(photoId) }, select: { id: true } }))) throw AppError.status(404, '사진을 찾을 수 없습니다.');
    const key = { moodboard_id: b.id, photo_id: BigInt(photoId) };
    if ((await this.prisma.moodboard_items.count({ where: key })) === 0) {
      if ((await this.prisma.moodboard_items.count({ where: { moodboard_id: b.id } })) >= MAX_ITEMS) {
        throw AppError.status(400, '보드 하나에는 사진을 500장까지 담을 수 있어요.');
      }
      await this.prisma.moodboard_items.createMany({ data: [{ ...key, created_at: now() }], skipDuplicates: true });
      await this.prisma.moodboards.update({ where: { id: b.id }, data: { updated_at: now() } });
    }
    return { moodboardId: id, photoId, contains: true };
  }

  @Delete(':id/photos/:photoId')
  async removePhoto(@Param('id', ParseIntPipe) id: number, @Param('photoId', ParseIntPipe) photoId: number, @CurrentUser() user: AuthUser) {
    const b = await this.myBoard(id, user.id);
    await this.prisma.moodboard_items.deleteMany({ where: { moodboard_id: b.id, photo_id: BigInt(photoId) } });
    return { moodboardId: id, photoId, contains: false };
  }
}
