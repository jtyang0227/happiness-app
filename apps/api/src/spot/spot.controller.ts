import { Body, Controller, Delete, Get, HttpCode, Logger, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { spots } from '../generated/prisma/client.js';
import { AuthUser, CurrentUser, Public, isAdmin } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { isBlank, javaTrim } from '../common/json-body.js';
import { localDateTime, now } from '../common/time.js';
import { attachMembers, toPhotoResponse } from '../photo/photo.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Body_ = Record<string, unknown> | undefined;
const DUPLICATE_RADIUS_M = 200;
const SAME_PLACE_RADIUS_M = 50;
const DAILY_CREATE_LIMIT = 20;
const PREVIEW_COUNT = 3;
const bad = (m: string) => AppError.status(400, m);
const notFound = () => AppError.status(404, '스팟을 찾을 수 없습니다.');

/** Java Object.toString — 숫자·불리언은 글자로 */
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Java Double.parseDouble — 앞뒤 공백 허용, NaN·Infinity, 끝의 d/f */
function parseDouble(s: string): number | null {
  const t = javaTrim(s);
  if (/^[+-]?(NaN|Infinity)$/.test(t)) return t.includes('NaN') ? NaN : (t.startsWith('-') ? -Infinity : Infinity);
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?[fFdD]?$/.test(t)) return null;
  return Number(t.replace(/[fFdD]$/, ''));
}

/** `@RequestParam Double` — 숫자가 아니면 500 */
function doubleParam(v: string | undefined, name: string): number | null {
  if (v == null || v === '') return null;
  const n = parseDouble(v);
  if (n == null) throw new Error(`Failed to convert ${name}: ${v}`);
  return n;
}

function intParam(v: string | undefined, def: number, name: string) {
  if (v == null) return def;
  const t = v.trim();
  if (!/^[+-]?\d+$/.test(t) || Math.abs(Number(t)) > 2147483647) throw new Error(`Failed to convert ${name}: ${v}`);
  return Number(t);
}

function clean(raw: unknown, max: number, label: string, required: boolean): string | null {
  const v = raw == null ? '' : javaTrim(str(raw).replace(/<[^>]*>/g, ''));
  if (v === '') {
    if (required) throw bad(`${label}을(를) 입력해 주세요.`);
    return null;
  }
  if (v.length > max) throw bad(`${label}은(는) ${max}자 이내로 입력해 주세요.`);
  return v;
}

function coord(raw: unknown, min: number, max: number, label: string): number {
  if (raw == null) throw bad(`${label} 좌표가 필요합니다.`);
  const v = typeof raw === 'number' ? raw : parseDouble(str(raw));
  if (v == null) throw bad(`${label} 좌표가 올바르지 않습니다.`);
  if (Number.isNaN(v) || v < min || v > max) throw bad(`${label} 좌표가 범위를 벗어났습니다.`);
  return v;
}

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

const norm = (s: string | null) => (s == null ? '' : s.replace(/[ \t\n\u000B\f\r]+/g, '').toLowerCase());
function lowerOrNull(s: string | undefined) {
  if (s == null || isBlank(s)) return null;
  const t = javaTrim(s).toLowerCase();
  return t.length > 30 ? t.slice(0, 30) : t;
}

const summary = (s: spots, photoCount: number, previews: string[]) => ({
  id: Number(s.id), name: s.name, lat: s.lat, lng: s.lng, address: s.address, region: s.region, bestTime: s.best_time, photoCount, previewPhotos: previews,
});

/** Spring SpotController — 래퍼 없는 JSON. 목록·상세·중복 확인·사진의 스팟은 공개 */
@Controller('api')
export class SpotController {
  private readonly log = new Logger('SpotController');
  constructor(private readonly prisma: PrismaService) {}

  private async find(id: number | bigint) {
    const s = await this.prisma.spots.findUnique({ where: { id: BigInt(id) } });
    if (!s) throw notFound();
    return s;
  }

  private canEdit(s: spots, user?: AuthUser) {
    return user != null && (isAdmin(user) || Number(s.created_by) === user.id);
  }

  /** [spotId, photoId] — 공개 프로필 작가 사진만, 최신순 */
  private publicPhotoIds(spotIds: bigint[]) {
    return this.prisma.$queryRaw<{ spot_id: bigint; photo_id: bigint }[]>(Prisma.sql`
      SELECT ps.spot_id, p.id AS photo_id FROM photo_spots ps JOIN photos p ON ps.photo_id = p.id JOIN members m ON p.member_id = m.id
      WHERE m.public_profile = true AND ps.spot_id IN (${Prisma.join(spotIds)}) ORDER BY p.created_at DESC, p.id DESC`);
  }

