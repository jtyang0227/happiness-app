import { Body, Controller, Delete, Get, HttpCode, Logger, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { AuthUser, CurrentUser, Public } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { isBlank, jsonLong, jsonPrimitiveInt, jsonString } from '../common/json-body.js';
import { localDateTime, now } from '../common/time.js';
import type { delivery_sets } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SharedLimitService } from '../common/shared-limit.service.js';

type Body_ = Record<string, unknown> | undefined;

const MAX_FEEDBACK = 2000;
const MAX_ATTEMPTS = 5;
const BLOCK_SECONDS = 15 * 60;
const forbidden = () => AppError.status(403, '접근 권한이 없습니다');

/** List<Long> 필드 — 배열이 아니면 실패 */
function jsonLongList(v: unknown, name: string): number[] | null {
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v)) throw new Error(`Cannot deserialize ${name}`);
  return v.map((x) => {
    const n = jsonLong(x, name);
    if (n == null) throw new Error(`${name} contains null`);
    return n;
  });
}

function toResponse(s: delivery_sets, photoCount: number, likedCount: number) {
  return {
    id: Number(s.id), token: s.token, title: s.title, clientName: s.client_name, status: s.status,
    expiresAt: localDateTime(s.expires_at), createdAt: localDateTime(s.created_at), photoCount, likedCount, feedback: s.feedback,
    viewedAt: localDateTime(s.viewed_at), approvedAt: localDateTime(s.approved_at), hasPassword: s.password_hash != null,
  };
}

