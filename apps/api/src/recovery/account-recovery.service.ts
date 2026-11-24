import { Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../common/app-error.js';
import { now } from '../common/time.js';
import { TokenStore } from '../auth/token-store.js';
import type { members } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { BCRYPT_ROUNDS } from '../member/member.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FixedWindowLimiter } from './fixed-window-limiter.js';

/** Spring AccountRecoveryService 1:1 — 토큰은 32바이트 난수(URL-safe Base64), DB엔 SHA-256 해시만, 30분·1회용. */
export const TOKEN_TTL_MINUTES = 30;
const WINDOW_10_MIN = 600;
const WINDOW_1_HOUR = 3600;

export interface AccountHint {
  maskedEmail: string | null;
  provider: string;
  joinedAt: string | null;
}

@Injectable()
export class AccountRecoveryService {
  private readonly log = new Logger('AccountRecoveryService');
  private readonly limiter = new FixedWindowLimiter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenStore,
    private readonly mail: MailService,
  ) {}

  async findEmails(name: string | undefined, tel: string | undefined, ip: string): Promise<AccountHint[]> {
    this.checkRate(`find-email:${ip}`, 5, WINDOW_10_MIN, '아이디 찾기를 너무 많이 시도했습니다. 10분 뒤에 다시 시도해주세요.');
    if (name == null || name.trim() === '' || tel == null || tel.trim() === '') {
      throw AppError.badInput('이름과 휴대폰 번호를 입력해주세요.');
    }
    const digits = tel.replace(/\D/g, '');
    if (!/^01[0-9]\d{7,8}$/.test(digits)) throw AppError.badInput('올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)');
    const rows = await this.prisma.members.findMany({ where: { name: name.trim() }, orderBy: { id: 'asc' } });
    return rows
      .filter((m) => m.status === 'ACTIVE')
      .filter((m) => m.tel != null && m.tel.replace(/\D/g, '') === digits)
      .map((m) => ({
        maskedEmail: maskEmail(m.email),
        provider: m.provider ?? 'local',
        joinedAt: m.created_at ? formatDate(m.created_at) : null,
      }));
  }

  /** 가입 여부를 호출자에게 알리지 않는다 — 예외는 입력 형식·속도 제한뿐. */
  async requestReset(email: string | undefined, ip: string): Promise<void> {
    this.checkRate(`reset-ip:${ip}`, 5, WINDOW_10_MIN, '재설정 요청을 너무 많이 했습니다. 10분 뒤에 다시 시도해주세요.');
    if (email == null || email.trim() === '') throw AppError.badInput('이메일을 입력해주세요.');
    const normalized = email.trim().toLowerCase();
    if (!this.limiter.allow(`reset-email:${normalized}`, 3, WINDOW_1_HOUR)) {
      this.log.log('[password-reset] per-email limit reached');
      return;
    }
    const m = await this.prisma.members.findUnique({ where: { email: normalized } });
    if (m && m.status === 'ACTIVE') await this.issueAndSend(m);
  }

  private async issueAndSend(m: members) {
    if (m.password == null) {
      await this.mail.send(m.email, '[Happiness] 로그인 방법 안내', socialAccountHtml(m.provider), 'password-reset');
      return;
    }
    const t = now();
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.password_reset_tokens.updateMany({ where: { member_id: m.id, used_at: null }, data: { used_at: t } }),
      this.prisma.password_reset_tokens.create({
        data: { member_id: m.id, token_hash: sha256(raw), expires_at: new Date(t.getTime() + TOKEN_TTL_MINUTES * 60_000), created_at: t },
      }),
    ]);
    const base = (process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://happiness.io.kr' : 'http://localhost:3000')).replace(/\/+$/, '');
    const link = `${base}/reset-password?token=${raw}`;
    const sent = await this.mail.send(m.email, '[Happiness] 비밀번호 재설정 안내', resetHtml(link), 'password-reset');
    if (!sent && process.env.NODE_ENV !== 'production') {
      // 개발 환경에서만 — 운영 로그에는 토큰을 남기지 않는다(Spring dev 프로필과 같음)
      this.log.log(`[password-reset][dev] 메일 서버 없음 — 재설정 링크: ${link}`);
    }
  }

  async verify(raw: string | undefined): Promise<string | null> {
    const token = await this.usableToken(raw);
    const m = await this.prisma.members.findUnique({ where: { id: token.member_id } });
    if (!m) throw invalidLink();
    return maskEmail(m.email);
  }

  async confirm(raw: string | undefined, newPassword: string | undefined, ip: string): Promise<void> {
    this.checkRate(`reset-confirm:${ip}`, 10, WINDOW_10_MIN, '재설정을 너무 많이 시도했습니다. 10분 뒤에 다시 시도해주세요.');
    if (newPassword == null || newPassword.length < 8) throw AppError.badInput('비밀번호는 8자 이상이어야 합니다.');
    const token = await this.usableToken(raw);
    const m = await this.prisma.members.findUnique({ where: { id: token.member_id } });
    if (!m) throw invalidLink();
    const t = now();
    await this.prisma.$transaction([
      this.prisma.members.update({ where: { id: m.id }, data: { password: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), updated_at: t } }),
      this.prisma.password_reset_tokens.update({ where: { id: token.id }, data: { used_at: t } }),
    ]);
    await this.tokens.deleteAllRefresh(Number(m.id)); // 모든 기기 로그아웃
    this.log.log(`[password-reset] memberId=${m.id} password changed via reset link`);
  }

  private async usableToken(raw: string | undefined) {
    if (raw == null || raw.trim() === '' || raw.length > 100) throw invalidLink();
    const t = await this.prisma.password_reset_tokens.findUnique({ where: { token_hash: sha256(raw) } });
    if (!t || t.used_at != null || t.expires_at.getTime() <= Date.now()) throw invalidLink();
    return t;
  }

  private checkRate(key: string, limit: number, windowSeconds: number, message: string) {
    if (!this.limiter.allow(key, limit, windowSeconds)) throw AppError.status(429, message);
  }
}

