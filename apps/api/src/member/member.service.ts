import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AppError } from '../common/app-error.js';
import { now } from '../common/time.js';
import type { Prisma, members } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MemberResponse, toMemberResponse } from './member.mapper.js';

// Spring MemberService와 같은 정규식·문구
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PROFILE_NAME_PATTERN = /^[a-z0-9][a-z0-9\-]{1,28}[a-z0-9]$|^[a-z0-9]{1,2}$/;
const INSTAGRAM_PATTERN = /^[a-zA-Z0-9._]{1,30}$/;
/** Spring BCryptPasswordEncoder 기본 강도 */
export const BCRYPT_ROUNDS = 10;

const isBlank = (s?: string | null) => s == null || s.trim() === '';

export interface SignUpRequest {
  email?: string;
  password?: string;
  name?: string;
  tel?: string;
  profileName?: string;
  instagramId?: string;
  termsAgreed?: boolean;
}

@Injectable()
export class MemberService {
  constructor(private readonly prisma: PrismaService) {}

  async signUp(req: SignUpRequest): Promise<MemberResponse> {
    this.validateEmail(req.email);
    this.validatePassword(req.password);
    const email = req.email!.trim().toLowerCase();
    if (await this.prisma.members.findUnique({ where: { email }, select: { id: true } })) {
      throw AppError.badInput('이미 등록된 이메일입니다.');
    }
    if (!req.termsAgreed) throw AppError.badInput('이용약관에 동의해야 합니다.');
    if (isBlank(req.name)) throw AppError.badInput('이름은 필수입니다.');

    const profileName = this.normalizeProfileName(req.profileName);
    if (profileName && (await this.prisma.members.findUnique({ where: { profile_name: profileName }, select: { id: true } }))) {
      throw AppError.badInput('이미 사용 중인 프로필 이름입니다.');
    }
    const instagramId = this.normalizeInstagramId(req.instagramId);
    const t = now();
    const m = await this.prisma.members.create({
      data: {
        email,
        password: await bcrypt.hash(req.password!, BCRYPT_ROUNDS),
        name: req.name!.trim(),
        tel: this.normalizeTel(req.tel),
        profile_name: profileName,
        instagram_id: instagramId,
        status: 'ACTIVE',
        authority: 'US',
        provider: 'local',
        // Spring Member 엔티티 기본값
        public_profile: true,
        email_notifications: true,
        created_at: t,
        updated_at: t,
      },
    });
    return toMemberResponse(m);
  }

