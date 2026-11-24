import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AdminPrismaService } from '../admin-prisma.service.js';
import { AdminJwtService } from './admin-jwt.service.js';

export interface AdminPrincipal {
  id: number;
  email: string;
  name: string;
  authority: 'WM' | 'SA';
}

export type AdminRequest = Request & { admin?: AdminPrincipal };

/** SecurityConfig의 permitAll 목록 */
const PUBLIC: Array<[string, string]> = [
  ['POST', '/api/auth/login'],
  ['GET', '/api/popups/active'],
  ['GET', '/actuator/health'],
];

/**
 * Spring 어드민 JwtAuthenticationFilter + authorizeHttpRequests.
 * 토큰의 권한을 믿지 않고 매 요청 DB에서 상태 ACTIVE·권한 WM/SA인지 다시 본다(강등·정지된 관리자 차단).
 * 인증이 없으면 경로가 있든 없든 403 빈 본문(Http403ForbiddenEntryPoint) — 경로 판정보다 먼저.
 */
@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: AdminPrismaService,
    private readonly jwt: AdminJwtService,
  ) {}

  async use(req: AdminRequest, res: Response, next: NextFunction) {
    try {
      const header = req.headers.authorization;
      if (typeof header === 'string' && header.startsWith('Bearer ') && header.length > 7) {
        const email = this.jwt.emailOf(header.slice(7));
        if (email !== null) {
          const m = await this.prisma.members.findUnique({ where: { email }, select: { id: true, email: true, name: true, status: true, authority: true } });
          if (m && m.status === 'ACTIVE' && (m.authority === 'WM' || m.authority === 'SA')) {
            req.admin = { id: Number(m.id), email: m.email, name: m.name, authority: m.authority };
          }
        }
      }
    } catch (e) {
      next(e);
      return;
    }
    // forRoutes('*')로 붙으면 req.path가 마운트 기준이 될 수 있어 originalUrl로 본다
    const path = req.originalUrl.split('?')[0];
    if (req.admin || req.method === 'OPTIONS' || PUBLIC.some(([m, p]) => m === req.method && p === path)) {
      next();
      return;
    }
    res.status(403).end();
  }
}
