import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

/** Spring JwtTokenProvider와 같은 토큰 — 같은 비밀키·클레임이라 어느 서버가 발급했든 양쪽에서 통한다 */
export const DEV_DEFAULT_SECRET = 'happiness-app-dev-secret-key-must-be-at-least-256-bits-long-for-hs256';

export interface TokenClaims {
  sub: string;
  email: string;
  type: 'ACCESS' | 'REFRESH';
  role?: string;
  jti: string;
  exp: number;
}

@Injectable()
export class JwtService {
  private readonly log = new Logger('JwtService');
  private readonly key: Buffer;
  readonly issuer = process.env.JWT_ISSUER ?? 'happiness-app';
  readonly accessTtlMs = Number(process.env.JWT_ACCESS_TOKEN_EXPIRY_MS ?? 1_800_000);
  readonly refreshTtlMs = Number(process.env.JWT_REFRESH_TOKEN_EXPIRY_MS ?? 604_800_000);

  constructor() {
    let secret = process.env.JWT_SECRET || DEV_DEFAULT_SECRET; // 빈 문자열(.env 예시 그대로)도 기본값 — Spring ${JWT_SECRET:기본값}과 같은 동작
    const prod = (process.env.NODE_ENV ?? '') === 'production';
    const weak = secret === DEV_DEFAULT_SECRET || Buffer.byteLength(secret, 'utf8') < 32;
    if (prod && weak) {
      // Spring과 같은 정책 — 서버는 띄우되 공개 기본값으로는 서명하지 않는다(재시작마다 로그인이 풀림)
      secret = randomBytes(64).toString('base64');
      this.log.error('[SECURITY] JWT_SECRET이 비어 있거나 공개된 기본값/32바이트 미만입니다. 임시 난수 키를 사용합니다.');
    }
    // Spring: Keys.hmacShaKeyFor(secret.getBytes(UTF_8)) — 문자열 그대로의 바이트가 키
    this.key = Buffer.from(secret, 'utf8');
    // jjwt는 Keys.hmacShaKeyFor가 키 길이로 고른 알고리즘으로 서명한다 (64바이트↑ HS512, 48↑ HS384, 그 외 HS256)
    this.alg = this.key.length >= 64 ? 'HS512' : this.key.length >= 48 ? 'HS384' : 'HS256';
  }

  private readonly alg: 'HS256' | 'HS384' | 'HS512';

  private sign(memberId: number, email: string, type: 'ACCESS' | 'REFRESH', ttlMs: number, role?: string): string {
    const nowSec = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      jti: randomUUID(),
      iss: this.issuer,
      sub: String(memberId),
      email,
      type,
      iat: nowSec,
      exp: nowSec + Math.floor(ttlMs / 1000),
    };
    if (role) payload.role = role;
    return jwt.sign(payload, this.key, { algorithm: this.alg });
  }

  accessToken(memberId: number, email: string, role: string) {
    return this.sign(memberId, email, 'ACCESS', this.accessTtlMs, role);
  }

  refreshToken(memberId: number, email: string) {
    return this.sign(memberId, email, 'REFRESH', this.refreshTtlMs);
  }

  /** 서명·만료 확인. 실패 시 jsonwebtoken 오류(TokenExpiredError 등)를 그대로 던진다 */
  verify(token: string): TokenClaims {
    return jwt.verify(token, this.key, { algorithms: ['HS256', 'HS384', 'HS512'] }) as TokenClaims;
  }

  remainingMs(c: TokenClaims) {
    return Math.max(0, c.exp * 1000 - Date.now());
  }
}