const invalidLink = () => AppError.badInput('링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 요청해주세요.');

export const sha256 = (v: string) => createHash('sha256').update(v, 'utf8').digest('hex');

/** ja****@gmail.com — 로컬 파트 앞 2자(2자 이하면 1자), 별표는 최소 2개 */
export function maskEmail(email: string | null): string | null {
  if (email == null) return null;
  const at = email.indexOf('@');
  if (at <= 0) return '****';
  const local = email.slice(0, at);
  const keep = local.length <= 2 ? 1 : 2;
  return local.slice(0, keep) + '*'.repeat(Math.max(local.length - keep, 2)) + email.slice(at);
}

/** yyyy.MM.dd (DB 값 그대로 — UTC 전제) */
function formatDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}`;
}

function resetHtml(link: string) {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid #E5E8EB;border-radius:16px;color:#191F28;">
  <h2 style="margin:0 0 12px;font-size:20px;">비밀번호 재설정</h2>
  <p style="color:#4E5968;line-height:1.7;margin:0 0 20px;">아래 버튼을 눌러 새 비밀번호를 정해주세요. 링크는 ${TOKEN_TTL_MINUTES}분 동안 한 번만 쓸 수 있어요.</p>
  <a href="${link}" style="display:inline-block;padding:12px 20px;background:#3182F6;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;">새 비밀번호 정하기</a>
  <p style="color:#8B95A1;font-size:12px;line-height:1.6;margin:20px 0 0;">직접 요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 바뀌지 않습니다.</p>
</div>
`;
}

function socialAccountHtml(providerKey: string | null) {
  const names: Record<string, string> = { kakao: '카카오', google: 'Google', naver: '네이버', apple: 'Apple' };
  const provider = names[String(providerKey)] ?? '소셜';
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid #E5E8EB;border-radius:16px;color:#191F28;">
  <h2 style="margin:0 0 12px;font-size:20px;">로그인 방법 안내</h2>
  <p style="color:#4E5968;line-height:1.7;margin:0;">이 이메일은 <b>${provider}</b> 계정으로 가입되어 있어 따로 정한 비밀번호가 없어요. 로그인 화면에서 <b>${provider}로 계속하기</b>를 눌러주세요.</p>
  <p style="color:#8B95A1;font-size:12px;line-height:1.6;margin:20px 0 0;">직접 요청하지 않았다면 이 메일을 무시하세요.</p>
</div>
`;
}
