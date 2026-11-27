import { Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isoUtc } from '../time/time-sync.js';
import { TimeSyncService } from '../time/time.controller.js';
import { countdownBody } from './countdown.js';
import { buildIcs } from './ics.js';
import { applyVerification, OpenStatus, recalc, SCHEDULE_STATUSES, ScheduleStatus, TIME_SOURCES, timeBasedStatus } from './open-status.js';
import { cancelMemberNotifies, enqueue, NewJob, reviveUnsubscribed } from './ticket-jobs.js';
import { DEFAULT_OFFSETS, isValidTimezone, keys, OFFSETS, OffsetKey, parseOffsets, reminderMessage } from './ticket-time.js';

type Phase = Awaited<ReturnType<PrismaService['booking_phases']['findUniqueOrThrow']>>;

const err = (status: number, code: string, message: string) => new AppError(status, code, message);
const iso = (d: Date | null | undefined) => (d ? isoUtc(d) : null);
const ACTIVE_SCHEDULE: ScheduleStatus[] = ['TENTATIVE', 'CONFIRMED', 'CHANGED'];

function parseInstant(v: unknown, field: string, required: boolean): Date | null {
  if (v === undefined || v === null || v === '') {
    if (required) throw AppError.badInput(`${field}가 필요합니다.`);
    return null;
  }
  // 시간대 표시 없는 문자열은 받지 않는다 — "20:00"이 어느 나라 20시인지 알 수 없으므로
  if (typeof v !== 'string' || !/(Z|[+-]\d\d:\d\d)$/.test(v)) throw AppError.badInput(`${field}는 시간대가 붙은 ISO 8601이어야 합니다(예: 2026-12-01T20:00:00+09:00).`);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw AppError.badInput(`${field} 형식이 올바르지 않습니다.`);
  return d;
}

function text(v: unknown, field: string, max: number, required = false): string | null {
  const s = typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim() : '';
  if (!s) {
    if (required) throw AppError.badInput(`${field}을(를) 입력해 주세요.`);
    return null;
  }
  if (s.length > max) throw AppError.badInput(`${field}은(는) ${max}자 이하로 입력해 주세요.`);
  return s;
}

