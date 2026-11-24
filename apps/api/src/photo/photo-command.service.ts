import { Injectable } from '@nestjs/common';
import { RawBodyError } from '../common/raw-body-error.js';
import type { Prisma, photos } from '../generated/prisma/client.js';
import { now } from '../common/time.js';
import { AuthUser, isAdmin } from '../auth/auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { photoError, toPhotoResponse } from './photo.mapper.js';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../storage/storage.service.js';
import { SIZES, VariantInputError, prepareVariants } from './image-variants.js';

export interface PhotoRequest {
  memberId?: number | null; title?: string | null; imageUrl?: string | null; description?: string | null; imageRatio?: string | null;
  gridColSpan?: number | null; colorMood?: string | null; cameraModel?: string | null; lensModel?: string | null; aperture?: string | null;
  shutterSpeed?: string | null; iso?: number | null; focalLength?: string | null; genre?: string | null; subGenres?: string | null;
  panType?: string | null; magazineCaption?: string | null; imageRight?: boolean | null;
}

/** PhotoController.errorResponse와 같은 본문·상태로 응답을 끝낸다(전역 필터를 거치지 않음) */
export class PhotoHttpError extends RawBodyError {
  constructor(status: number, message: string) {
    super(status, photoError(message));
  }
}

const ok = (message: string, data?: unknown) => (data === undefined ? { message, status: 'success' } : { data, message, status: 'success' });
const blank = (s?: string | null) => s == null || s.trim() === '';