  async getMember(id: number): Promise<MemberResponse> {
    const m = await this.prisma.members.findUnique({ where: { id: BigInt(id) } });
    if (!m) throw AppError.badInput('회원을 찾을 수 없습니다.');
    return toMemberResponse(m);
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    if (!EMAIL_PATTERN.test(email.trim())) return false;
    return !(await this.prisma.members.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } }));
  }

  async isProfileNameAvailable(name: string): Promise<boolean> {
    const normalized = this.normalizeProfileName(name);
    if (!normalized) return false;
    return !(await this.prisma.members.findUnique({ where: { profile_name: normalized }, select: { id: true } }));
  }

  validateEmail(email?: string) {
    if (isBlank(email)) throw AppError.badInput('이메일은 필수입니다.');
    if (!EMAIL_PATTERN.test(email!.trim())) throw AppError.badInput('올바른 이메일 형식이 아닙니다. (예: user@example.com)');
  }

  validatePassword(password?: string) {
    if (password == null || password.length < 8) throw AppError.badInput('비밀번호는 8자 이상이어야 합니다.');
  }

  normalizeProfileName(raw?: string | null): string | null {
    if (isBlank(raw)) return null;
    const name = raw!.trim().toLowerCase();
    if (!PROFILE_NAME_PATTERN.test(name)) {
      throw AppError.badInput('프로필 이름은 영문 소문자·숫자·하이픈 30자 이하이며, 하이픈으로 시작하거나 끝날 수 없습니다. (예: my-portfolio)');
    }
    return name;
  }

  normalizeTel(raw?: string | null): string {
    if (isBlank(raw)) return '';
    const digits = raw!.replace(/\D/g, '');
    if (!/^01[0-9]\d{7,8}$/.test(digits)) throw AppError.badInput('올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)');
    const mid = digits.length - 4;
    return `${digits.slice(0, 3)}-${digits.slice(3, mid)}-${digits.slice(mid)}`;
  }

  normalizeInstagramId(raw?: string | null): string | null {
    if (isBlank(raw)) return null;
    const id = raw!.trim().replace(/^@/, '');
    if (!INSTAGRAM_PATTERN.test(id)) throw AppError.badInput('인스타그램 아이디는 영문, 숫자, 점, 밑줄만 사용 가능하며 30자 이하이어야 합니다.');
    return id;
  }

  // ── 2단계 후반: 프로필·비밀번호·통계·관리자 ──────────────────────────

  /** Spring updateProfile — null 필드는 그대로, 빈 문자열은 비우기(이름은 빈 값 무시). */
  async updateProfile(id: number, req: ProfileUpdateRequest): Promise<MemberResponse> {
    const m = await this.findOrThrow(id);
    const data: Prisma.membersUpdateInput = {};
    if (!isBlank(req.name)) data.name = req.name!.trim();
    if (req.tel != null) data.tel = req.tel.trim();

    const profileName = this.normalizeProfileName(req.profileName);
    if (profileName != null && profileName !== m.profile_name) {
      if (await this.prisma.members.findUnique({ where: { profile_name: profileName }, select: { id: true } })) {
        throw AppError.badInput('이미 사용 중인 프로필 이름입니다.');
      }
      data.profile_name = profileName;
    } else if (req.profileName != null && req.profileName.trim() === '') {
      data.profile_name = null;
    }
    if (req.instagramId != null) data.instagram_id = this.normalizeInstagramId(req.instagramId);

    const blankToNull = (v: string) => (v.trim() === '' ? null : v.trim());
    if (req.avatarUrl != null) data.avatar_url = blankToNull(req.avatarUrl);
    if (req.coverUrl != null) data.cover_url = blankToNull(req.coverUrl);
    if (req.bio != null) data.bio = blankToNull(req.bio);
    if (req.websiteUrl != null) data.website_url = blankToNull(req.websiteUrl);
    if (req.location != null) data.location = blankToNull(req.location);
    if (req.specialties != null) data.specialties = blankToNull(req.specialties);
    if (req.publicProfile != null) data.public_profile = req.publicProfile;
    if (req.emailNotifications != null) data.email_notifications = req.emailNotifications;
    if (req.portfolioLayout != null) data.portfolio_layout = blankToNull(req.portfolioLayout);
    if (req.portfolioCoverPhotoId != null) data.portfolio_cover_photo_id = BigInt(req.portfolioCoverPhotoId);

    return toMemberResponse(await this.saveIfChanged(m, data));
  }

  async changePassword(id: number, currentPassword?: string, newPassword?: string): Promise<void> {
    const m = await this.findOrThrow(id);
    if (!m.password || currentPassword == null || !(await bcrypt.compare(currentPassword, m.password))) {
      throw AppError.badInput('현재 비밀번호가 일치하지 않습니다.');
    }
    this.validatePassword(newPassword);
    await this.prisma.members.update({
      where: { id: m.id },
      data: { password: await bcrypt.hash(newPassword!, BCRYPT_ROUNDS), updated_at: now() },
    });
  }

  /** Spring getMemberStats — 회원이 없어도 0으로 채워 200 */
  async getStats(id: number) {
    const memberId = BigInt(id);
    const [photoCount, sums, inquiryCount, unreadInquiryCount] = await Promise.all([
      this.prisma.photos.count({ where: { member_id: memberId } }),
      this.prisma.photos.aggregate({
        where: { member_id: memberId },
        _sum: { likes_count: true, saves_count: true, shares_count: true },
      }),
      this.prisma.inquiries.count({ where: { receiver_member_id: memberId } }),
      this.prisma.inquiries.count({ where: { receiver_member_id: memberId, is_read: false } }),
    ]);
    return {
      photoCount,
      totalLikes: Number(sums._sum.likes_count ?? 0),
      totalSaves: Number(sums._sum.saves_count ?? 0),
      totalShares: Number(sums._sum.shares_count ?? 0),
      inquiryCount,
      unreadInquiryCount,
    };
  }

  async getAllMembers(): Promise<MemberResponse[]> {
    return (await this.prisma.members.findMany({ orderBy: { id: 'asc' } })).map(toMemberResponse);
  }

  /** 이름·프로필명 부분 일치(대소문자 무시), 1~30건 */
  async searchMembers(q: string, size: number): Promise<MemberResponse[]> {
    if (q.trim() === '') return [];
    const term = q.trim();
    const rows = await this.prisma.members.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { profile_name: { contains: term, mode: 'insensitive' } },
        ],
      },
      orderBy: { id: 'asc' },
      take: Math.max(1, Math.min(size, 30)),
    });
    return rows.map(toMemberResponse);
  }

  /** "ADMIN"(대소문자 무시)이면 SA, 그 외는 US */
  async changeRole(id: number, role?: string): Promise<MemberResponse> {
    const m = await this.findOrThrow(id);
    const authority = role != null && role.toUpperCase() === 'ADMIN' ? 'SA' : 'US';
    return toMemberResponse(await this.saveIfChanged(m, { authority }));
  }

  /**
   * Spring MemberService.deleteAccount — 한 트랜잭션. 지우는 범위도 Spring과 같다(팔로우·예약·납품·약속·모임 등은 남는다 — README).
   * 없는 회원이면 아무것도 안 하고 성공(Spring deleteById와 같음).
   */
  async deleteAccount(memberId: number): Promise<void> {
    const id = BigInt(memberId);
    await this.prisma.$transaction(async (tx) => {
      const photoIds = (await tx.photos.findMany({ where: { member_id: id }, select: { id: true } })).map((p) => p.id);
      if (photoIds.length) {
        const byPhoto = { photo_id: { in: photoIds } };
        await tx.photo_likes.deleteMany({ where: byPhoto });
        await tx.photo_saves.deleteMany({ where: byPhoto });
        await tx.moodboard_items.deleteMany({ where: byPhoto });   // 남의 보드에 담긴 내 사진
        await tx.photo_shares.deleteMany({ where: byPhoto });
        await tx.photo_tags.deleteMany({ where: byPhoto });
        await tx.series_photos.deleteMany({ where: byPhoto });
        await tx.comments.deleteMany({ where: byPhoto });          // 내 사진에 달린 댓글
        await tx.photo_spots.deleteMany({ where: byPhoto });       // 스팟 자체는 남긴다
      }
      await tx.photo_likes.deleteMany({ where: { member_id: id } });
      await tx.photo_saves.deleteMany({ where: { member_id: id } });
      const seriesIds = (await tx.series.findMany({ where: { member_id: id }, select: { id: true } })).map((s) => s.id);
      if (seriesIds.length) {
        await tx.series_photos.deleteMany({ where: { series_id: { in: seriesIds } } });
        await tx.series_appreciations.deleteMany({ where: { series_id: { in: seriesIds } } });
      }
      await tx.series_appreciations.deleteMany({ where: { member_id: id } });   // 남의 작업에 남긴 감상
      const boardIds = (await tx.moodboards.findMany({ where: { member_id: id }, select: { id: true } })).map((b) => b.id);
      if (boardIds.length) await tx.moodboard_items.deleteMany({ where: { moodboard_id: { in: boardIds } } });
      await tx.moodboards.deleteMany({ where: { member_id: id } });
      await tx.series.deleteMany({ where: { member_id: id } });
      await tx.photos.deleteMany({ where: { member_id: id } });
      await tx.inquiries.deleteMany({ where: { receiver_member_id: id } });
      await tx.password_reset_tokens.deleteMany({ where: { member_id: id } });
      await tx.comments.deleteMany({ where: { member_id: id } });            // 남의 사진에 남긴 내 댓글
      await tx.member_blocks.deleteMany({ where: { OR: [{ blocker_id: id }, { blocked_id: id }] } });
      await tx.members.deleteMany({ where: { id } });
    });
  }

  private async findOrThrow(id: number) {
    const m = await this.prisma.members.findUnique({ where: { id: BigInt(id) } });
    if (!m) throw AppError.badInput('회원을 찾을 수 없습니다.');
    return m;
  }

  /** Hibernate @PreUpdate처럼 실제로 바뀐 값이 있을 때만 updated_at 갱신 */
  private async saveIfChanged(m: members, data: Prisma.membersUpdateInput) {
    const changed = Object.entries(data).some(([k, v]) => (m as Record<string, unknown>)[k] !== v);
    if (!changed) return m;
    return this.prisma.members.update({ where: { id: m.id }, data: { ...data, updated_at: now() } });
  }
}

export interface ProfileUpdateRequest {
  name?: string | null;
  tel?: string | null;
  profileName?: string | null;
  instagramId?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  location?: string | null;
  specialties?: string | null;
  publicProfile?: boolean | null;
  emailNotifications?: boolean | null;
  portfolioLayout?: string | null;
  portfolioCoverPhotoId?: number | null;
}
