import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { LoginAttemptLimiter } from '../../auth/login-attempt-limiter.js';
import { RawBodyError } from '../../common/raw-body-error.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import { invalidRequest } from '../common/admin-errors.js';
import { AdminJwtService } from './admin-jwt.service.js';

/** 계정 유무를 응답으로 알 수 없게 하는 단일 메시지 */
const LOGIN_FAILED = '이메일 또는 비밀번호가 올바르지 않습니다.';

/** Jackson이 String 필드에 받아 주는 값만 — 객체·배열은 HttpMessageNotReadable(400) */
function jsonText(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  throw invalidRequest();
}

/**
 * Spring 어드민 AuthController + AuthService.adminLogin — 관리자(WM/SA·ACTIVE)만.
 * 이메일은 정규화하지 않고 그대로 찾는다(잠금 키만 소문자·trim). 앱 로그인과 같은 경로지만 별도 진입점이라 겹치지 않는다.
 */
@Controller('api/auth')
export class AdminAuthController {
  private dummyHash: string | null = null;

  constructor(
    private readonly prisma: AdminPrismaService,
    private readonly jwt: AdminJwtService,
    private readonly limiter: LoginAttemptLimiter,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown) {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw invalidRequest();
    const b = body as Record<string, unknown>;
    const email = jsonText(b.email);
    const password = jsonText(b.password);

    const lockMs = this.limiter.remainingLockMs(email ?? '');
    if (lockMs > 0) {
      // Duration.toMinutes()는 내림 → Math.max(1, 분 + 1)
      const minutes = Math.max(1, Math.floor(lockMs / 60000) + 1);
      throw new RawBodyError(429, { message: `로그인 시도가 너무 많습니다. ${minutes}분 후 다시 시도해 주세요.` });
    }
    const member = email === null ? null : await this.prisma.members.findUnique({ where: { email } });
    const hash = member?.password ?? (this.dummyHash ??= bcrypt.hashSync(randomUUID(), 10));
    const passwordOk = await bcrypt.compare(password ?? '', hash).catch(() => false);
    const isAdmin = member !== null && (member.authority === 'WM' || member.authority === 'SA');
    if (member === null || !passwordOk || !isAdmin || member.status !== 'ACTIVE') {
      this.limiter.recordFailure(email ?? '');
      throw new RawBodyError(401, { message: LOGIN_FAILED });
    }
    this.limiter.recordSuccess(email ?? '');
    return {
      token: this.jwt.createToken(member.email, member.authority),
      memberId: Number(member.id),
      email: member.email,
      name: member.name,
      profileName: member.profile_name,
      authority: member.authority,
    };
  }
}
