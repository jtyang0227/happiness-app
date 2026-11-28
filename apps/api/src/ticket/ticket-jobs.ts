import type { PrismaService } from '../prisma/prisma.service.js';
import { backoffMs } from './ticket-time.js';

/**
 * 영속 작업 큐(E-3~E-5) — 먼 미래 작업도 DB에 두고, 처리기는 1초마다 "실행할 때가 된 것"만 가져간다.
 * - 같은 논리 작업은 dedupe_key UNIQUE로 한 행만(INSERT … ON CONFLICT DO NOTHING).
 * - 가져가기는 FOR UPDATE SKIP LOCKED — 처리기가 여러 개여도 한 작업은 한 곳에서만.
 * - 가져간 작업은 임대(lease) 60초. 처리기가 죽으면 임대가 끝난 작업을 다음 처리기가 PENDING으로 되돌린다.
 */

export type JobType = 'NOTIFY' | 'RECALC_NOTIFICATIONS';
export type JobStatus = 'PENDING' | 'CLAIMED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'SKIPPED' | 'DEAD';

export interface NewJob {
  jobType: JobType;
  dedupeKey: string;
  runAt: Date;
  timeSensitive: boolean;
  payload: Record<string, unknown>;
  phaseId?: bigint | number | null;
  revision?: number | null;
  maxAttempts?: number;
}

export interface ClaimedJob {
  id: bigint;
  job_type: JobType;
  dedupe_key: string;
  payload: string | null;
  run_at: Date;
  attempts: number;
  max_attempts: number;
  time_sensitive: boolean;
  booking_phase_id: bigint | null;
  schedule_revision: number | null;
}

export const LEASE_MS = 60_000;

type Db = Pick<PrismaService, 'ticket_scheduled_jobs' | '$queryRaw' | '$executeRaw'>;

/** 넣은 개수(이미 있던 것은 세지 않음) */
export async function enqueue(db: Pick<PrismaService, 'ticket_scheduled_jobs'>, jobs: NewJob[], now: Date): Promise<number> {
  if (!jobs.length) return 0;
  const r = await db.ticket_scheduled_jobs.createMany({
    data: jobs.map((j) => ({
      job_type: j.jobType, dedupe_key: j.dedupeKey, run_at: j.runAt, time_sensitive: j.timeSensitive, payload: JSON.stringify(j.payload),
      booking_phase_id: j.phaseId != null ? BigInt(j.phaseId) : null, schedule_revision: j.revision ?? null,
      status: 'PENDING', attempts: 0, max_attempts: j.maxAttempts ?? 5, created_at: now, updated_at: now,
    })),
    skipDuplicates: true,
  });
  return r.count;
}

/** 실행할 때가 된 작업을 가져간다. allowTimeSensitive=false(서버 시간 비정상)면 시간 민감 작업은 남겨 둔다 */
export async function claim(db: Db, workerId: string, now: Date, allowTimeSensitive: boolean, limit = 20): Promise<ClaimedJob[]> {
  const lease = new Date(now.getTime() + LEASE_MS);
  return db.$queryRaw<ClaimedJob[]>`
    UPDATE ticket_scheduled_jobs SET status = 'CLAIMED', claimed_by = ${workerId}, lease_until = ${lease}, attempts = attempts + 1, updated_at = ${now}
    WHERE id IN (
      SELECT id FROM ticket_scheduled_jobs
      WHERE status = 'PENDING' AND run_at <= ${now} AND (${allowTimeSensitive}::boolean OR time_sensitive = false)
      ORDER BY run_at, id LIMIT ${limit}::int
      FOR UPDATE SKIP LOCKED)
    RETURNING id, job_type, dedupe_key, payload, run_at, attempts, max_attempts, time_sensitive, booking_phase_id, schedule_revision`;
}

