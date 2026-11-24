import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AppError } from '../common/app-error.js';
import { now } from '../common/time.js';
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
}
