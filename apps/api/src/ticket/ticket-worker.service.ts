import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { hostname } from 'node:os';
import { randomBytes } from 'node:crypto';
import { htmlEscape } from '../common/json-body.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TimeSyncService } from '../time/time.controller.js';
import { canTransition, OpenStatus, restoreAfterSyncError, ScheduleStatus, tick } from './open-status.js';
import { cancelStaleNotifies, claim, ClaimedJob, enqueue, fail, finish, recoverExpiredLeases } from './ticket-jobs.js';
import { cancelMessage, changeMessage, OffsetKey, parseOffsets, reminderMessage, withinGrace } from './ticket-time.js';
import { notifyJobs } from './ticket.service.js';

/** 서버 시간 상태로 시간 민감 작업을 멈출지 — UNHEALTHY거나 DB 시계와 500ms 넘게 차이나면 멈춘다 */
export function evaluateGuard(grade: string, dbSkewMs: number | null, force?: string): { healthy: boolean; grade: string; reason: string | null } {
  const g = force || grade;
  if (g === 'UNHEALTHY') return { healthy: false, grade: g, reason: force ? `강제 설정(FORCE_SYNC_STATUS=${force})` : '서버 시간 동기화 비정상(NTP 오차 초과 또는 오래된 측정)' };
  if (dbSkewMs !== null && Math.abs(dbSkewMs) > 500) return { healthy: false, grade: 'UNHEALTHY', reason: `DB 서버 시계와 ${Math.round(dbSkewMs)}ms 차이` };
  return { healthy: true, grade: g, reason: null };
}

const LEADER_LOCK = 734_221_901; // pg_try_advisory_xact_lock 키 — 상태 판정·장애 처리는 한 처리기만
const RECOVER_STREAK = 3;
const ALERT_EVERY_MS = 15 * 60_000;
const HEARTBEAT_MS = 30_000;

/**
 * 예매 일정 처리기(E). 앱 프로세스 안에서 1초마다 돈다(TICKET_WORKER_ENABLED=false로 끔).
 * - 리더(advisory lock을 잡은 하나): 오픈 상태 판정, 서버 시간 장애 진입·복구.
 * - 모두: 실행할 때가 된 작업을 SKIP LOCKED로 가져가 처리.
 * 수시간짜리 메모리 타이머에 기대지 않는다 — 재시작·시계 보정에도 DB 작업 표가 기준.
 */
