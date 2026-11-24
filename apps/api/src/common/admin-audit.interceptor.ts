import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { isAdmin, AuthUser } from '../auth/auth.guard.js';
import { AuditService } from '../audit/audit.service.js';
import { clientIp } from './client-ip.js';

/** Spring AdminAuditInterceptor — /api/admin/** 를 관리자가 부르면 security_audit_log(ADMIN_API, "METHOD /uri") */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const uri = req.originalUrl.split('?')[0];
    if (uri.startsWith('/api/admin/') && req.user && isAdmin(req.user)) {
      this.audit.adminAction(req.user.id, req.user.authority, req.method, uri, clientIp(req));
    }
    return next.handle();
  }
}
