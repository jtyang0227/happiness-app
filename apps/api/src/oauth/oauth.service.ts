import { Injectable } from '@nestjs/common';
import { now } from '../common/time.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MemberResponse, toMemberResponse } from '../member/member.mapper.js';

/**
 * Spring Kakao/Google/Naver/AppleOAuthService 1:1. 외부 API 실패·파싱 실패는 Spring처럼 처리하지 않은 예외(→ 500 C001).
 * 쿼리·폼 문자열을 인코딩 없이 이어 붙이는 것도 Spring과 같게 둔다(공급자들이 받는 형식 그대로).
 */
@Injectable()
export class OAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async kakao(code?: string): Promise<MemberResponse> {
    const c = cfg('KAKAO', 'http://localhost:3000/oauth/kakao/callback');
    const token = await fetchJson('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: `grant_type=authorization_code&client_id=${c.id}&redirect_uri=${c.redirect}&code=${code}&client_secret=${c.secret}`,
    });
    const info = await fetchJson('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${token.access_token}`, 'Content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    });
    const account = info.kakao_account; // 없으면 Spring처럼 NPE → 500
    const name = account.profile != null ? account.profile.nickname : '카카오 사용자';
    return this.findOrCreate('kakao', String(info.id), account.email, name);
  }

  async google(code?: string): Promise<MemberResponse> {
    const c = cfg('GOOGLE', 'http://localhost:3000/oauth/google/callback');
    const token = await fetchJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=authorization_code&client_id=${c.id}&client_secret=${c.secret}&redirect_uri=${c.redirect}&code=${code}`,
    });
    const info = await fetchJson('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${required(token.access_token)}` } });
    const providerId = String(required(info.id));
    return this.findOrCreate('google', providerId, 'email' in info ? String(info.email) : `${providerId}@google.user`, 'name' in info ? String(info.name) : 'Google 사용자');
  }

  async naver(code?: string, state?: string): Promise<MemberResponse> {
    const c = cfg('NAVER', 'http://localhost:3000/oauth/naver/callback');
    const url = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${c.id}&client_secret=${c.secret}&redirect_uri=${c.redirect}&code=${code}`
      + (state != null && state.trim() !== '' ? `&state=${state}` : '');
    const token = await fetchJson(url);
    const root = await fetchJson('https://openapi.naver.com/v1/nid/me', { headers: { Authorization: `Bearer ${required(token.access_token)}` } });
    const res = required(root.response);
    const providerId = String(required(res.id));
    const email = 'email' in res ? String(res.email) : `${providerId}@naver.user`;
    const name = 'name' in res ? String(res.name) : 'nickname' in res ? String(res.nickname) : '네이버 사용자';
    return this.findOrCreate('naver', providerId, email, name);
  }

  /** id_token 서명은 검증하지 않는다 — Spring과 같음(README 알려진 차이에 보안 메모). */
  async apple(idToken?: string, userJson?: string): Promise<MemberResponse> {
    if (idToken == null || idToken.trim() === '') throw new Error('Apple id_token이 없습니다.');
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
    const providerId = String(required(payload.sub));
    const email = 'email' in payload ? String(payload.email) : `${providerId}@privaterelay.appleid.com`;
    let name = 'Apple 사용자';
    if (userJson != null && userJson.trim() !== '') {
      try {
        const n = JSON.parse(userJson).name;
        if (n) {
          const full = `${n.firstName ?? ''} ${n.lastName ?? ''}`.trim();
          if (full) name = full;
        }
      } catch { /* Spring도 무시 */ }
    }
    return this.findOrCreate('apple', providerId, email, name);
  }

  get appleFrontendRedirect() {
    return process.env.APPLE_FRONTEND_REDIRECT_URI || 'http://localhost:3000/oauth/apple/result';
  }

  private async findOrCreate(provider: string, providerId: string, email: string, name: string): Promise<MemberResponse> {
    const byProvider = await this.prisma.members.findFirst({ where: { provider, provider_id: providerId } });
    if (byProvider) return toMemberResponse(byProvider);
    if (email != null) {
      const byEmail = await this.prisma.members.findUnique({ where: { email } });
      if (byEmail) return toMemberResponse(byEmail);
    }
    const t = now();
    const m = await this.prisma.members.create({
      data: {
        email, name, tel: '', password: null, status: 'ACTIVE', authority: 'US', provider, provider_id: providerId,
        public_profile: true, email_notifications: true, created_at: t, updated_at: t,
      },
    });
    return toMemberResponse(m);
  }
}

function cfg(prefix: string, defaultRedirect: string) {
  return {
    id: process.env[`${prefix}_CLIENT_ID`] ?? '',
    secret: process.env[`${prefix}_CLIENT_SECRET`] ?? '',
    redirect: process.env[`${prefix}_REDIRECT_URI`] || defaultRedirect,
  };
}

/** RestTemplate처럼 4xx/5xx면 예외 */
async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, init);
  const text = await r.text();
  if (!r.ok) throw new Error(`OAuth ${r.status} ${url.split('?')[0]}`);
  return JSON.parse(text);
}

function required<T>(v: T | undefined | null): T {
  if (v == null) throw new Error('OAuth 응답 파싱 실패');
  return v;
}
