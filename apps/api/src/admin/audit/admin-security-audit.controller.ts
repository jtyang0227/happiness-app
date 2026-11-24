import { Controller, Get, Query } from '@nestjs/common';
import { localDateTime } from '../../common/time.js';
import { isBlank } from '../../common/json-body.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import { intParam, optBoolParam, optLongParam, optStrParam, pageRequest, pageResponse } from '../common/admin-params.js';

/** Spring 어드민 AdminSecurityAuditController — security_audit_log 조회(기록은 하지 않음) */
@Controller('api/admin/security-audit')
export class AdminSecurityAuditController {
  constructor(private readonly prisma: AdminPrismaService) {}

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const actionType = optStrParam(q.actionType);
    const success = optBoolParam(q.success);
    const memberId = optLongParam(q.memberId);
    const ip = optStrParam(q.ip);
    const days = intParam(q.days, 7);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 30);
    const type = actionType !== null && !isBlank(actionType) ? actionType : null;
    const ipTerm = ip !== null && !isBlank(ip) ? ip.trim() : null;
    const since = new Date(Date.now() - Math.max(1, Math.min(days, 90)) * 86400000);
    const p = pageRequest(page, size);
    const where = {
      ...(type !== null ? { action_type: type } : {}),
      ...(success !== null ? { success } : {}),
      ...(memberId !== null ? { member_id: BigInt(memberId) } : {}),
      ...(ipTerm !== null ? { ip_address: ipTerm } : {}),
      created_at: { gte: since },
    };
    const [logs, total] = await Promise.all([
      this.prisma.security_audit_log.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: p.skip, take: p.take }),
      this.prisma.security_audit_log.count({ where }),
    ]);
    const ids = [...new Set(logs.map((l) => l.member_id).filter((x): x is bigint => x !== null))];
    const names = new Map((ids.length ? await this.prisma.members.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : []).map((m) => [m.id, m.name]));
    const content = logs.map((l) => ({
      id: Number(l.id), memberId: l.member_id === null ? null : Number(l.member_id), memberName: l.member_id !== null ? (names.get(l.member_id) ?? null) : null,
      actionType: l.action_type, actionDetail: l.action_detail, ipAddress: l.ip_address, role: l.role, success: l.success === true,
      errorMessage: l.error_message, createdAt: localDateTime(l.created_at),
    }));
    return pageResponse(content, page, size, total);
  }

  @Get('summary')
  async summary() {
    const dayAgo = new Date(Date.now() - 24 * 3600000);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const count = (t: string, since: Date) => this.prisma.security_audit_log.count({ where: { action_type: t, created_at: { gte: since } } });
    const top = await this.prisma.$queryRaw<{ ip: string; c: bigint; last: Date }[]>`SELECT ip_address AS ip, COUNT(*) AS c, MAX(created_at) AS last FROM security_audit_log
      WHERE action_type = 'LOGIN_FAILURE' AND created_at >= ${dayAgo} AND ip_address IS NOT NULL GROUP BY ip_address ORDER BY COUNT(*) DESC LIMIT 5`;
    return {
      loginFailures24h: await count('LOGIN_FAILURE', dayAgo),
      loginSuccess24h: await count('LOGIN_SUCCESS', dayAgo),
      adminApi7d: await count('ADMIN_API', weekAgo),
      topFailureIps: top.map((r) => ({ ip: r.ip, count: Number(r.c), lastAt: localDateTime(r.last) })),
    };
  }
}
