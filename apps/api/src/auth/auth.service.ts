import { Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../common/app-error.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BCRYPT_ROUNDS } from '../member/member.service.js';
import { MemberResponse, toMemberResponse } from '../member/member.mapper.js';
import { JwtService } from './jwt.service.js';
import { LoginAttemptLimiter } from './login-attempt-limiter.js';
import { TokenStore } from './token-store.js';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  member: MemberResponse;
}

/** Spring AuthService — 로그인·재발급·로그아웃. 문구·상태·토큰 회전 규칙이 같다 */
@Injectable()
export class AuthService {
  private readonly log = new Logger('Auth');
  private dummyHash: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tokens: TokenStore,
    private readonly limiter: LoginAttemptLimiter,
    private readonly audit: AuditService,
  ) {}

  private tokenResponse(member: MemberResponse, accessToken: string, refreshToken: string): TokenResponse {
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: Math.floor(this.jwt.accessTtlMs / 1000), member };
  }

  private async getDummyHash() {
    if (!this.dummyHash) this.dummyHash = await bcrypt.hash(randomUUID(), BCRYPT_ROUNDS);
    return this.dummyHash;
  }

  async login(body: { email: string; password: string; deviceId?: string }, ip: string, deviceHeader?: string): Promise<TokenResponse> {
    const deviceId = resolveDevice(body.deviceId, deviceHeader);
    const email = body.email.trim().toLowerCase();

    const lockedMs = this.limiter.remainingLockMs(email);
    if (lockedMs > 0) {
      const minutes = Math.max(1, Math.ceil(lockedMs / 60000));
      throw AppError.status(429, `로그인 시도가 너무 많습니다. ${minutes}분 뒤에 다시 시도해주세요.`);
    }

    const member = await this.prisma.members.findUnique({ where: { email } });
    // 계정이 없거나 소셜 계정이어도 같은 비용의 비교 — 응답 시간으로 가입 여부를 알 수 없게
    const hash = member?.password ?? (await this.getDummyHash());
    const matches = await bcrypt.compare(body.password ?? '', hash);
    if (!member || !member.password || !matches) {
      this.limiter.recordFailure(email);
      this.audit.loginFailure(body.email, ip);
      throw AppError.of('LOGIN_FAILED');
    }
    this.limiter.recordSuccess(email);
    if (member.status === 'SUSPENDED') throw AppError.of('ACCOUNT_LOCKED');

    const id = Number(member.id);
    const access = this.jwt.accessToken(id, member.email, member.authority);
    const refresh = this.jwt.refreshToken(id, member.email);
    await this.tokens.saveRefresh(id, deviceId, refresh);
    this.audit.loginSuccess(id, ip);
    this.log.log(`[AUTH] 로그인 성공 - memberId=${id}, role=${member.authority}, device=${deviceId}`);
    return this.tokenResponse(toMemberResponse(member), access, refresh);
  }

  async refresh(body: { refreshToken?: string; deviceId?: string }, deviceHeader?: string): Promise<TokenResponse> {
    if (!body.refreshToken || !body.refreshToken.trim()) throw AppError.badInput('리프레시 토큰은 필수입니다.');
    const deviceId = resolveDevice(body.deviceId, deviceHeader);
    let claims;
    try {
      claims = this.jwt.verify(body.refreshToken);
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError) throw AppError.of('EXPIRED_TOKEN');
      throw AppError.of('INVALID_REFRESH_TOKEN');
    }
    if (claims.type === 'ACCESS') throw AppError.of('INVALID_REFRESH_TOKEN');
    const memberId = Number(claims.sub);
    if (!(await this.tokens.isValidRefresh(memberId, deviceId, body.refreshToken))) {
      this.log.warn(`[AUTH] RefreshToken 불일치 - memberId=${memberId}, device=${deviceId}`);
      throw AppError.of('INVALID_REFRESH_TOKEN');
    }
    const member = await this.prisma.members.findUnique({ where: { id: BigInt(memberId) } });
    if (!member) throw AppError.of('MEMBER_NOT_FOUND');
    const access = this.jwt.accessToken(memberId, claims.email, member.authority);
    const refresh = this.jwt.refreshToken(memberId, claims.email);
    await this.tokens.saveRefresh(memberId, deviceId, refresh);
    return this.tokenResponse(toMemberResponse(member), access, refresh);
  }

  async logout(rawAccess: string | null, body: { deviceId?: string; allDevices?: boolean }, deviceHeader?: string) {
    const deviceId = resolveDevice(body.deviceId, deviceHeader);
    if (!rawAccess) return;
    try {
      const claims = this.jwt.verify(rawAccess);
      await this.tokens.blacklist(claims.jti, this.jwt.remainingMs(claims));
      const memberId = Number(claims.sub);
      if (body.allDevices) await this.tokens.deleteAllRefresh(memberId);
      else await this.tokens.deleteRefresh(memberId, deviceId);
    } catch {
      // 만료·깨진 토큰은 무시 (Spring과 같음)
    }
  }
}

function resolveDevice(fromBody?: string, fromHeader?: string) {
  if (fromBody && fromBody.trim()) return fromBody;
  return fromHeader && fromHeader.trim() ? fromHeader : 'default';
}