/** 재시작 복구 — 임대가 끝났는데 CLAIMED로 남은 작업(처리기가 죽은 것)을 다시 PENDING으로 */
export async function recoverExpiredLeases(db: Pick<PrismaService, 'ticket_scheduled_jobs'>, now: Date): Promise<number> {
  const r = await db.ticket_scheduled_jobs.updateMany({
    where: { status: 'CLAIMED', lease_until: { lt: now } },
    data: { status: 'PENDING', claimed_by: null, lease_until: null, updated_at: now },
  });
  return r.count;
}

export async function finish(db: Pick<PrismaService, 'ticket_scheduled_jobs'>, id: bigint, workerId: string, status: 'SUCCEEDED' | 'SKIPPED' | 'CANCELLED', now: Date, note?: string) {
  // 내 임대일 때만 — 임대가 끝나 다른 처리기가 가져갔다면 건드리지 않는다
  await db.ticket_scheduled_jobs.updateMany({
    where: { id, status: 'CLAIMED', claimed_by: workerId },
    data: { status, finished_at: now, updated_at: now, lease_until: null, last_error: note?.slice(0, 500) ?? null },
  });
}

/** 실패 — 재시도 남았으면 백오프 뒤 PENDING, 아니면 DEAD. DEAD가 됐으면 true */
export async function fail(db: Pick<PrismaService, 'ticket_scheduled_jobs'>, job: ClaimedJob, workerId: string, error: string, now: Date): Promise<boolean> {
  const dead = job.attempts >= job.max_attempts;
  await db.ticket_scheduled_jobs.updateMany({
    where: { id: job.id, status: 'CLAIMED', claimed_by: workerId },
    data: dead
      ? { status: 'DEAD', finished_at: now, updated_at: now, lease_until: null, last_error: error.slice(0, 500) }
      : { status: 'PENDING', run_at: new Date(now.getTime() + backoffMs(job.attempts)), claimed_by: null, lease_until: null, updated_at: now, last_error: error.slice(0, 500) },
  });
  return dead;
}

/** 일정이 바뀌면 이전 revision으로 만든 대기 알림을 한 번에 취소 */
export async function cancelStaleNotifies(db: Pick<PrismaService, 'ticket_scheduled_jobs'>, phaseId: bigint | number, currentRevision: number, now: Date): Promise<number> {
  const r = await db.ticket_scheduled_jobs.updateMany({
    where: { job_type: 'NOTIFY', status: 'PENDING', booking_phase_id: BigInt(phaseId), NOT: { schedule_revision: currentRevision } },
    data: { status: 'CANCELLED', finished_at: now, updated_at: now, last_error: 'SCHEDULE_CHANGED' },
  });
  return r.count;
}

/** 한 회원의 한 단계 대기 알림 취소(구독 해제·시점 변경) */
export async function cancelMemberNotifies(db: Pick<PrismaService, 'ticket_scheduled_jobs'>, memberId: bigint | number, phaseId: bigint | number, now: Date): Promise<number> {
  const r = await db.ticket_scheduled_jobs.updateMany({
    where: { job_type: 'NOTIFY', status: 'PENDING', booking_phase_id: BigInt(phaseId), dedupe_key: { startsWith: `notify:${memberId}:${phaseId}:` } },
    data: { status: 'CANCELLED', finished_at: now, updated_at: now, last_error: 'UNSUBSCRIBED' },
  });
  return r.count;
}

/** 구독을 다시 켰을 때 — 같은 revision에서 해제로 취소됐던 알림 작업을 되살린다(dedupe_key가 남아 있어 새로 못 넣으므로) */
export async function reviveUnsubscribed(db: Pick<PrismaService, 'ticket_scheduled_jobs'>, keys: string[], now: Date): Promise<number> {
  if (!keys.length) return 0;
  const r = await db.ticket_scheduled_jobs.updateMany({
    where: { dedupe_key: { in: keys }, status: 'CANCELLED', last_error: 'UNSUBSCRIBED' },
    data: { status: 'PENDING', attempts: 0, finished_at: null, last_error: null, updated_at: now },
  });
  return r.count;
}