@Injectable()
export class TicketWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger('TicketWorker');
  readonly workerId = `${hostname()}:${process.pid}:${randomBytes(3).toString('hex')}`;
  private timer?: NodeJS.Timeout;
  private running = false;
  private healthyStreak = 0;
  private dbSkewMs: number | null = null;
  private lastHeartbeat = 0;
  private leader = false;
  private paused = false;
  private recovered = 0;
  private skipped = 0;
  private readonly startedAt = new Date();

  constructor(private readonly prisma: PrismaService, private readonly sync: TimeSyncService, private readonly mail: MailService) {}

  get enabled() {
    return process.env.TICKET_WORKER_ENABLED !== 'false';
  }

  /** 운영에서는 장애 주입을 막는다 */
  private get forced(): string | undefined {
    if (process.env.NODE_ENV === 'production') return undefined;
    return process.env.FORCE_SYNC_STATUS || undefined;
  }

  async onApplicationBootstrap() {
    if (!this.enabled) return;
    try {
      // 재시작 복구 — 이전 처리기가 죽으며 남긴 임대 만료 작업을 되돌린다(놓친 알림은 실행할 때 유예 시간으로 거른다)
      this.recovered = await recoverExpiredLeases(this.prisma, new Date());
      if (this.recovered) this.log.log(`재시작 복구: 임대가 끝난 작업 ${this.recovered}건을 대기로 되돌림`);
    } catch (e) {
      this.log.error(`재시작 복구 실패: ${(e as Error).message}`);
    }
    const every = Math.max(200, Number(process.env.TICKET_WORKER_TICK_MS) || 1000);
    this.timer = setInterval(() => void this.runOnce(), every);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** 한 번 돌기 — 테스트·진단에서도 부른다 */
  async runOnce(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      if (now.getTime() - this.lastHeartbeat >= HEARTBEAT_MS) await this.measureDbSkew();
      const guard = evaluateGuard(this.sync.snapshot().grade, this.dbSkewMs, this.forced);
      this.healthyStreak = guard.healthy ? this.healthyStreak + 1 : 0;
      await this.leaderWork(guard, now);
      const incidentOpen = !!(await this.prisma.ticket_time_incidents.findFirst({ where: { ended_at: null }, select: { id: true } }));
      this.paused = !guard.healthy || incidentOpen;
      await this.processJobs(now, !this.paused);
      if (now.getTime() - this.lastHeartbeat >= HEARTBEAT_MS) await this.heartbeat(guard.grade, now);
    } catch (e) {
      this.log.error(`처리기 오류(다음 회차에 다시 시도): ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async measureDbSkew() {
    try {
      const t1 = Date.now();
      const [row] = await this.prisma.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const t2 = Date.now();
      this.dbSkewMs = row.now.getTime() - (t1 + t2) / 2;
    } catch {
      this.dbSkewMs = null;
    }
  }

  private async leaderWork(guard: ReturnType<typeof evaluateGuard>, now: Date) {
    await this.prisma.$transaction(async (tx) => {
      const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${LEADER_LOCK}) AS locked`;
      this.leader = !!lock?.locked;
      if (!this.leader) return;
      const open = await tx.ticket_time_incidents.findFirst({ where: { ended_at: null } });

      if (!guard.healthy) {
        const incident = open ?? await tx.ticket_time_incidents.create({ data: { reason: guard.reason ?? 'UNHEALTHY', started_at: now, last_alert_at: now } });
        if (!open) {
          this.log.warn(`서버 시간 장애 시작 — 시간 민감 작업 중단: ${incident.reason}`);
          await this.alertAdmins(tx, `incident:${incident.id}:start`, `⚠️ 서버 시간 동기화 비정상 — 예매 알림·오픈 판정을 멈췄습니다. (${incident.reason})`, now);
        } else if (now.getTime() - open.last_alert_at.getTime() >= ALERT_EVERY_MS) {
          await tx.ticket_time_incidents.update({ where: { id: open.id }, data: { last_alert_at: now } });
          await this.alertAdmins(tx, `incident:${open.id}:remind:${now.getTime()}`, `⚠️ 서버 시간 동기화 비정상이 계속되고 있습니다(${Math.round((now.getTime() - open.started_at.getTime()) / 60000)}분째).`, now);
        }
        // 진행 중인 단계를 TIME_SYNC_ERROR로(원래 상태는 보관). 종료(CLOSED_CONFIRMED)는 그대로
        const targets = await tx.booking_phases.findMany({ where: { open_status: { notIn: ['CLOSED_CONFIRMED', 'TIME_SYNC_ERROR'] }, schedule_status: { notIn: ['CANCELLED'] } } });
        for (const p of targets) {
          if (!canTransition(p.open_status as OpenStatus, 'TIME_SYNC_ERROR', 'SYNC_ERROR')) continue;
          const r = await tx.booking_phases.updateMany({ where: { id: p.id, open_status: p.open_status }, data: { open_status: 'TIME_SYNC_ERROR', open_status_before_error: p.open_status, updated_at: now } });
          if (r.count) await tx.booking_phase_status_logs.create({ data: { booking_phase_id: p.id, from_status: p.open_status, to_status: 'TIME_SYNC_ERROR', reason: guard.reason?.slice(0, 300), actor: 'system:worker', revision: p.schedule_revision, created_at: now } });
        }
        return;
      }

      if (open) {
        if (this.healthyStreak < RECOVER_STREAK) return; // 연속 3번 정상일 때까지 기다린다
        const errored = await tx.booking_phases.findMany({ where: { open_status: 'TIME_SYNC_ERROR' } });
        for (const p of errored) {
          const to = restoreAfterSyncError(p.open_status_before_error as OpenStatus | null, p.scheduled_at, now);
          const r = await tx.booking_phases.updateMany({ where: { id: p.id, open_status: 'TIME_SYNC_ERROR' }, data: { open_status: to, open_status_before_error: null, updated_at: now } });
          if (r.count) await tx.booking_phase_status_logs.create({ data: { booking_phase_id: p.id, from_status: 'TIME_SYNC_ERROR', to_status: to, reason: '서버 시간 복구 — 다시 판정', actor: 'system:worker', revision: p.schedule_revision, created_at: now } });
        }
        await tx.ticket_time_incidents.update({ where: { id: open.id }, data: { ended_at: now } });
        this.log.log('서버 시간 복구 — 시간 민감 작업 재개');
        await this.alertAdmins(tx, `incident:${open.id}:end`, `✅ 서버 시간 동기화가 복구되어 예매 알림·오픈 판정을 다시 시작했습니다.`, now);
      }

      // 오픈 상태 판정 — 1시간 안으로 들어온 SCHEDULED, 예정 시각이 지난 UPCOMING, 확인 대기 시간 초과
      const soon = new Date(now.getTime() + 3600_000);
      const due = await tx.booking_phases.findMany({
        where: { OR: [{ open_status: { in: ['SCHEDULED', 'UPCOMING'] }, scheduled_at: { lte: soon } }, { open_status: 'OPEN_CHECK_PENDING' }] },
      });
      for (const p of due) {
        let since: Date | null = null;
        if (p.open_status === 'OPEN_CHECK_PENDING') {
          since = (await tx.booking_phase_status_logs.findFirst({ where: { booking_phase_id: p.id, to_status: 'OPEN_CHECK_PENDING' }, orderBy: { id: 'desc' }, select: { created_at: true } }))?.created_at ?? p.updated_at;
        }
        const next = tick({ openStatus: p.open_status as OpenStatus, scheduledAt: p.scheduled_at, checkPendingSince: since, scheduleStatus: p.schedule_status as ScheduleStatus }, now);
        if (!next) continue;
        // 같은 revision·같은 상태일 때만 — 두 번 돌아도 한 번만 바뀐다(멱등)
        const r = await tx.booking_phases.updateMany({ where: { id: p.id, open_status: p.open_status, schedule_revision: p.schedule_revision }, data: { open_status: next.to, updated_at: now } });
        if (r.count) await tx.booking_phase_status_logs.create({ data: { booking_phase_id: p.id, from_status: p.open_status, to_status: next.to, reason: next.reason, actor: 'system:worker', revision: p.schedule_revision, created_at: now } });
      }
    }, { timeout: 15_000 });
  }

  private async processJobs(now: Date, allowTimeSensitive: boolean) {
    const jobs = await claim(this.prisma, this.workerId, now, allowTimeSensitive);
    for (const job of jobs) {
      try {
        const result = job.job_type === 'NOTIFY' ? await this.runNotify(job, new Date()) : await this.runRecalc(job, new Date());
        await finish(this.prisma, job.id, this.workerId, result.status, new Date(), result.note);
        if (result.status === 'SKIPPED') this.skipped++;
      } catch (e) {
        const dead = await fail(this.prisma, job, this.workerId, (e as Error).message, new Date());
        if (dead) {
          this.log.error(`작업 DEAD: ${job.dedupe_key} — ${(e as Error).message}`);
          await this.alertAdmins(this.prisma, `dead:${job.id}`, `작업이 ${job.attempts}번 실패해 중단되었습니다: ${job.job_type} ${job.dedupe_key}`, new Date());
        }
      }
    }
  }

  /** 알림 발송 직전 재검증 — revision이 바뀌었거나 취소·연기면 보내지 않는다. 늦었으면 유예 시간 안에서만 */
  private async runNotify(job: ClaimedJob, now: Date): Promise<{ status: 'SUCCEEDED' | 'SKIPPED' | 'CANCELLED'; note?: string }> {
    const pl = JSON.parse(job.payload ?? '{}') as { memberId: number; phaseId: number; offset: OffsetKey; revision: number };
    const p = await this.prisma.booking_phases.findUnique({ where: { id: pl.phaseId } });
    if (!p || p.schedule_revision !== pl.revision) return { status: 'CANCELLED', note: 'SCHEDULE_CHANGED' };
    if (p.schedule_status === 'CANCELLED' || p.schedule_status === 'POSTPONED') return { status: 'CANCELLED', note: p.schedule_status };
    const pref = await this.prisma.ticket_notification_preferences.findUnique({ where: { member_id_booking_phase_id: { member_id: BigInt(pl.memberId), booking_phase_id: p.id } } });
    if (!pref?.enabled || !parseOffsets(pref.offsets).includes(pl.offset)) return { status: 'CANCELLED', note: 'UNSUBSCRIBED' };
    if (!withinGrace(job.run_at, pl.offset, p.scheduled_at, now)) return { status: 'SKIPPED', note: 'MISSED_WINDOW' };
    const s = await this.prisma.ticket_sessions.findUnique({ where: { id: p.session_id }, select: { title: true } });
    const message = reminderMessage(p.name, s?.title ?? '예매', pl.offset, p.scheduled_at);
    // 발송 기록을 같은 dedupe_key로 선점 — 이미 있으면 보내지 않는다(중복 발송 방지)
    const r = await this.prisma.ticket_notifications.createMany({
      data: [{ dedupe_key: job.dedupe_key, member_id: BigInt(pl.memberId), booking_phase_id: p.id, kind: 'REMINDER', message, status: 'SENT', is_read: false, created_at: now }],
      skipDuplicates: true,
    });
    if (!r.count) return { status: 'SKIPPED', note: 'ALREADY_SENT' };
    // 인앱 알림을 새로 만든 경우에만 메일 1통 — 같은 알림이 메일로 두 번 가지 않는다
    if (pref.email_enabled) await this.emailMembers([BigInt(pl.memberId)], message, Number(p.session_id));
    return { status: 'SUCCEEDED' };
  }

  /** 일정 변경 후 — 변경 고지 1회, 이전 revision 대기 알림 취소, 새 revision 기준 재생성 */
  private async runRecalc(job: ClaimedJob, now: Date): Promise<{ status: 'SUCCEEDED' | 'SKIPPED'; note?: string }> {
    const pl = JSON.parse(job.payload ?? '{}') as { phaseId: number; revision: number };
    const p = await this.prisma.booking_phases.findUnique({ where: { id: pl.phaseId } });
    if (!p) return { status: 'SKIPPED', note: 'PHASE_GONE' };
    if (p.schedule_revision !== pl.revision) return { status: 'SKIPPED', note: 'SUPERSEDED' }; // 그 뒤에 또 바뀜 — 마지막 revision만 유효
    const rev = await this.prisma.booking_phase_schedule_revisions.findUnique({ where: { booking_phase_id_revision: { booking_phase_id: p.id, revision: pl.revision } } });
    const session = await this.prisma.ticket_sessions.findUnique({ where: { id: p.session_id }, select: { title: true } });
    const prefs = await this.prisma.ticket_notification_preferences.findMany({ where: { booking_phase_id: p.id, enabled: true } });
    const cancelled = await cancelStaleNotifies(this.prisma, p.id, p.schedule_revision, now);

    const stopped = p.schedule_status === 'CANCELLED' || p.schedule_status === 'POSTPONED';
    const timeChanged = rev && (rev.prev_scheduled_at?.getTime() !== rev.new_scheduled_at?.getTime());
    const statusStopped = rev && stopped && rev.prev_schedule_status !== rev.new_schedule_status;
    if (rev && (timeChanged || statusStopped)) {
      const message = stopped ? cancelMessage(p.name, session?.title ?? '예매', p.schedule_status as 'CANCELLED', rev.reason)
        : changeMessage(p.name, session?.title ?? '예매', rev.prev_scheduled_at, p.scheduled_at, rev.reason);
      const keyOf = (m: bigint) => `notify_change:${m}:${p.id}:${p.schedule_revision}`;
      const existing = new Set((await this.prisma.ticket_notifications.findMany({ where: { dedupe_key: { in: prefs.map((x) => keyOf(x.member_id)) } }, select: { dedupe_key: true } })).map((x) => x.dedupe_key));
      await this.prisma.ticket_notifications.createMany({
        data: prefs.map((x) => ({ dedupe_key: keyOf(x.member_id), member_id: x.member_id, booking_phase_id: p.id, kind: stopped ? 'CANCEL' : 'CHANGE', message, status: 'SENT', is_read: false, created_at: now })),
        skipDuplicates: true,
      });
      // 이번에 처음 고지한 사람 중 메일을 켠 사람만
      await this.emailMembers(prefs.filter((x) => x.email_enabled && !existing.has(keyOf(x.member_id))).map((x) => x.member_id), message, Number(p.session_id));
    }
    let created = 0;
    if (!stopped) {
      for (const x of prefs) created += await enqueue(this.prisma, notifyJobs(x.member_id, p, parseOffsets(x.offsets), now), now);
    }
    return { status: 'SUCCEEDED', note: `취소 ${cancelled}·새로 ${created}` };
  }

  /** 메일 — 회원 본인 주소로만, 회원 전체 메일 수신(email_notifications)을 끈 사람은 건너뜀. 실패·미설정은 작업을 실패시키지 않는다 */
  private async emailMembers(memberIds: bigint[], message: string, sessionId: number) {
    if (!memberIds.length || !process.env.MAIL_HOST) return;
    const members = await this.prisma.members.findMany({ where: { id: { in: memberIds }, email_notifications: true }, select: { id: true, email: true } });
    const base = (process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://happiness.io.kr' : 'http://localhost:3000')).replace(/\/+$/, '');
    const link = `${base}/tickets/${sessionId}`;
    const html = `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#191F28">`
      + `<p>${htmlEscape(message)}</p>`
      + `<p><a href="${htmlEscape(link)}" style="color:#3182F6">예매 일정 보기</a></p>`
      + `<p style="font-size:12px;color:#8B95A1">Happiness에서 켠 예매 알림입니다. 알림함 › 켠 알림에서 메일 받기를 끌 수 있어요.</p></div>`;
    const subject = `[Happiness] ${message.replace(/[\r\n]+/g, ' ').slice(0, 80)}`;
    for (const m of members) {
      const sent = await Promise.race([
        this.mail.send(m.email, subject, html, 'ticket-alert'),
        new Promise<boolean>((r) => setTimeout(() => r(false), 10_000)),
      ]);
      if (!sent) this.log.warn(`예매 알림 메일을 보내지 못했습니다(회원 ${m.id}).`);
    }
  }

  private async alertAdmins(db: Pick<PrismaService, 'members' | 'ticket_notifications'>, key: string, message: string, now: Date) {
    const admins = await db.members.findMany({ where: { authority: { in: ['WM', 'SA'] } }, select: { id: true } });
    if (!admins.length) return;
    await db.ticket_notifications.createMany({
      data: admins.map((a) => ({ dedupe_key: `${key}:${a.id}`.slice(0, 200), member_id: a.id, booking_phase_id: null, kind: 'ADMIN_ALERT', message: message.slice(0, 500), status: 'SENT', is_read: false, created_at: now })),
      skipDuplicates: true,
    });
  }

  private async heartbeat(grade: string, now: Date) {
    this.lastHeartbeat = now.getTime();
    try {
      const oldest = await this.prisma.ticket_scheduled_jobs.findFirst({ where: { status: 'PENDING', run_at: { lte: now } }, orderBy: { run_at: 'asc' }, select: { run_at: true } });
      const s = this.sync.snapshot();
      const data = {
        host: hostname().slice(0, 100), grade, offset_ms: s.offsetMs, db_skew_ms: this.dbSkewMs, queue_lag_ms: oldest ? BigInt(now.getTime() - oldest.run_at.getTime()) : BigInt(0),
        paused: this.paused, leader: this.leader, recovered_count: this.recovered, skipped_count: this.skipped, checked_at: now,
      };
      await this.prisma.ticket_worker_heartbeats.upsert({ where: { worker_id: this.workerId }, create: { worker_id: this.workerId, started_at: this.startedAt, ...data }, update: data });
    } catch (e) {
      this.log.warn(`heartbeat 기록 실패: ${(e as Error).message}`);
    }
  }
}