  @Public()
  @Get('spots')
  async list(@Query('minLat') minLatQ?: string, @Query('maxLat') maxLatQ?: string, @Query('minLng') minLngQ?: string, @Query('maxLng') maxLngQ?: string,
    @Query('region') regionQ?: string, @Query('q') qQ?: string, @Query('page') pageQ?: string, @Query('size') sizeQ?: string) {
    const [minLat, maxLat, minLng, maxLng] = [doubleParam(minLatQ, 'minLat'), doubleParam(maxLatQ, 'maxLat'), doubleParam(minLngQ, 'minLng'), doubleParam(maxLngQ, 'maxLng')];
    const page = Math.max(intParam(pageQ, 0, 'page'), 0);
    const size = Math.max(1, Math.min(intParam(sizeQ, 30, 'size'), 100));
    const bounded = minLat != null && maxLat != null && minLng != null && maxLng != null;
    const region = lowerOrNull(regionQ);
    const q = lowerOrNull(qQ);
    const conds: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (bounded) conds.push(Prisma.sql`lat >= ${minLat} AND lat <= ${maxLat} AND lng >= ${minLng} AND lng <= ${maxLng}`);
    if (region != null) conds.push(Prisma.sql`(LOWER(region) LIKE ('%' || ${region} || '%') OR LOWER(address) LIKE ('%' || ${region} || '%'))`);
    if (q != null) conds.push(Prisma.sql`LOWER(name) LIKE ('%' || ${q} || '%')`);
    const rows = await this.prisma.$queryRaw<spots[]>(Prisma.sql`
      SELECT * FROM spots WHERE ${Prisma.join(conds, ' AND ')} ORDER BY updated_at DESC, id DESC LIMIT ${size + 1} OFFSET ${page * size}`);
    const hasNext = rows.length > size;
    const list = rows.slice(0, size);
    const counts = new Map<bigint, number>();
    const previewIds = new Map<bigint, bigint[]>();
    if (list.length) {
      for (const r of await this.publicPhotoIds(list.map((s) => s.id))) {
        counts.set(r.spot_id, (counts.get(r.spot_id) ?? 0) + 1);
        const arr = previewIds.get(r.spot_id) ?? [];
        if (arr.length < PREVIEW_COUNT) arr.push(r.photo_id);
        previewIds.set(r.spot_id, arr);
      }
    }
    const allIds = [...previewIds.values()].flat();
    const thumbs = new Map((allIds.length ? await this.prisma.photos.findMany({ where: { id: { in: allIds } }, select: { id: true, thumbnail_url: true, image_url: true } }) : [])
      .map((p) => [p.id, p.thumbnail_url ?? p.image_url]));
    return {
      data: list.map((s) => summary(s, counts.get(s.id) ?? 0, (previewIds.get(s.id) ?? []).flatMap((id) => (thumbs.get(id) != null ? [thumbs.get(id)!] : [])))),
      page, size, hasNext,
    };
  }

  @Public()
  @Get('spots/nearby-duplicate')
  nearby(@Query('name') name: string | undefined, @Query('lat') latQ: string | undefined, @Query('lng') lngQ: string | undefined) {
    if (latQ == null) throw new Error('Required request parameter lat is not present');
    if (lngQ == null) throw new Error('Required request parameter lng is not present');
    const lat = coord(doubleParam(latQ, 'lat'), -90, 90, '위도');
    const lng = coord(doubleParam(lngQ, 'lng'), -180, 180, '경도');
    return this.duplicates(name ?? null, lat, lng);
  }

  private async duplicates(name: string | null, lat: number, lng: number) {
    const dLat = DUPLICATE_RADIUS_M / 111_000.0;
    const dLng = DUPLICATE_RADIUS_M / (111_000.0 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
    const n = norm(name);
    const box = await this.prisma.spots.findMany({ where: { lat: { gte: lat - dLat, lte: lat + dLat }, lng: { gte: lng - dLng, lte: lng + dLng } }, orderBy: { id: 'asc' } });
    const out: { id: number; name: string; region: string | null; distanceM: number }[] = [];
    for (const s of box) {
      const d = distanceM(lat, lng, s.lat, s.lng);
      const sn = norm(s.name);
      const overlap = n !== '' && (sn.includes(n) || n.includes(sn));
      if (d <= SAME_PLACE_RADIUS_M || (d <= DUPLICATE_RADIUS_M && overlap)) out.push({ id: Number(s.id), name: s.name, region: s.region, distanceM: Math.round(d) });
    }
    out.sort((a, b) => a.distanceM - b.distanceM);
    return out.slice(0, 5);
  }

  @Public()
  @Get('spots/:id')
  async detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: AuthUser) {
    const s = await this.find(id);
    const ids = (await this.publicPhotoIds([s.id])).map((r) => r.photo_id);
    const rows = ids.length ? await this.prisma.photos.findMany({ where: { id: { in: ids } } }) : [];
    const byId = new Map(rows.map((p) => [p.id, p]));
    const photos = await attachMembers(this.prisma, ids.flatMap((pid) => (byId.has(pid) ? [toPhotoResponse(byId.get(pid)!)] : [])));
    const creator = await this.prisma.members.findUnique({ where: { id: s.created_by }, select: { name: true } });
    return {
      ...summary(s, photos.length, photos.slice(0, 5).map((p) => (p.thumbnailUrl ?? p.imageUrl) as string)),
      tips: s.tips, createdBy: Number(s.created_by), createdByName: creator?.name ?? null, canEdit: this.canEdit(s, user), photos,
      updatedAt: localDateTime(s.updated_at),
    };
  }

