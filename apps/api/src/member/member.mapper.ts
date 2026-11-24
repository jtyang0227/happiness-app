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

/** 관리자 목록용 — Spring PrivacyMasker와 같은 규칙 (us***@test.com, 010-****-0002) */
export function maskedContact(r: MemberResponse): MemberResponse {
  return { ...r, email: maskEmail(r.email), tel: maskTel(r.tel) };
}

export function maskEmail(email: string | null): string | null {
  if (email == null || email.trim() === '') return email;
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return email.slice(0, Math.min(2, at)) + '***' + email.slice(at);
}

export function maskTel(tel: string | null): string | null {
  if (tel == null || tel.trim() === '') return tel;
  const digits = tel.replace(/\D/g, '');
  if (digits.length < 7) return '****';
  if (tel.includes('-')) {
    const parts = tel.split('-');
    if (parts.length === 3) return `${parts[0]}-****-${parts[2]}`;
  }
  return digits.slice(0, 3) + '****' + digits.slice(-4);
}
