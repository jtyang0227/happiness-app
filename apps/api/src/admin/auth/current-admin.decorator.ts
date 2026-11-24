import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminPrincipal, AdminRequest } from './admin-auth.middleware.js';

/** CurrentAdminProvider.require() — 인증 미들웨어를 통과한 관리자 */
export const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext): AdminPrincipal => {
  return ctx.switchToHttp().getRequest<AdminRequest>().admin!;
});
