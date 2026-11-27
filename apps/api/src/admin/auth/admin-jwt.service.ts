import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

/** Spring 어드민 application.properties의 개발 기본값 — prod 프로필은 JWT_SECRET 필수 */
export const ADMIN_DEV_SECRET = 'dev-happiness-admin-secret-key-must-be-at-least-256-bits-long-for-hs256';

/**
 * Spring 어드민 JwtTokenProvider와 같은 토큰 — subject=이메일, authority 클레임, jti 없음.
 * 비밀은 앱과 다른 값(ADMIN_JWT_SECRET)이라 앱 토큰으로 어드민에 들어올 수 없다.
 */
@Injectable()
export class AdminJwtService {
  private readonly key: Buffer;
  private readonly alg: 'HS256' | 'HS384' | 'HS512';
  readonly expirationSeconds = Number(process.env.ADMIN_JWT_EXPIRATION ?? 28800);

  constructor() {
    const configured = process.env.ADMIN_JWT_SECRET;
    if (!configured && (process.env.NODE_ENV ?? '') === 'production') {
      // Spring prod: jwt.secret=${JWT_SECRET} — 없으면 기동 실패
      throw new Error('ADMIN_JWT_SECRET이 설정되지 않았습니다 — 운영에서는 필수입니다.');
    }
    const secret = configured || ADMIN_DEV_SECRET; // 빈 문자열(.env 예시 그대로)도 개발 기본값
    this.key = Buffer.from(secret, 'utf8');
    if (this.key.length < 32) throw new Error('JWT secret must be at least 32 characters');
    // jjwt Keys.hmacShaKeyFor + signWith(key): 키 길이로 알고리즘 선택
    this.alg = this.key.length >= 64 ? 'HS512' : this.key.length >= 48 ? 'HS384' : 'HS256';
  }

  createToken(email: string, authority: string): string {
    const now = Math.floor(Date.now() / 1000);
    // jjwt는 typ 헤더를 넣지 않는다
    return jwt.sign({ sub: email, authority, iat: now, exp: now + this.expirationSeconds }, this.key, { algorithm: this.alg, header: { alg: this.alg, typ: undefined } as jwt.JwtHeader });
  }

  /** 유효하면 subject(이메일), 아니면 null — Spring validateToken + getEmail */
  emailOf(token: string): string | null {
    try {
      const c = jwt.verify(token, this.key, { algorithms: ['HS256', 'HS384', 'HS512'] }) as { sub?: string };
      return typeof c.sub === 'string' ? c.sub : null;
    } catch {
      return null;
    }
  }
}