  @Public()
  @Get('photos/:photoId/spot')
  async photoSpot(@Param('photoId', ParseIntPipe) photoId: number) {
    const link = await this.prisma.photo_spots.findFirst({ where: { photo_id: BigInt(photoId) } });
    const s = link ? await this.prisma.spots.findUnique({ where: { id: link.spot_id } }) : null;
    return { data: s ? summary(s, 0, []) : null };
  }

  private apply(body: Record<string, unknown>, creating: boolean) {
    const d: Partial<spots> = {};
    if (creating || 'name' in body) d.name = clean(body.name, 50, '스팟 이름', true)!;
    if (creating || 'lat' in body) d.lat = coord(body.lat, -90, 90, '위도');
    if (creating || 'lng' in body) d.lng = coord(body.lng, -180, 180, '경도');
    if ('address' in body) d.address = clean(body.address, 200, '주소', false);
    if ('region' in body) d.region = clean(body.region, 30, '지역', false);
    if ('bestTime' in body) d.best_time = clean(body.bestTime, 30, '찍기 좋은 시간', false);
    if ('tips' in body) d.tips = clean(body.tips, 1000, '팁', false);
    return d;
  }

  @Post('spots')
  @HttpCode(201)
  async create(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    const since = new Date(Date.now() - 86400000);
    if (await this.prisma.spots.count({ where: { created_by: BigInt(user.id), created_at: { gt: since } } }) >= DAILY_CREATE_LIMIT) {
      throw AppError.status(429, '스팟은 하루 20개까지 만들 수 있어요.');
    }
    const d = this.apply(body ?? {}, true);
    const t = now();
    const s = await this.prisma.spots.create({ data: { ...(d as Required<Pick<spots, 'name' | 'lat' | 'lng'>>), ...d, created_by: BigInt(user.id), created_at: t, updated_at: t } });
    this.log.log(`[spot] created id=${s.id} by member=${user.id}`);
    return summary(s, 0, []);
  }

  @Put('spots/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const s = await this.find(id);
    if (!this.canEdit(s, user)) throw AppError.status(403, '스팟을 만든 사람만 수정할 수 있어요.');
    const d = this.apply(body ?? {}, false);
    const changed = Object.entries(d).some(([k, v]) => (s as Record<string, unknown>)[k] !== v);
    return summary(changed ? await this.prisma.spots.update({ where: { id: s.id }, data: { ...d, updated_at: now() } }) : s, 0, []);
  }

  @Delete('spots/:id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const s = await this.find(id);
    if (!this.canEdit(s, user)) throw AppError.status(403, '스팟을 만든 사람만 삭제할 수 있어요.');
    await this.prisma.$transaction([
      this.prisma.photo_spots.deleteMany({ where: { spot_id: s.id } }),
      this.prisma.spots.delete({ where: { id: s.id } }),
    ]);
    this.log.log(`[spot] deleted id=${id} by member=${user.id}`);
  }

  @Put('photos/:photoId/spot')
  async setPhotoSpot(@Param('photoId', ParseIntPipe) photoId: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const photo = await this.prisma.photos.findUnique({ where: { id: BigInt(photoId) }, select: { member_id: true } });
    if (!photo) throw AppError.status(404, '사진을 찾을 수 없습니다.');
    if (!isAdmin(user) && Number(photo.member_id) !== user.id) throw AppError.status(403, '본인 사진에만 스팟을 연결할 수 있어요.');
    const raw = (body ?? {}).spotId;
    if (raw == null || isBlank(str(raw))) {
      await this.prisma.photo_spots.deleteMany({ where: { photo_id: BigInt(photoId) } });
      return { data: null };
    }
    let spotId: number;
    if (typeof raw === 'number') spotId = Math.trunc(raw);
    else {
      if (!/^[+-]?\d+$/.test(str(raw))) throw bad('스팟 id가 올바르지 않습니다.');
      spotId = Number(str(raw));
    }
    const s = await this.find(spotId);
    const link = await this.prisma.photo_spots.findFirst({ where: { photo_id: BigInt(photoId) } });
    if (!link) await this.prisma.photo_spots.create({ data: { photo_id: BigInt(photoId), spot_id: s.id, created_at: now() } });
    else if (link.spot_id !== s.id) await this.prisma.photo_spots.update({ where: { id: link.id }, data: { spot_id: s.id } });
    return { data: summary(s, 0, []) };
  }
}
