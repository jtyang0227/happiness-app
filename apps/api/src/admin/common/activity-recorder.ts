import { Injectable } from '@nestjs/common';
import { AdminPrismaService } from '../admin-prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-auth.middleware.js';

type Tx = Pick<AdminPrismaService, 'admin_activity_logs'>;

/** Spring AdminActivityRecorder — 관리자 작업 이력(admin_activity_logs) */
@Injectable()
export class AdminActivityRecorder {
  constructor(private readonly prisma: AdminPrismaService) {}

  record(admin: AdminPrincipal | null, action: string, targetType: string | null, targetId: number | null, details: string | null, tx: Tx = this.prisma) {
    return tx.admin_activity_logs.create({
      data: { admin_id: admin ? BigInt(admin.id) : null, admin_name: admin?.name ?? null, action, target_type: targetType,
        target_id: targetId === null ? null : BigInt(targetId), details, created_at: new Date() },
    });
  }

  /** 스케줄러처럼 요청 없이 실행되는 동작 — 관리자명 "시스템" */
  recordSystem(action: string, targetType: string, targetId: number | null, details: string, tx: Tx = this.prisma) {
    return tx.admin_activity_logs.create({
      data: { admin_name: '시스템', action, target_type: targetType, target_id: targetId === null ? null : BigInt(targetId), details, created_at: new Date() },
    });
  }
}
