import { localDateTime } from '../common/time.js';
import type { photos } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Spring ImageVariantUtil.deriveUrl — `_1024.`가 든 주소만 크기별 주소로 바꾼다 */
export function deriveUrl(url: string | null, size: number): string | null {
  if (url == null || !url.includes('_1024.')) return url;
  return url.replace('_1024.', `_${size}.`);
}

/** '["FASHION","LIFESTYLE"]' → ['FASHION','LIFESTYLE'] (Spring parseSubGenres, 중복 그대로) */
export function parseSubGenres(raw: string | null): string[] {
  if (raw == null || raw.trim() === '') return [];
  const cleaned = raw.trim().replace(/[[\]"\s]/g, '');
  return cleaned === '' ? [] : cleaned.split(',');
}

/** Spring PhotoResponse — Lombok isLiked/isSaved라 JSON 키는 liked·saved, tags는 목록 응답에서 null */
export function toPhotoResponse(p: photos) {
  return {
    id: Number(p.id),
    memberId: Number(p.member_id),
    memberName: null as string | null,
    memberAvatarUrl: null as string | null,
    memberProfileName: null as string | null,
    title: p.title,
    imageUrl: p.image_url,
    thumbnailUrl: p.thumbnail_url,
    imageUrl512: deriveUrl(p.image_url, 512),
    imageUrl128: deriveUrl(p.image_url, 128),
    description: p.description,
    imageRatio: p.image_ratio,
    likesCount: p.likes_count,
    savesCount: p.saves_count,
    sharesCount: p.shares_count,
    gridColSpan: p.grid_col_span ?? 6,
    dominantColor: p.dominant_color,
    colorMood: p.color_mood,
    colorPalette: p.color_palette,
    displayOrder: p.display_order,
    tags: null,
    cameraModel: p.camera_model,
    lensModel: p.lens_model,
    aperture: p.aperture,
    shutterSpeed: p.shutter_speed,
    iso: p.iso,
    focalLength: p.focal_length,
    genre: p.genre,
    subGenres: parseSubGenres(p.sub_genres),
    panType: p.pan_type ?? 'EDITORIAL',
    magazineCaption: p.magazine_caption,
    imageRight: p.image_right ?? false,
    createdAt: localDateTime(p.created_at),
    updatedAt: localDateTime(p.updated_at),
    liked: false,
    saved: false,
  };
}

export type PhotoResponse = ReturnType<typeof toPhotoResponse>;

/** 작성자 이름·아바타·프로필명을 한 번에 채운다(N+1 방지) — 없는 회원이면 null 그대로 */
export async function attachMembers(prisma: PrismaService, list: PhotoResponse[]) {
  const ids = [...new Set(list.map((p) => BigInt(p.memberId)))];
  if (ids.length === 0) return list;
  const members = await prisma.members.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, avatar_url: true, profile_name: true } });
  const byId = new Map(members.map((m) => [Number(m.id), m]));
  for (const p of list) {
    const m = byId.get(p.memberId);
    if (!m) continue;
    p.memberName = m.name;
    p.memberAvatarUrl = m.avatar_url;
    p.memberProfileName = m.profile_name;
  }
  return list;
}

/** PhotoController.errorResponse — {status:'error', message} */
export const photoError = (message: string) => ({ message, status: 'error' });
