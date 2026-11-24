import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { AdminPrismaService } from '../admin-prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-auth.middleware.js';
import { IllegalArgument } from '../common/admin-errors.js';

export const REASON_MIN = 5;

/** 사유가 필요한 업무(열람·다운로드)의 입력 검증 — Spring PrivacyAccessRecorder.requireReason */
export function requireReason(reason: string | null | undefined): string {
  if (reason == null || reason.trim().length < REASON_MIN) throw new IllegalArgument(`처리 사유를 ${REASON_MIN}자 이상 입력해 주세요.`);
  return reason.trim();
}

function truncate(s: string | null | undefined, max: number): string | null {
  return s == null ? null : s.length <= max ? s : s.slice(0, max);
}

/** DB timestamp(6)를 마이크로초까지 담은 글자("2026-11-24T11:28:18.360018")로 — Prisma Date는 밀리초에서 잘린다 */
export const ACCESSED_AT_TEXT = `to_char(accessed_at, 'YYYY-MM-DD"T"HH24:MI:SS.US')`;

/** java LocalDateTime.toString (마이크로초까지) — 해시 입력과 같아야 한다 */
export function javaLocalDateTimeString(text: string): string {
  const [date, time] = text.split('T');
  const [hms, frac = '000000'] = time.split('.');
  const micros = Number(frac.padEnd(6, '0').slice(0, 6));
  const [h, m, s] = hms.split(':');
  if (Number(s) === 0 && micros === 0) return `${date}T${h}:${m}`;
  let out = `${date}T${h}:${m}:${s}`;
  if (micros > 0) out += micros % 1000 === 0 ? '.' + String(micros / 1000).padStart(3, '0') : '.' + String(micros).padStart(6, '0');
  return out;
}

/** Jackson ISO_LOCAL_DATE_TIME — 초는 항상, 소수는 끝의 0을 지운다 */
export function jacksonLocalDateTime(text: string | null): string | null {
  if (text === null) return null;
  const [sec, frac = ''] = text.split('.');
  const t = frac.replace(/0+$/, '');
  return t ? `${sec}.${t}` : sec;
}

function dateToText(d: Date): string {
  return d.toISOString().slice(0, 23) + '000';
}

export function chainHash(prev: string | null, adminId: number | null, adminName: string | null, ip: string | null, action: string,
  subjectId: number | null, subjectCount: number | null, reason: string | null, detail: string | null, atText: string): string {
  const payload = [String(prev), String(adminId), String(adminName), String(ip), action, String(subjectId), String(subjectCount),
    String(reason), String(detail), javaLocalDateTimeString(atText)].join('\u001F');
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export interface PrivacyLogRow {
  id: bigint; admin_id: bigint | null; admin_name: string | null; ip_address: string | null; action: string;
  subject_member_id: bigint | null; subject_count: number | null; reason: string | null; detail: string | null;
  at_text: string; prev_hash: string | null; hash: string;
}

export const PRIVACY_LOG_COLUMNS = `id, admin_id, admin_name, ip_address, action, subject_member_id, subject_count, reason, detail, ${ACCESSED_AT_TEXT} AS at_text, prev_hash, hash`;

/**
 * 개인정보 접속기록 — 해시 체인(이전 행 hash를 넣어 다음 hash 계산)으로 변조를 알아챈다.
 * Spring처럼 별도 트랜잭션(REQUIRES_NEW)으로 즉시 남기고, 체인 순서를 지키려고 기록을 한 줄로 세운다(단일 인스턴스 기준).
 */
@Injectable()
export class PrivacyAccessRecorder {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly prisma: AdminPrismaService) {}

  record(admin: AdminPrincipal | null, ip: string | null, action: string, subjectMemberId: number | null, subjectCount: number | null,
    reason: string | null, detail: string | null): Promise<void> {
    const run = this.chain.then(async () => {
      const last = await this.prisma.admin_privacy_access_logs.findFirst({ orderBy: { id: 'desc' }, select: { hash: true } });
      const prev = last?.hash ?? null;
      const at = new Date();
      const adminId = admin?.id ?? null;
      const adminName = admin?.name ?? null;
      const safeIp = truncate(ip, 45);
      const safeReason = truncate(reason, 300);
      const safeDetail = truncate(detail, 500);
      await this.prisma.admin_privacy_access_logs.create({
        data: {
          admin_id: adminId === null ? null : BigInt(adminId), admin_name: adminName, ip_address: safeIp, action,
          subject_member_id: subjectMemberId === null ? null : BigInt(subjectMemberId), subject_count: subjectCount,
          reason: safeReason, detail: safeDetail, accessed_at: at, prev_hash: prev,
          hash: chainHash(prev, adminId, adminName, safeIp, action, subjectMemberId, subjectCount, safeReason, safeDetail, dateToText(at)),
        },
      });
    });
    this.chain = run.catch(() => undefined);
    return run;
  }

  /** 처음부터 해시를 다시 계산해 체인이 끊긴 첫 행을 찾는다 */
  async verify(): Promise<Record<string, unknown>> {
    const all = await this.prisma.$queryRawUnsafe<PrivacyLogRow[]>(`SELECT ${PRIVACY_LOG_COLUMNS} FROM admin_privacy_access_logs ORDER BY id ASC`);
    const result: Record<string, unknown> = { total: all.length };
    let prev: string | null = null;
    for (const l of all) {
      const expected = chainHash(prev, l.admin_id === null ? null : Number(l.admin_id), l.admin_name, l.ip_address, l.action,
        l.subject_member_id === null ? null : Number(l.subject_member_id), l.subject_count, l.reason, l.detail, l.at_text);
      const linkOk = prev === null ? l.prev_hash === null : prev === l.prev_hash;
      if (!linkOk || expected !== l.hash) {
        result.valid = false;
        result.brokenAtId = Number(l.id);
        return result;
      }
      prev = l.hash;
    }
    result.valid = true;
    return result;
  }
}
