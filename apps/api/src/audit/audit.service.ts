import { Injectable, Logger } from '@nestjs/common';
import { now } from '../common/time.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Spring AuditLogService — security_audit_log에 비동기로 남기고, 실패해도 요청은 막지 않는다 */
@Injectable()
export class AuditService {
  private readonly log = new Logger('Audit');
  constructor(private readonly prisma: PrismaService) {}

  static maskEmail(email?: string | null) {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    return (local.length > 2 ? local.slice(0, 2) + '***' : '***') + '@' + domain;
  }

  private write(data: Record<string, unknown>) {
    this.prisma.security_audit_log
      .create({ data: { created_at: now(), ...data } as never })
      .catch((e: Error) => this.log.error(`[AUDIT] 감사 로그 저장 실패: ${e.message}`));
  }

  loginFailure(email: string, ip: string) {
    this.log.warn(`[SECURITY] 로그인 실패 - email=${AuditService.maskEmail(email)}, ip=${ip}`);
    this.write({ action_type: 'LOGIN_FAILURE', action_detail: `email=${AuditService.maskEmail(email)}`, ip_address: ip, success: false });
  }

  loginSuccess(memberId: number, ip: string) {
    this.write({ member_id: BigInt(memberId), action_type: 'LOGIN_SUCCESS', action_detail: `ip=${ip}`, ip_address: ip, success: true });
  }
}
