import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { isoUtc, nowBody } from '../time/time-sync.js';
import { TimeSyncService } from '../time/time.controller.js';
import { evaluateGuard, TicketWorkerService } from './ticket-worker.service.js';
import { phaseView } from './ticket.service.js';

const iso = (d: Date | null | undefined) => (d ? isoUtc(d) : null);
const STALE_VERIFY_MS = 24 * 3600_000;
const STALE_HEARTBEAT_MS = 2 * 60_000;

/** 관리자 모니터링(H) — 시계·다음 일정·변경 이력·처리기 상태를 한 번에 */
@Injectable()
export class TicketMonitorService {
  constructor(private readonly prisma: PrismaService, private readonly sync: TimeSyncService, private readonly worker: TicketWorkerService) {}

  async overview() {
    const receivedAt = new Date();
    const status = await this.sync.status();
    const now = new Date();
    const upcoming = await this.prisma.booking_phases.findMany({
      where: { OR: [{ scheduled_at: { gt: now } }, { open_status: { in: ['OPEN_CHECK_PENDING', 'UNKNOWN', 'TIME_SYNC_ERROR', 'OPEN_CONFIRMED'] } }] },
      orderBy: { scheduled_at: 'asc' }, take: 20,
    });
    const ids = upcoming.map((p) => p.id);
    const [sessions, pendingCounts, recentRevisions, workers, queue, incidents, unknownDeliveries] = await Promise.all([
      this.prisma.ticket_sessions.findMany({ where: { id: { in: upcoming.map((p) => p.session_id) } }, select: { id: true, title: true } }),
      this.prisma.ticket_scheduled_jobs.groupBy({ by: ['booking_phase_id'], where: { job_type: 'NOTIFY', status: 'PENDING', booking_phase_id: { in: ids } }, _count: { _all: true } }),
      this.prisma.booking_phase_schedule_revisions.findMany({ where: { revision: { gt: 1 } }, orderBy: { id: 'desc' }, take: 20 }),
      this.prisma.ticket_worker_heartbeats.findMany({ orderBy: { checked_at: 'desc' }, take: 20 }),
      this.queueStats(now),
      this.prisma.ticket_time_incidents.findMany({ orderBy: { id: 'desc' }, take: 10 }),
      this.prisma.ticket_notifications.count({ where: { status: 'UNKNOWN_DELIVERY' } }),
    ]);
    const titles = new Map(sessions.map((s) => [s.id, s.title]));
    const counts = new Map(pendingCounts.map((c) => [c.booking_phase_id, c._count._all]));
    const revPhases = await this.prisma.booking_phases.findMany({ where: { id: { in: recentRevisions.map((r) => r.booking_phase_id) } }, select: { id: true, name: true, session_id: true } });
    const revPhaseById = new Map(revPhases.map((p) => [p.id, p]));
    const revTitles = new Map((await this.prisma.ticket_sessions.findMany({ where: { id: { in: revPhases.map((p) => p.session_id) } }, select: { id: true, title: true } })).map((s) => [s.id, s.title]));

    return {
      ...nowBody(now, receivedAt, undefined, status),
      status,
      guard: evaluateGuard(status.grade, null),
      upcoming: upcoming.map((p) => phaseView(p, {
        sessionTitle: titles.get(p.session_id) ?? null,
        remainingMs: p.scheduled_at.getTime() - now.getTime(),
        pendingReminders: counts.get(p.id) ?? 0,
        verifyStale: !p.verified_at || now.getTime() - p.verified_at.getTime() > STALE_VERIFY_MS,
      })),
      recentChanges: recentRevisions.map((r) => {
        const ph = revPhaseById.get(r.booking_phase_id);
        return {
          phaseId: Number(r.booking_phase_id), phaseName: ph?.name ?? null, sessionTitle: ph ? revTitles.get(ph.session_id) ?? null : null, revision: r.revision,
          prevScheduledAt: iso(r.prev_scheduled_at), newScheduledAt: iso(r.new_scheduled_at), prevScheduleStatus: r.prev_schedule_status, newScheduleStatus: r.new_schedule_status,
          reason: r.reason, sourceUrl: r.source_url, changedBy: r.changed_by, changedAt: iso(r.changed_at),
        };
      }),
      workers: workers.map((w) => ({
        workerId: w.worker_id, host: w.host, grade: w.grade, offsetMs: w.offset_ms, dbSkewMs: w.db_skew_ms === null ? null : Math.round(w.db_skew_ms),
        queueLagMs: Number(w.queue_lag_ms ?? 0), paused: w.paused, leader: w.leader, recoveredCount: w.recovered_count, skippedCount: w.skipped_count,
        startedAt: iso(w.started_at), checkedAt: iso(w.checked_at), stale: now.getTime() - w.checked_at.getTime() > STALE_HEARTBEAT_MS,
      })),
      queue,
      incidents: incidents.map((i) => ({ id: Number(i.id), reason: i.reason, startedAt: iso(i.started_at), endedAt: iso(i.ended_at) })),
      unknownDeliveries,
      workerEnabledHere: this.worker.enabled,
    };
  }

  private async queueStats(now: Date) {
    const [byStatus, oldestDue, expiredLeases] = await Promise.all([
      this.prisma.ticket_scheduled_jobs.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.ticket_scheduled_jobs.findFirst({ where: { status: 'PENDING', run_at: { lte: now } }, orderBy: { run_at: 'asc' }, select: { run_at: true } }),
      this.prisma.ticket_scheduled_jobs.count({ where: { status: 'CLAIMED', lease_until: { lt: now } } }),
    ]);
    const c = Object.fromEntries(byStatus.map((b) => [b.status, b._count._all]));
    return {
      pending: c.PENDING ?? 0, claimed: c.CLAIMED ?? 0, succeeded: c.SUCCEEDED ?? 0, skipped: c.SKIPPED ?? 0, cancelled: c.CANCELLED ?? 0, dead: c.DEAD ?? 0,
      dueLagMs: oldestDue ? now.getTime() - oldestDue.run_at.getTime() : 0, expiredLeases,
    };
  }

  /** 진단(PROMPT 9장) — 외부 NTP 다시 측정, DB 시계 차이, 시간대 설정, 큐 점검 */
  async diagnostics() {
    const receivedAt = new Date();
    await this.sync.check();
    const status = this.sync.snapshot();
    const t1 = Date.now();
    const [row] = await this.prisma.$queryRaw<{ now: Date; tz: string }[]>`SELECT clock_timestamp() AS now, current_setting('TimeZone') AS tz`;
    const t2 = Date.now();
    const now = new Date();
    return {
      ...nowBody(now, receivedAt, undefined, status),
      status,
      db: { skewMs: Math.round(row.now.getTime() - (t1 + t2) / 2), roundTripMs: t2 - t1, sessionTimeZone: row.tz },
      process: { tz: process.env.TZ ?? null, resolvedTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, icuTzData: process.versions.tz ?? null },
      queue: await this.queueStats(now),
      worker: { id: this.worker.workerId, enabled: this.worker.enabled },
    };
  }
}