/** Spring PhotoController 쓰기 경로 1:1 (삭제·업로드·AI 태그 제외) */
@Injectable()
export class PhotoCommandService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private selfOrAdmin(user: AuthUser, ownerId: number | bigint) {
    return user.id === Number(ownerId) || isAdmin(user);
  }

  private async photoOr404(id: number): Promise<photos> {
    const p = await this.prisma.photos.findUnique({ where: { id: BigInt(id) } });
    if (!p) throw new PhotoHttpError(404, '사진을 찾을 수 없습니다.');
    return p;
  }

  async create(req: PhotoRequest, user: AuthUser) {
    if (req.memberId == null) throw new PhotoHttpError(400, 'memberId는 필수입니다.');
    if (!this.selfOrAdmin(user, req.memberId)) throw new PhotoHttpError(403, '본인 명의로만 사진을 등록할 수 있습니다.');
    if (blank(req.title)) throw new PhotoHttpError(400, '사진 제목은 필수입니다.');
    if (blank(req.imageUrl)) throw new PhotoHttpError(400, '이미지 URL은 필수입니다.');
    const colSpan = req.gridColSpan != null && req.gridColSpan >= 1 && req.gridColSpan <= 12 ? req.gridColSpan : 6;
    const t = now();
    const saved = await this.prisma.photos.create({
      data: {
        member_id: BigInt(req.memberId), title: req.title!, image_url: req.imageUrl!, description: req.description ?? null,
        image_ratio: req.imageRatio ?? '1:1', grid_col_span: colSpan, color_mood: req.colorMood ?? null, genre: req.genre ?? null,
        sub_genres: req.subGenres ?? null, camera_model: req.cameraModel ?? null, lens_model: req.lensModel ?? null, aperture: req.aperture ?? null,
        shutter_speed: req.shutterSpeed ?? null, iso: req.iso ?? null, focal_length: req.focalLength ?? null,
        likes_count: 0, saves_count: 0, shares_count: 0, pan_type: req.panType ?? 'EDITORIAL', magazine_caption: req.magazineCaption ?? null,
        image_right: req.imageRight ?? false, created_at: t, updated_at: t,
      },
    });
    return ok('사진이 등록되었습니다.', toPhotoResponse(saved));
  }

  async update(id: number, req: PhotoRequest, user: AuthUser) {
    const p = await this.photoOr404(id);
    if (!this.selfOrAdmin(user, p.member_id)) throw new PhotoHttpError(403, '본인 사진만 수정할 수 있습니다.');
    const d: Prisma.photosUpdateInput = {};
    if (!blank(req.title)) d.title = req.title!;
    if (req.description != null) d.description = req.description;
    if (req.imageRatio != null) d.image_ratio = req.imageRatio;
    if (req.gridColSpan != null && req.gridColSpan >= 1 && req.gridColSpan <= 12) d.grid_col_span = req.gridColSpan;
    if (!blank(req.colorMood)) d.color_mood = req.colorMood!;
    if (req.genre != null) d.genre = req.genre.trim() === '' ? null : req.genre;
    if (req.subGenres != null) d.sub_genres = req.subGenres.trim() === '' ? null : req.subGenres;
    if (req.cameraModel != null) d.camera_model = req.cameraModel;
    if (req.lensModel != null) d.lens_model = req.lensModel;
    if (req.aperture != null) d.aperture = req.aperture;
    if (req.shutterSpeed != null) d.shutter_speed = req.shutterSpeed;
    if (req.iso != null) d.iso = req.iso;
    if (req.focalLength != null) d.focal_length = req.focalLength;
    if (!blank(req.panType)) d.pan_type = req.panType!;
    if (req.magazineCaption != null) d.magazine_caption = req.magazineCaption;
    if (req.imageRight != null) d.image_right = req.imageRight;
    return ok('사진이 수정되었습니다.', toPhotoResponse(await this.saveIfChanged(p, d)));
  }

  /** Hibernate @PreUpdate처럼 바뀐 값이 있을 때만 updated_at 갱신 */
  private async saveIfChanged(p: photos, d: Prisma.photosUpdateInput) {
    const changed = Object.entries(d).some(([k, v]) => (p as Record<string, unknown>)[k] !== v);
    return changed ? this.prisma.photos.update({ where: { id: p.id }, data: { ...d, updated_at: now() } }) : p;
  }

  async addTag(photoId: number, memberId: number, positionX: number | null, positionY: number | null, user: AuthUser) {
    const p = await this.photoOr404(photoId);
    if (!this.selfOrAdmin(user, p.member_id)) throw new PhotoHttpError(403, '내 사진에만 태그할 수 있습니다.');
    const m = await this.prisma.members.findUnique({ where: { id: BigInt(memberId) }, select: { name: true } });
    if (!m) throw new PhotoHttpError(404, '태그할 회원을 찾을 수 없습니다.');
    if (await this.prisma.photo_tags.count({ where: { photo_id: p.id, member_id: BigInt(memberId) } })) throw new PhotoHttpError(400, '이미 태그된 사용자입니다.');
    await this.prisma.photo_tags.create({ data: { photo_id: p.id, member_id: BigInt(memberId), member_name: m.name, positionx: positionX, positiony: positionY, created_at: now() } });
    return ok('사용자가 태그되었습니다.');
  }

  async removeTag(photoId: number, tagId: number, user: AuthUser) {
    const p = await this.prisma.photos.findUnique({ where: { id: BigInt(photoId) } });
    const tag = await this.prisma.photo_tags.findUnique({ where: { id: BigInt(tagId) } });
    if (!p || !tag || Number(tag.photo_id) !== photoId) throw new PhotoHttpError(404, '태그를 찾을 수 없습니다.');
    if (user.id !== Number(p.member_id) && user.id !== Number(tag.member_id) && !isAdmin(user)) throw new PhotoHttpError(403, '이 태그를 지울 권한이 없습니다.');
    await this.prisma.photo_tags.delete({ where: { id: tag.id } });
    return ok('태그가 제거되었습니다.');
  }

  /** 좋아요·저장 공통 — 기록 테이블 + 사진 카운터(+updated_at) */
  async toggle(kind: 'like' | 'save', on: boolean, photoId: number, memberId: number, user: AuthUser) {
    if (!this.selfOrAdmin(user, memberId)) throw new PhotoHttpError(403, '본인 계정으로만 할 수 있습니다.');
    const p = await this.photoOr404(photoId);
    const key = { photo_id: p.id, member_id: BigInt(memberId) };
    const table = (kind === 'like' ? this.prisma.photo_likes : this.prisma.photo_saves) as unknown as {
      count(a: object): Promise<number>; create(a: object): Promise<unknown>; deleteMany(a: object): Promise<unknown>;
    };
    const exists = (await table.count({ where: key })) > 0;
    const counter = kind === 'like' ? 'likes_count' : 'saves_count';
    const t = now();
    if (on) {
      if (exists) throw new PhotoHttpError(400, kind === 'like' ? '이미 좋아요한 사진입니다.' : '이미 저장한 사진입니다.');
      await table.create({ data: { ...key, created_at: t } });
      await this.prisma.photos.update({ where: { id: p.id }, data: { [counter]: { increment: 1 }, updated_at: t } });
      return ok(kind === 'like' ? '좋아요가 추가되었습니다.' : '사진이 저장되었습니다.');
    }
    if (!exists) throw new PhotoHttpError(400, kind === 'like' ? '좋아요 기록이 없습니다.' : '저장 기록이 없습니다.');
    await table.deleteMany({ where: key });
    await this.prisma.photos.update({ where: { id: p.id }, data: { [counter]: Math.max(0, p[counter] - 1), updated_at: t } });
    return ok(kind === 'like' ? '좋아요가 취소되었습니다.' : '저장이 취소되었습니다.');
  }

  async share(photoId: number, memberId: number, platform: string, user: AuthUser) {
    if (!this.selfOrAdmin(user, memberId)) throw new PhotoHttpError(403, '본인 계정으로만 할 수 있습니다.');
    const p = await this.photoOr404(photoId);
    const t = now();
    await this.prisma.photo_shares.create({ data: { photo_id: p.id, member_id: BigInt(memberId), platform, created_at: t } });
    await this.prisma.photos.update({ where: { id: p.id }, data: { shares_count: { increment: 1 }, updated_at: t } });
    return ok('사진이 공유되었습니다.');
  }

  /** 본인 사진(관리자는 모두)만 바꾸고 나머지·잘못된 항목은 조용히 건너뛴다 */
  async reorder(orders: unknown, user: AuthUser) {
    if (!Array.isArray(orders)) throw new Error('JSON parse error: expected array');
    for (const item of orders as Record<string, unknown>[]) {
      const id = item?.id, order = item?.displayOrder;
      if (typeof id !== 'number' || typeof order !== 'number') continue;
      const p = await this.prisma.photos.findUnique({ where: { id: BigInt(Math.trunc(id)) } });
      if (p && this.selfOrAdmin(user, p.member_id)) await this.saveIfChanged(p, { display_order: Math.trunc(order) });
    }
    return ok('순서가 저장되었습니다.');
  }

  /**
   * Spring uploadPhoto — 4단계 변형을 photos/{uuid}_{size}.{ext}로 올리고 1024=imageUrl, 256=thumbnailUrl.
   * 색 분위기는 요청 값이 있으면 그것, 없으면 분석값. 처리 중 오류는 500 {status:error, "사진 업로드 중 오류: …"}.
   */
  async upload(f: UploadForm, file: { buffer: Buffer; size: number; mimetype: string }, user: AuthUser) {
    if (!this.selfOrAdmin(user, f.memberId)) throw new PhotoHttpError(403, '본인 명의로만 사진을 등록할 수 있습니다.');
    try {
      const prep = await prepareVariants(file.buffer, file.size, file.mimetype);
      const uid = randomUUID();
      const urls = new Map<number, string>();
      for (const size of SIZES) {
        urls.set(size, await this.storage.uploadBytes(prep.variants.get(size)!, `photos/${uid}_${size}.${prep.ext}`, prep.contentType));
      }
      const colSpan = f.gridColSpan >= 1 && f.gridColSpan <= 12 ? f.gridColSpan : 6;
      const t = now();
      const saved = await this.prisma.photos.create({
        data: {
          member_id: BigInt(f.memberId), title: f.title, image_url: urls.get(1024)!, thumbnail_url: urls.get(256)!,
          description: f.description ?? null, image_ratio: f.imageRatio ?? '1:1', grid_col_span: colSpan,
          dominant_color: prep.dominantColor, color_mood: f.colorMood != null && f.colorMood.trim() !== '' ? f.colorMood : prep.colorMood,
          color_palette: prep.colorPalette, genre: f.genre ?? null, sub_genres: f.subGenres ?? null,
          likes_count: 0, saves_count: 0, shares_count: 0, pan_type: 'EDITORIAL', image_right: false, created_at: t, updated_at: t,
        },
      });
      return ok('사진이 업로드되었습니다.', toPhotoResponse(saved));
    } catch (e) {
      const msg = e instanceof VariantInputError ? e.message : (e as Error).message;
      throw new PhotoHttpError(500, `사진 업로드 중 오류: ${msg}`);
    }
  }
}

export interface UploadForm {
  memberId: number; title: string; description?: string; imageRatio?: string; gridColSpan: number;
  colorMood?: string; genre?: string; subGenres?: string;
}