/** Spring DeliverySetController/Service — 토큰 경로는 공개(비밀번호 세트는 본문 password, 토큰당 5회 실패 시 15분 차단) */
@Controller('api/delivery')
export class DeliveryController {
  private readonly log = new Logger('DeliverySetService');
  constructor(private readonly prisma: PrismaService, private readonly limits: SharedLimitService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const title = jsonString(b.title, 'title');
    const clientName = jsonString(b.clientName, 'clientName');
    const photoIds = jsonLongList(b.photoIds, 'photoIds');
    const days = Math.max(1, Math.min(90, jsonPrimitiveInt(b.expiresInDays, 'expiresInDays')));
    const password = jsonString(b.password, 'password');
    if (title == null) throw new Error('not-null property references a null value: title');
    const expires = now();
    expires.setUTCDate(expires.getUTCDate() + days);
    const set = await this.prisma.$transaction(async (tx) => {
      const s = await tx.delivery_sets.create({ data: {
        member_id: BigInt(user.id), token: randomUUID().replaceAll('-', ''), title, client_name: clientName, status: 'PENDING',
        password_hash: password != null && !isBlank(password) ? await bcrypt.hash(password, 10) : null, expires_at: expires, created_at: now(),
      } });
      if (photoIds?.length) {
        // Hibernate merge — 같은 사진이 두 번 오면 한 행, 순서는 마지막 위치
        const order = new Map<number, number>();
        photoIds.forEach((id, i) => order.set(id, i));
        await tx.delivery_set_photos.createMany({ data: [...order].map(([photoId, i]) => ({ delivery_set_id: s.id, photo_id: BigInt(photoId), sort_order: i, liked: false })) });
      }
      return s;
    });
    return toResponse(set, photoIds?.length ?? 0, 0);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const sets = await this.prisma.delivery_sets.findMany({ where: { member_id: BigInt(user.id) }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] });
    const ids = sets.map((s) => s.id);
    const [all, liked] = ids.length ? await Promise.all([
      this.prisma.delivery_set_photos.groupBy({ by: ['delivery_set_id'], where: { delivery_set_id: { in: ids } }, _count: { _all: true } }),
      this.prisma.delivery_set_photos.groupBy({ by: ['delivery_set_id'], where: { delivery_set_id: { in: ids }, liked: true }, _count: { _all: true } }),
    ]) : [[], []];
    const count = new Map(all.map((g) => [g.delivery_set_id, g._count._all]));
    const likedCount = new Map(liked.map((g) => [g.delivery_set_id, g._count._all]));
    return sets.map((s) => toResponse(s, count.get(s.id) ?? 0, likedCount.get(s.id) ?? 0));
  }

  private async byToken(token: string) {
    const s = await this.prisma.delivery_sets.findUnique({ where: { token } });
    if (!s) throw AppError.status(404, '배달 세트를 찾을 수 없습니다');
    if (Date.now() > s.expires_at.getTime()) throw AppError.status(410, '링크가 만료되었습니다');
    return s;
  }

  private async verifyPassword(s: delivery_sets, token: string, password: string | null) {
    if (s.password_hash == null) return;
    const key = `delivery:${token}`;
    if ((await this.limits.lockedMs(key)) > 0) throw AppError.status(429, '너무 많은 시도로 잠시 차단되었습니다. 15분 후 다시 시도해주세요.');
    if (password == null || !(await bcrypt.compare(password, s.password_hash))) {
      await this.limits.failure(key, MAX_ATTEMPTS, BLOCK_SECONDS * 1000);
      throw AppError.status(401, '비밀번호가 올바르지 않습니다');
    }
    await this.limits.clear(key);
  }

  private async detail(token: string, password: string | null) {
    const s = await this.byToken(token);
    await this.verifyPassword(s, token, password);
    const sps = await this.prisma.delivery_set_photos.findMany({ where: { delivery_set_id: s.id }, orderBy: [{ sort_order: 'asc' }, { photo_id: 'asc' }] });
    const photos = sps.length ? await this.prisma.photos.findMany({ where: { id: { in: sps.map((p) => p.photo_id) } }, select: { id: true, image_url: true, thumbnail_url: true, title: true } }) : [];
    const byId = new Map(photos.map((p) => [p.id, p]));
    return {
      id: Number(s.id), token: s.token, title: s.title, clientName: s.client_name, status: s.status, feedback: s.feedback,
      expiresAt: localDateTime(s.expires_at),
      photos: sps.map((sp) => {
        const p = byId.get(sp.photo_id);
        return { id: Number(sp.photo_id), imageUrl: p?.image_url ?? null, thumbnailUrl: p?.thumbnail_url ?? null, title: p?.title ?? null, liked: sp.liked, sortOrder: sp.sort_order };
      }),
    };
  }

  @Public()
  @Get(':token')
  get(@Param('token') token: string) {
    return this.detail(token, null);
  }

  @Public()
  @Post(':token')
  @HttpCode(200)
  getWithPassword(@Param('token') token: string, @Body() body: Body_) {
    return this.detail(token, jsonString(body?.password, 'password'));
  }

  @Public()
  @Put(':token/view')
  @HttpCode(204)
  async view(@Param('token') token: string) {
    const s = await this.prisma.delivery_sets.findUnique({ where: { token }, select: { id: true, viewed_at: true } });
    if (s && s.viewed_at == null) await this.prisma.delivery_sets.update({ where: { id: s.id }, data: { viewed_at: now() } });
  }

  private readAction(body: Body_) {
    const b = body ?? {};
    return { likedPhotoIds: jsonLongList(b.likedPhotoIds, 'likedPhotoIds'), feedback: jsonString(b.feedback, 'feedback'), password: jsonString(b.password, 'password') };
  }

  private validateFeedback(f: string | null) {
    if (f != null && f.length > MAX_FEEDBACK) throw AppError.status(400, `의견은 ${MAX_FEEDBACK}자 이하로 적어 주세요`);
  }

  @Public()
  @Put(':token/approve')
  @HttpCode(204)
  async approve(@Param('token') token: string, @Body() body: Body_) {
    const req = this.readAction(body);
    const s = await this.byToken(token);
    await this.verifyPassword(s, token, req.password);
    this.validateFeedback(req.feedback);
    await this.prisma.$transaction(async (tx) => {
      if (req.likedPhotoIds?.length) {
        const ids = req.likedPhotoIds.map(BigInt);
        await tx.delivery_set_photos.updateMany({ where: { delivery_set_id: s.id, photo_id: { in: ids } }, data: { liked: true } });
        await tx.delivery_set_photos.updateMany({ where: { delivery_set_id: s.id, photo_id: { notIn: ids } }, data: { liked: false } });
      }
      await tx.delivery_sets.update({ where: { id: s.id }, data: { status: 'APPROVED', approved_at: now(), feedback: req.feedback } });
    });
  }

  @Public()
  @Put(':token/reject')
  @HttpCode(204)
  async reject(@Param('token') token: string, @Body() body: Body_) {
    const req = this.readAction(body);
    const s = await this.byToken(token);
    await this.verifyPassword(s, token, req.password);
    this.validateFeedback(req.feedback);
    if (s.status !== 'REJECTED' || s.feedback !== req.feedback) {
      await this.prisma.delivery_sets.update({ where: { id: s.id }, data: { status: 'REJECTED', feedback: req.feedback } });
    }
  }

  @Get(':id/selections')
  async selections(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    if (!(await this.prisma.delivery_sets.findFirst({ where: { id: BigInt(id), member_id: BigInt(user.id) }, select: { id: true } }))) throw forbidden();
    const liked = await this.prisma.delivery_set_photos.findMany({ where: { delivery_set_id: BigInt(id), liked: true }, orderBy: [{ sort_order: 'asc' }, { photo_id: 'asc' }] });
    if (!liked.length) return [];
    const photos = await this.prisma.photos.findMany({ where: { id: { in: liked.map((l) => l.photo_id) } }, select: { id: true, thumbnail_url: true, image_url: true, title: true } });
    const byId = new Map(photos.map((p) => [p.id, p]));
    return liked.map((l) => {
      const p = byId.get(l.photo_id);
      return { id: Number(l.photo_id), thumbnailUrl: p?.thumbnail_url ?? null, imageUrl: p?.image_url ?? null, title: p?.title ?? null };
    });
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const s = await this.prisma.delivery_sets.findFirst({ where: { id: BigInt(id), member_id: BigInt(user.id) }, select: { id: true } });
    if (!s) throw forbidden();
    await this.prisma.$transaction([
      this.prisma.delivery_set_photos.deleteMany({ where: { delivery_set_id: s.id } }),
      this.prisma.delivery_sets.delete({ where: { id: s.id } }),
    ]);
  }
}
