import { CanActivate, ExecutionContext, Injectable, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '../common/app-error.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from './jwt.service.js';
import { TokenStore } from './token-store.js';

export interface AuthUser {
  id: number;
  email: string;
  /** WM | SA | US — Spring Authority */
  authority: string;
}

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';
/** Spring SecurityConfig의 permitAll 경로 */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Spring @PreAuthorize("hasAnyRole(...)") */
export const Roles = (...roles: string[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser | undefined =>
  (ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>()).user);

export function isAdmin(u?: AuthUser) {
  return u?.authority === 'WM' || u?.authority === 'SA';
}

/**
 * Spring JwtAuthenticationFilter + 인가 규칙. 토큰이 있으면(공개 경로 포함) 사용자를 채우고,
 * 공개가 아닌 경로에 사용자가 없으면 401 A001, 역할이 맞지 않으면 403 B001.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly tokens: TokenStore,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    req.user = await this.resolve(req);

    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (!req.user) throw AppError.of('UNAUTHORIZED');
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES, targets);
    if (roles?.length && !roles.includes(req.user.authority)) throw AppError.of('FORBIDDEN');
    return true;
  }

  private async resolve(req: Request): Promise<AuthUser | undefined> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    try {
      const claims = this.jwt.verify(header.slice(7));
      if (claims.jti && (await this.tokens.isBlacklisted(claims.jti))) return undefined;
      if (claims.type !== 'ACCESS') return undefined;
      // Spring처럼 토큰의 이메일로 회원을 다시 읽어 최신 권한을 쓴다
      const m = await this.prisma.members.findUnique({ where: { email: claims.email }, select: { id: true, email: true, authority: true } });
      return m ? { id: Number(m.id), email: m.email, authority: m.authority } : undefined;
    } catch {
      return undefined;
    }
  }
}
