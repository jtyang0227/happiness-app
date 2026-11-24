import type { members } from '../generated/prisma/client.js';
import { localDateTime } from '../common/time.js';

/** Spring MemberResponse와 같은 키·순서·null 처리 */
export interface MemberResponse {
  id: number;
  email: string | null;
  name: string;
  tel: string | null;
  profileName: string | null;
  instagramId: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  websiteUrl: string | null;
  location: string | null;
  specialties: string | null;
  provider: string | null;
  publicProfile: boolean;
  emailNotifications: boolean;
  portfolioLayout: string | null;
  portfolioCoverPhotoId: number | null;
  status: string;
  authority: string;
  role: 'ADMIN' | 'USER';
  createdAt: string | null;
  updatedAt: string | null;
}

export function toMemberResponse(m: members): MemberResponse {
  return {
    id: Number(m.id),
    email: m.email,
    name: m.name,
    tel: m.tel,
    profileName: m.profile_name,
    instagramId: m.instagram_id,
    avatarUrl: m.avatar_url,
    coverUrl: m.cover_url,
    bio: m.bio,
    websiteUrl: m.website_url,
    location: m.location,
    specialties: m.specialties,
    provider: m.provider,
    publicProfile: m.public_profile,
    emailNotifications: m.email_notifications,
    portfolioLayout: m.portfolio_layout,
    portfolioCoverPhotoId: m.portfolio_cover_photo_id == null ? null : Number(m.portfolio_cover_photo_id),
    status: m.status,
    authority: m.authority,
    role: m.authority === 'WM' || m.authority === 'SA' ? 'ADMIN' : 'USER',
    createdAt: localDateTime(m.created_at),
    updatedAt: localDateTime(m.updated_at),
  };
}

/** 본인·관리자가 아닌 사람에게 — 연락처 제거 */
export function withoutContact(r: MemberResponse): MemberResponse {
  return { ...r, email: null, tel: null };
}
