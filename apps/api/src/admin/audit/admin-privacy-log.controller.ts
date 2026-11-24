import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { Prisma } from '../../generated/admin-prisma/client.js';
import { isBlank } from '../../common/json-body.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-auth.middleware.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { requireWm } from '../common/admin-errors.js';
import { intParam, optLongParam, optStrParam, pageRequest, pageResponse } from '../common/admin-params.js';
import { ClientIp, stringMap } from '../common/admin-request.js';
import { jacksonLocalDateTime, PRIVACY_LOG_COLUMNS, PrivacyAccessRecorder, PrivacyLogRow, requireReason } from '../privacy/privacy-access-recorder.js';

const ACTIONS = ['LIST', 'VIEW', 'REVEAL', 'EXPORT', 'INSPECTION'];

function toRow(l: PrivacyLogRow) {
  return {
    id: Number(l.id), adminId: l.admin_id === null ? null : Number(l.admin_id), adminName: l.admin_name, ipAddress: l.ip_address,
    action: l.action, subjectMemberId: l.subject_member_id === null ? null : Number(l.subject_member_id), subjectCount: l.subject_count,
    reason: l.reason, detail: l.detail, accessedAt: jacksonLocalDateTime(l.at_text), hash: l.hash,
  };
}

/** 개인정보 접속기록 조회·무결성 검증·점검 기록 — 웹관리자(WM)만. 수정·삭제 API는 의도적으로 없다 */
@Controller('api/admin/privacy-logs')
export class AdminPrivacyLogController {
  constructor(
    private readonly prisma: AdminPrismaService,
    private readonly recorder: PrivacyAccessRecorder,
  ) {}

  @Get()
  async list(@CurrentAdmin() admin: AdminPrincipal, @Query() q: Record<string, unknown>) {
    const action = optStrParam(q.action);
    const adminId = optLongParam(q.adminId);
    const subjectId = optLongParam(q.subjectMemberId);
    const days = intParam(q.days, 30);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 30);
    requireWm(admin);
    const act = action !== null && !isBlank(action) ? action : null;
    const since = new Date(Date.now() - Math.max(1, Math.min(days, 730)) * 86400000);
    const p = pageRequest(page, size);
    const where = Prisma.sql`(${act}::text IS NULL OR action = ${act}::text) AND (${adminId}::bigint IS NULL OR admin_id = ${adminId}::bigint)
      AND (${subjectId}::bigint IS NULL OR subject_member_id = ${subjectId}::bigint) AND accessed_at >= ${since}`;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<PrivacyLogRow[]>`SELECT ${Prisma.raw(PRIVACY_LOG_COLUMNS)} FROM admin_privacy_access_logs WHERE ${where} ORDER BY id DESC LIMIT ${p.take} OFFSET ${p.skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM admin_privacy_access_logs WHERE ${where}`,
    ]);
    return pageResponse(rows.map(toRow), page, size, Number(total[0].c));
  }

  @Get('summary')
  async summary(@CurrentAdmin() admin: AdminPrincipal) {
    requireWm(admin);
    const since = new Date(Date.now() - 30 * 86400000);
    const counts30d: Record<string, number> = {};
    for (const a of ACTIONS) counts30d[a] = await this.prisma.admin_privacy_access_logs.count({ where: { action: a, accessed_at: { gte: since } } });
    const last = await this.prisma.$queryRaw<PrivacyLogRow[]>`SELECT ${Prisma.raw(PRIVACY_LOG_COLUMNS)} FROM admin_privacy_access_logs WHERE action = 'INSPECTION' ORDER BY id DESC LIMIT 1`;
    return { counts30d, lastInspection: last.length ? toRow(last[0]) : null, retentionYears: 2 };
  }

  @Get('verify')
  verify(@CurrentAdmin() admin: AdminPrincipal) {
    requireWm(admin);
    return this.recorder.verify();
  }

  @Post('inspections')
  @HttpCode(200)
  async inspect(@CurrentAdmin() admin: AdminPrincipal, @ClientIp() ip: string | null, @Body() body: unknown) {
    const note = stringMap(body).note ?? null;
    requireWm(admin);
    const why = requireReason(note);
    await this.recorder.record(admin, ip, 'INSPECTION', null, null, why, '접속기록·다운로드 내역 점검 완료');
    return { message: '점검 기록을 남겼습니다.' };
  }
}