function sourceUrl(v: unknown, timeSource: string): string | null {
  const s = text(v, '근거 링크', 500);
  if (s && !/^https?:\/\//i.test(s)) throw AppError.badInput('근거 링크는 http(s) 주소여야 합니다.');
  if (!s && timeSource.startsWith('OFFICIAL_')) throw AppError.badInput('공식 출처(OFFICIAL_*)는 근거 링크가 필요합니다.');
  return s;
}

export function phaseView(p: Phase, extra: Record<string, unknown> = {}) {
  return {
    id: Number(p.id), sessionId: Number(p.session_id), name: p.name,
    announcedAt: iso(p.announced_at), scheduledAt: iso(p.scheduled_at), timezone: p.timezone,
    timeSource: p.time_source, sourceUrl: p.source_url, verifiedAt: iso(p.verified_at), lastTimeSyncAt: iso(p.last_time_sync_at),
    scheduleStatus: p.schedule_status, openStatus: p.open_status, scheduleRevision: p.schedule_revision,
    announcedDiffMs: p.announced_at ? p.scheduled_at.getTime() - p.announced_at.getTime() : null,
    ...extra,
  };
}

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService, private readonly sync: TimeSyncService) {}

  // ───────────── 공연(세션) ─────────────

  async createSession(body: any, user: AuthUser) {
    const t = new Date();
    const s = await this.prisma.ticket_sessions.create({
      data: { title: text(body?.title, '제목', 200, true)!, venue: text(body?.venue, '장소', 200), description: text(body?.description, '설명', 3000), created_by: BigInt(user.id), created_at: t, updated_at: t },
    });
    return this.sessionView(s, []);
  }

  async updateSession(id: number, body: any) {
    await this.sessionOr404(id);
    const s = await this.prisma.ticket_sessions.update({
      where: { id },
      data: {
        ...(body?.title !== undefined ? { title: text(body.title, '제목', 200, true)! } : {}),
        ...(body?.venue !== undefined ? { venue: text(body.venue, '장소', 200) } : {}),
        ...(body?.description !== undefined ? { description: text(body.description, '설명', 3000) } : {}),
        updated_at: new Date(),
      },
    });
    return this.sessionView(s, await this.prisma.booking_phases.findMany({ where: { session_id: s.id }, orderBy: { scheduled_at: 'asc' } }));
  }

  /** 공개 목록 — 앞으로 열릴(또는 오픈 확인 중인) 단계가 있는 공연 */
  async listSessions(includePast: boolean) {
    const now = new Date();
    const phases = await this.prisma.booking_phases.findMany({
      where: includePast ? {} : { OR: [{ scheduled_at: { gt: new Date(now.getTime() - 86400_000) } }, { open_status: { in: ['OPEN_CHECK_PENDING', 'OPEN_CONFIRMED', 'UNKNOWN'] } }] },
      orderBy: { scheduled_at: 'asc' },
    });
    const ids = [...new Set(phases.map((p) => p.session_id))];
    const sessions = await this.prisma.ticket_sessions.findMany({ where: { id: { in: ids } } });
    const byId = new Map(sessions.map((s) => [s.id, s]));
    return ids.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => this.sessionView(s, phases.filter((p) => p.session_id === s.id)));
  }

  async getSession(id: number) {
    const s = await this.sessionOr404(id);
    return this.sessionView(s, await this.prisma.booking_phases.findMany({ where: { session_id: s.id }, orderBy: { scheduled_at: 'asc' } }));
  }

  private sessionView(s: { id: bigint; title: string; venue: string | null; description: string | null; created_at: Date }, phases: Phase[]) {
    return { id: Number(s.id), title: s.title, venue: s.venue, description: s.description, createdAt: iso(s.created_at), phases: phases.map((p) => phaseView(p)) };
  }

  private async sessionOr404(id: number) {
    const s = await this.prisma.ticket_sessions.findUnique({ where: { id } });
    if (!s) throw err(404, 'SESSION_NOT_FOUND', '공연을 찾을 수 없습니다.');
    return s;
  }

  private async phaseOr404(id: number | bigint) {
    const p = await this.prisma.booking_phases.findUnique({ where: { id } });
    if (!p) throw err(404, 'PHASE_NOT_FOUND', '예매 일정을 찾을 수 없습니다.');
    return p;
  }

  // ───────────── 예매 단계 (B) ─────────────

  async createPhase(sessionId: number, body: any, user: AuthUser) {
    const session = await this.sessionOr404(sessionId);
    const now = new Date();
    const name = text(body?.name, '단계 이름', 50, true)!;
    const announcedAt = parseInstant(body?.announcedAt, 'announcedAt', false);
    const scheduledAt = parseInstant(body?.scheduledAt, 'scheduledAt', false) ?? announcedAt;
    if (!scheduledAt) throw AppError.badInput('scheduledAt 또는 announcedAt이 필요합니다.');
    const timezone = body?.timezone ?? 'Asia/Seoul';
    if (!isValidTimezone(timezone)) throw err(400, 'INVALID_TIMEZONE', 'timezone은 IANA 이름이어야 합니다(예: Asia/Seoul).');
    const timeSource = String(body?.timeSource ?? 'ADMIN_MANUAL');
    if (!(TIME_SOURCES as readonly string[]).includes(timeSource)) throw AppError.badInput(`timeSource는 ${TIME_SOURCES.join('·')} 중 하나여야 합니다.`);
    const scheduleStatus = String(body?.scheduleStatus ?? (timeSource === 'ESTIMATED' ? 'TENTATIVE' : 'CONFIRMED'));
    if (!ACTIVE_SCHEDULE.includes(scheduleStatus as ScheduleStatus)) throw AppError.badInput('새 일정의 scheduleStatus는 TENTATIVE·CONFIRMED·CHANGED 중 하나여야 합니다.');
    const url = sourceUrl(body?.sourceUrl, timeSource);
    const openStatus = timeBasedStatus(scheduledAt, now);
    const s = this.sync.snapshot();

    const warnings: string[] = [];
    if (openStatus === 'OPEN_CHECK_PENDING') warnings.push('예정 시각이 이미 지났습니다 — 오픈 확인 대기 상태로 만듭니다.');
    if (announcedAt && announcedAt.getTime() !== scheduledAt.getTime()) warnings.push('공지 시각과 시스템 기준 시각이 다릅니다.');
    const siblings = await this.prisma.booking_phases.findMany({ where: { session_id: session.id }, select: { name: true, scheduled_at: true } });
    for (const o of siblings) if (o.scheduled_at.getTime() === scheduledAt.getTime()) warnings.push(`같은 시각의 단계가 있습니다: ${o.name}`);

    const phase = await this.prisma.$transaction(async (tx) => {
      const p = await tx.booking_phases.create({
        data: {
          session_id: session.id, name, announced_at: announcedAt, scheduled_at: scheduledAt, timezone, time_source: timeSource, source_url: url,
          verified_at: timeSource === 'ESTIMATED' ? null : now, last_time_sync_at: s.lastSyncAt ? new Date(s.lastSyncAt) : null,
          schedule_status: scheduleStatus, open_status: openStatus, open_check_attempts: 0, schedule_revision: 1, created_at: now, updated_at: now,
        },
      });
      await tx.booking_phase_schedule_revisions.create({
        data: {
          booking_phase_id: p.id, revision: 1, new_announced_at: announcedAt, new_scheduled_at: scheduledAt, new_timezone: timezone, new_schedule_status: scheduleStatus,
          reason: text(body?.reason, '사유', 1000) ?? '최초 등록', source_url: url, time_source: timeSource, changed_by: `admin:${user.id}`, changed_at: now,
        },
      });
      await tx.booking_phase_status_logs.create({ data: { booking_phase_id: p.id, from_status: null, to_status: openStatus, reason: '생성', actor: 'system', revision: 1, created_at: now } });
      return p;
    });
    return { phase: phaseView(phase), warnings };
  }

  /**
   * 일정 변경 — 한 트랜잭션: 이력 추가 → revision 낙관적 잠금으로 갱신 → 알림 재계산 작업(아웃박스).
   * reason 없으면 400, expectedRevision이 최신과 다르면 409.
   */
  async changeSchedule(id: number, body: any, user: AuthUser) {
    const reason = text(body?.reason, '변경 사유', 1000);
    if (!reason) throw err(400, 'SCHEDULE_REASON_REQUIRED', '일정 변경 사유를 입력해 주세요.');
    const expected = Number(body?.expectedRevision);
    if (!Number.isInteger(expected)) throw AppError.badInput('expectedRevision이 필요합니다(낙관적 잠금).');
    const cur = await this.phaseOr404(id);
    if (cur.schedule_revision !== expected) throw err(409, 'SCHEDULE_REVISION_CONFLICT', `다른 사람이 먼저 바꿨습니다. 최신 revision은 ${cur.schedule_revision}입니다.`);

    const announcedAt = body?.announcedAt !== undefined ? parseInstant(body.announcedAt, 'announcedAt', false) : cur.announced_at;
    const scheduledAt = body?.scheduledAt !== undefined ? parseInstant(body.scheduledAt, 'scheduledAt', true)! : cur.scheduled_at;
    const timezone = body?.timezone ?? cur.timezone;
    if (!isValidTimezone(timezone)) throw err(400, 'INVALID_TIMEZONE', 'timezone은 IANA 이름이어야 합니다(예: Asia/Seoul).');
    const timeSource = String(body?.timeSource ?? cur.time_source);
    if (!(TIME_SOURCES as readonly string[]).includes(timeSource)) throw AppError.badInput(`timeSource는 ${TIME_SOURCES.join('·')} 중 하나여야 합니다.`);
    const url = body?.sourceUrl !== undefined ? sourceUrl(body.sourceUrl, timeSource) : sourceUrl(cur.source_url, timeSource);
    const timeChanged = scheduledAt.getTime() !== cur.scheduled_at.getTime() || (announcedAt?.getTime() ?? null) !== (cur.announced_at?.getTime() ?? null) || timezone !== cur.timezone;
    let scheduleStatus = body?.scheduleStatus ?? (timeChanged ? 'CHANGED' : cur.schedule_status);
    if (!(SCHEDULE_STATUSES as readonly string[]).includes(scheduleStatus)) throw AppError.badInput(`scheduleStatus는 ${SCHEDULE_STATUSES.join('·')} 중 하나여야 합니다.`);
    if (!timeChanged && scheduleStatus === cur.schedule_status) throw AppError.badInput('바뀐 일정이 없습니다. 재확인만 했다면 "공식 일정 재확인"을 쓰세요.');
    scheduleStatus = scheduleStatus as ScheduleStatus;

    const now = new Date();
    const next = cur.schedule_revision + 1;
    const nextOpen: OpenStatus = cur.open_status === 'TIME_SYNC_ERROR' ? 'TIME_SYNC_ERROR' : recalc(cur.open_status as OpenStatus, scheduledAt, now);
    const s = this.sync.snapshot();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.booking_phase_schedule_revisions.create({
        data: {
          booking_phase_id: cur.id, revision: next,
          prev_announced_at: cur.announced_at, new_announced_at: announcedAt, prev_scheduled_at: cur.scheduled_at, new_scheduled_at: scheduledAt,
          prev_timezone: cur.timezone, new_timezone: timezone, prev_schedule_status: cur.schedule_status, new_schedule_status: scheduleStatus,
          reason, source_url: url, time_source: timeSource, changed_by: `admin:${user.id}`, changed_at: now,
        },
      });
      const r = await tx.booking_phases.updateMany({
        where: { id: cur.id, schedule_revision: expected },
        data: {
          announced_at: announcedAt, scheduled_at: scheduledAt, timezone, time_source: timeSource, source_url: url, schedule_status: scheduleStatus,
          schedule_revision: next, verified_at: now, last_time_sync_at: s.lastSyncAt ? new Date(s.lastSyncAt) : cur.last_time_sync_at,
          ...(cur.open_status === 'TIME_SYNC_ERROR' ? { open_status_before_error: recalc((cur.open_status_before_error ?? 'SCHEDULED') as OpenStatus, scheduledAt, now) } : { open_status: nextOpen }),
          open_check_attempts: 0, updated_at: now,
        },
      });
      if (r.count === 0) throw err(409, 'SCHEDULE_REVISION_CONFLICT', '다른 사람이 먼저 바꿨습니다. 새로고침 후 다시 시도해 주세요.');
      if (nextOpen !== cur.open_status) {
        await tx.booking_phase_status_logs.create({ data: { booking_phase_id: cur.id, from_status: cur.open_status, to_status: nextOpen, reason: `일정 변경(r${next})`, actor: `admin:${user.id}`, revision: next, created_at: now } });
      }
      await enqueue(tx, [{ jobType: 'RECALC_NOTIFICATIONS', dedupeKey: keys.recalc(cur.id, next), runAt: now, timeSensitive: false, payload: { phaseId: Number(cur.id), revision: next }, phaseId: cur.id, revision: next }], now);
      return tx.booking_phases.findUniqueOrThrow({ where: { id: cur.id } });
    });
    return phaseView(updated);
  }

  /** 공식 일정을 다시 확인했는데 바뀐 게 없을 때 — verified_at만 갱신(revision 그대로) */
  async verifySchedule(id: number) {
    await this.phaseOr404(id);
    const s = this.sync.snapshot();
    const p = await this.prisma.booking_phases.update({
      where: { id }, data: { verified_at: new Date(), ...(s.lastSyncAt ? { last_time_sync_at: new Date(s.lastSyncAt) } : {}), updated_at: new Date() },
    });
    return phaseView(p);
  }

  /**
   * 실제 오픈 확인 기록(E-7) — 공식 일정과 별도 테이블. OPEN_CONFIRMED·CLOSED_CONFIRMED로 가는 유일한 길.
   * 관리자 수동 확정은 근거 메모 필수.
   */
  async recordVerification(id: number, body: any, user: AuthUser) {
    const p = await this.phaseOr404(id);
    const result = String(body?.result ?? '');
    if (!['OPEN', 'NOT_OPEN', 'CLOSED', 'ERROR'].includes(result)) throw AppError.badInput('result는 OPEN·NOT_OPEN·CLOSED·ERROR 중 하나여야 합니다.');
    const method = String(body?.method ?? 'ADMIN_CONFIRM');
    if (!['OFFICIAL_API', 'OFFICIAL_PAGE', 'ADMIN_CONFIRM'].includes(method)) throw AppError.badInput('method는 OFFICIAL_API·OFFICIAL_PAGE·ADMIN_CONFIRM 중 하나여야 합니다.');
    const evidence = text(body?.evidence, '근거 메모', 500, method === 'ADMIN_CONFIRM');
    const observed = parseInstant(body?.observedOpenAt, 'observedOpenAt', false);
    const now = new Date();
    const to = applyVerification(p.open_status as OpenStatus, result as 'OPEN');
    const out = await this.prisma.$transaction(async (tx) => {
      await tx.booking_open_verifications.create({
        data: { booking_phase_id: p.id, schedule_revision: p.schedule_revision, checked_at: now, method, site: text(body?.site, '예매처', 50), result, evidence, observed_open_at: observed, checked_by: `admin:${user.id}` },
      });
      if (!to) return p;
      const r = await tx.booking_phases.updateMany({ where: { id: p.id, open_status: p.open_status, schedule_revision: p.schedule_revision }, data: { open_status: to, updated_at: now } });
      if (r.count === 0) throw err(409, 'SCHEDULE_REVISION_CONFLICT', '그사이 상태가 바뀌었습니다. 새로고침 후 다시 시도해 주세요.');
      await tx.booking_phase_status_logs.create({ data: { booking_phase_id: p.id, from_status: p.open_status, to_status: to, reason: `${method} ${result}${evidence ? ` — ${evidence}` : ''}`.slice(0, 300), actor: `admin:${user.id}`, revision: p.schedule_revision, created_at: now } });
      return tx.booking_phases.findUniqueOrThrow({ where: { id: p.id } });
    });
    const diffMs = observed ? observed.getTime() - p.scheduled_at.getTime() : null;
    return {
      phase: phaseView(out),
      changed: !!to,
      notice: to ? null : p.open_status === 'TIME_SYNC_ERROR' ? '서버 시간 오류 중이라 기록만 남겼습니다. 복구 뒤 다시 확정해 주세요.'
        : `현재 상태(${p.open_status})에서는 ${result} 결과로 상태가 바뀌지 않습니다. 기록만 남겼습니다.`,
      announcedVsObservedMs: diffMs,
    };
  }

  async history(id: number) {
    const p = await this.phaseOr404(id);
    const [revisions, logs, verifications] = await Promise.all([
      this.prisma.booking_phase_schedule_revisions.findMany({ where: { booking_phase_id: p.id }, orderBy: { revision: 'desc' } }),
      this.prisma.booking_phase_status_logs.findMany({ where: { booking_phase_id: p.id }, orderBy: { id: 'desc' }, take: 100 }),
      this.prisma.booking_open_verifications.findMany({ where: { booking_phase_id: p.id }, orderBy: { id: 'desc' }, take: 100 }),
    ]);
    return {
      phase: phaseView(p),
      revisions: revisions.map((r) => ({
        revision: r.revision, prevAnnouncedAt: iso(r.prev_announced_at), newAnnouncedAt: iso(r.new_announced_at), prevScheduledAt: iso(r.prev_scheduled_at), newScheduledAt: iso(r.new_scheduled_at),
        prevTimezone: r.prev_timezone, newTimezone: r.new_timezone, prevScheduleStatus: r.prev_schedule_status, newScheduleStatus: r.new_schedule_status,
        reason: r.reason, sourceUrl: r.source_url, timeSource: r.time_source, changedBy: r.changed_by, changedAt: iso(r.changed_at),
      })),
      statusLogs: logs.map((l) => ({ from: l.from_status, to: l.to_status, reason: l.reason, actor: l.actor, revision: l.revision, at: iso(l.created_at) })),
      verifications: verifications.map((v) => ({
        result: v.result, method: v.method, site: v.site, evidence: v.evidence, revision: v.schedule_revision, checkedAt: iso(v.checked_at), checkedBy: v.checked_by,
        observedOpenAt: iso(v.observed_open_at), diffFromScheduledMs: v.observed_open_at ? v.observed_open_at.getTime() - p.scheduled_at.getTime() : null,
      })),
    };
  }

  // ───────────── 카운트다운·다음 일정 (C·D) ─────────────

  async countdown(sessionId: number, phaseId?: number) {
    await this.sessionOr404(sessionId);
    const now = new Date();
    let p: Phase | null;
    if (phaseId) {
      p = await this.prisma.booking_phases.findFirst({ where: { id: phaseId, session_id: sessionId } });
      if (!p) throw err(404, 'PHASE_NOT_FOUND', '예매 일정을 찾을 수 없습니다.');
    } else {
      // 다음에 올 단계, 없으면 가장 최근 단계
      p = await this.prisma.booking_phases.findFirst({ where: { session_id: sessionId, scheduled_at: { gt: now }, schedule_status: { in: ACTIVE_SCHEDULE } }, orderBy: { scheduled_at: 'asc' } })
        ?? await this.prisma.booking_phases.findFirst({ where: { session_id: sessionId }, orderBy: { scheduled_at: 'desc' } });
      if (!p) throw err(404, 'PHASE_NOT_FOUND', '등록된 예매 일정이 없습니다.');
    }
    void this.sync.status().catch(() => undefined);
    const s = this.sync.snapshot();
    return countdownBody(p, new Date(), s.grade, s.offsetMs);
  }

  async nextBooking(limit: number, sessionId: number | undefined, scope: string, user?: AuthUser) {
    const now = new Date();
    let phaseIds: bigint[] | undefined;
    if (scope === 'mine') {
      if (!user) throw AppError.of('UNAUTHORIZED');
      phaseIds = (await this.prisma.ticket_notification_preferences.findMany({ where: { member_id: BigInt(user.id), enabled: true }, select: { booking_phase_id: true } })).map((x) => x.booking_phase_id);
    }
    const phases = await this.prisma.booking_phases.findMany({
      where: { scheduled_at: { gt: now }, schedule_status: { in: ACTIVE_SCHEDULE }, ...(sessionId ? { session_id: sessionId } : {}), ...(phaseIds ? { id: { in: phaseIds } } : {}) },
      orderBy: { scheduled_at: 'asc' }, take: Math.min(Math.max(limit, 1), 50),
    });
    const titles = new Map((await this.prisma.ticket_sessions.findMany({ where: { id: { in: phases.map((p) => p.session_id) } }, select: { id: true, title: true } })).map((x) => [x.id, x.title]));
    return { serverNowUtc: isoUtc(now), items: phases.map((p) => phaseView(p, { sessionTitle: titles.get(p.session_id) ?? null, remainingMs: p.scheduled_at.getTime() - now.getTime() })) };
  }

  // ───────────── 사용자 알림 설정 (F) ─────────────

  async getPreference(phaseId: number, user: AuthUser) {
    await this.phaseOr404(phaseId);
    const pref = await this.prisma.ticket_notification_preferences.findUnique({ where: { member_id_booking_phase_id: { member_id: BigInt(user.id), booking_phase_id: BigInt(phaseId) } } });
    return { phaseId, enabled: pref?.enabled ?? false, offsets: pref ? parseOffsets(pref.offsets) : DEFAULT_OFFSETS, available: Object.keys(OFFSETS) };
  }

  /** 알림 켜기·시점 바꾸기 — 이미 지난 시점은 만들지 않는다(30분 전에 켜면 10분·1분 전만) */
  async putPreference(phaseId: number, body: any, user: AuthUser) {
    const p = await this.phaseOr404(phaseId);
    if (p.schedule_status === 'CANCELLED') throw AppError.badInput('취소된 예매에는 알림을 설정할 수 없습니다.');
    let offsets: OffsetKey[];
    try {
      offsets = body?.offsets === undefined ? DEFAULT_OFFSETS : parseOffsets(body.offsets);
    } catch (e) {
      throw AppError.badInput((e as Error).message);
    }
    const enabled = body?.enabled !== false;
    if (enabled && !offsets.length) throw AppError.badInput('알림 시점을 하나 이상 골라 주세요.');
    const now = new Date();
    const member = BigInt(user.id);
    let created = 0;
    await this.prisma.$transaction(async (tx) => {
      await tx.ticket_notification_preferences.upsert({
        where: { member_id_booking_phase_id: { member_id: member, booking_phase_id: p.id } },
        create: { member_id: member, booking_phase_id: p.id, offsets: offsets.join(','), enabled, created_at: now, updated_at: now },
        update: { offsets: offsets.join(','), enabled, updated_at: now },
      });
      await cancelMemberNotifies(tx, member, p.id, now);
      if (enabled && ACTIVE_SCHEDULE.includes(p.schedule_status as ScheduleStatus)) {
        const jobs = notifyJobs(member, p, offsets, now);
        await reviveUnsubscribed(tx, jobs.map((j) => j.dedupeKey), now);
        await enqueue(tx, jobs, now);
        created = jobs.length;
      }
    });
    return { phaseId, enabled, offsets, scheduledReminders: created };
  }

  async deletePreference(phaseId: number, user: AuthUser) {
    const p = await this.phaseOr404(phaseId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.ticket_notification_preferences.deleteMany({ where: { member_id: BigInt(user.id), booking_phase_id: p.id } });
      await cancelMemberNotifies(tx, user.id, p.id, now);
    });
  }

  async notifications(user: AuthUser, page: number, size: number) {
    const rows = await this.prisma.ticket_notifications.findMany({ where: { member_id: BigInt(user.id) }, orderBy: { id: 'desc' }, skip: page * size, take: size + 1 });
    return {
      data: rows.slice(0, size).map((n) => ({ id: Number(n.id), phaseId: n.booking_phase_id ? Number(n.booking_phase_id) : null, kind: n.kind, message: n.message, read: n.is_read, createdAt: iso(n.created_at) })),
      unreadCount: await this.prisma.ticket_notifications.count({ where: { member_id: BigInt(user.id), is_read: false } }),
      page, size, hasNext: rows.length > size,
    };
  }

  async markRead(id: number, user: AuthUser) {
    const r = await this.prisma.ticket_notifications.updateMany({ where: { id, member_id: BigInt(user.id) }, data: { is_read: true } });
    if (!r.count) throw AppError.of('NOT_FOUND');
  }

  async unreadCount(user: AuthUser) {
    return { count: await this.prisma.ticket_notifications.count({ where: { member_id: BigInt(user.id), is_read: false } }) };
  }

  async markAllRead(user: AuthUser) {
    const r = await this.prisma.ticket_notifications.updateMany({ where: { member_id: BigInt(user.id), is_read: false }, data: { is_read: true } });
    return { updated: r.count };
  }

  /** 내가 켠 알림 — 지난 지 24시간 넘은 단계는 뺀다 */
  async myAlerts(user: AuthUser) {
    const prefs = await this.prisma.ticket_notification_preferences.findMany({ where: { member_id: BigInt(user.id), enabled: true } });
    if (!prefs.length) return [];
    const since = new Date(Date.now() - 86400_000);
    const phases = await this.prisma.booking_phases.findMany({ where: { id: { in: prefs.map((x) => x.booking_phase_id) }, scheduled_at: { gt: since } }, orderBy: { scheduled_at: 'asc' } });
    const titles = new Map((await this.prisma.ticket_sessions.findMany({ where: { id: { in: phases.map((p) => p.session_id) } }, select: { id: true, title: true } })).map((x) => [x.id, x.title]));
    const offsetsBy = new Map(prefs.map((x) => [x.booking_phase_id, x.offsets]));
    return phases.map((p) => ({
      phaseId: Number(p.id), sessionId: Number(p.session_id), sessionTitle: titles.get(p.session_id) ?? null, phaseName: p.name,
      scheduledAt: iso(p.scheduled_at), scheduleStatus: p.schedule_status, openStatus: p.open_status,
      offsets: (() => { try { return parseOffsets(offsetsBy.get(p.id) ?? ''); } catch { return []; } })(),
    }));
  }

  /** 단계 하나를 .ics로 — 공개 정보만 담는다 */
  async calendarIcs(phaseId: number) {
    const p = await this.phaseOr404(phaseId);
    const s = await this.prisma.ticket_sessions.findUniqueOrThrow({ where: { id: p.session_id } });
    const base = (process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://happiness.io.kr' : 'http://localhost:3000')).replace(/\/+$/, '');
    return buildIcs({
      id: Number(p.id), name: p.name, scheduledAt: p.scheduled_at, revision: p.schedule_revision, scheduleStatus: p.schedule_status,
      sessionTitle: s.title, venue: s.venue, url: `${base}/tickets/${Number(s.id)}`, updatedAt: p.updated_at,
    }, new Date());
  }

  // ───────────── 관리자: 작업 큐 ─────────────

  async listJobs(status: string, limit: number) {
    if (!['DEAD', 'PENDING', 'CLAIMED', 'SKIPPED'].includes(status)) throw AppError.badInput('status는 DEAD·PENDING·CLAIMED·SKIPPED 중 하나입니다.');
    const rows = await this.prisma.ticket_scheduled_jobs.findMany({ where: { status }, orderBy: { updated_at: 'desc' }, take: Math.min(Math.max(limit, 1), 100) });
    return rows.map((j) => ({
      id: Number(j.id), jobType: j.job_type, dedupeKey: j.dedupe_key, phaseId: j.booking_phase_id ? Number(j.booking_phase_id) : null,
      revision: j.schedule_revision, runAt: iso(j.run_at), status: j.status, attempts: j.attempts, maxAttempts: j.max_attempts,
      timeSensitive: j.time_sensitive, lastError: j.last_error, updatedAt: iso(j.updated_at),
    }));
  }

  /** DEAD 작업만 다시 대기열로. 늦은 알림은 처리기가 유예 시간 검사로 SKIPPED 처리하므로 늦게 나가지 않는다 */
  async retryJob(id: number) {
    const now = new Date();
    const r = await this.prisma.ticket_scheduled_jobs.updateMany({
      where: { id, status: 'DEAD' },
      data: { status: 'PENDING', attempts: 0, run_at: now, claimed_by: null, lease_until: null, finished_at: null, updated_at: now },
    });
    if (!r.count) {
      const exists = await this.prisma.ticket_scheduled_jobs.findUnique({ where: { id }, select: { status: true } });
      if (!exists) throw err(404, 'JOB_NOT_FOUND', '작업을 찾을 수 없습니다.');
      throw err(409, 'JOB_NOT_DEAD', `실패(DEAD) 상태인 작업만 다시 시도할 수 있습니다(지금: ${exists.status}).`);
    }
    return { id, status: 'PENDING' };
  }

  /** 관리자 본인에게 4가지 문구 미리보기를 보낸다(다른 사람에게는 안 감) */
  async testNotification(phaseId: number, user: AuthUser) {
    const p = await this.phaseOr404(phaseId);
    const session = await this.prisma.ticket_sessions.findUniqueOrThrow({ where: { id: p.session_id } });
    const t = new Date();
    const data = (Object.keys(OFFSETS) as OffsetKey[]).map((o) => ({
      dedupe_key: `test:${user.id}:${p.id}:${o}:${t.getTime()}`, member_id: BigInt(user.id), booking_phase_id: p.id, kind: 'TEST',
      message: `[테스트] ${reminderMessage(p.name, session.title, o, p.scheduled_at)}`, status: 'SENT', is_read: false, created_at: t,
    }));
    await this.prisma.ticket_notifications.createMany({ data, skipDuplicates: true });
    return { sent: data.length, messages: data.map((d) => d.message) };
  }
}

/** 한 회원·한 단계의 알림 작업 — fire_at = scheduled_at − offset, 이미 지난 시점은 뺀다 */
export function notifyJobs(memberId: bigint, p: Pick<Phase, 'id' | 'scheduled_at' | 'schedule_revision'>, offsets: OffsetKey[], now: Date): NewJob[] {
  return offsets
    .map((o) => ({ o, at: new Date(p.scheduled_at.getTime() - OFFSETS[o]) }))
    .filter(({ at }) => at.getTime() > now.getTime())
    .map(({ o, at }) => ({
      jobType: 'NOTIFY' as const, dedupeKey: keys.notify(memberId, p.id, o, p.schedule_revision), runAt: at, timeSensitive: true,
      payload: { memberId: Number(memberId), phaseId: Number(p.id), offset: o, revision: p.schedule_revision }, phaseId: p.id, revision: p.schedule_revision,
    }));
}
