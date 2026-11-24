import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Prisma } from '../../generated/admin-prisma/client.js';
import { isBlank, jsonString } from '../../common/json-body.js';
import { springPage } from '../../common/page.js';
import { localDate, localDateTime } from '../../common/time.js';
import { AdminPrismaService } from '../admin-prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-auth.middleware.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { AdminActivityRecorder } from '../common/activity-recorder.js';
import { IllegalArgument, invalidRequest } from '../common/admin-errors.js';
import { intParam, longParam, optBoolParam, optLongParam, optStrParam, pageRequest, pageResponse } from '../common/admin-params.js';
import { ClientIp, jsonField, objectBody, stringMap } from '../common/admin-request.js';
import { enumValueOf } from '../member/admin-member.service.js';
import { PrivacyAccessRecorder, requireReason } from '../privacy/privacy-access-recorder.js';
import { PrivacyMasker } from '../privacy/privacy-masker.js';

const blankToNull = (s: string | null) => (s !== null && !isBlank(s) ? s : null);
const num = (v: bigint | null | undefined) => (v === null || v === undefined ? null : Number(v));

async function memberNames(prisma: AdminPrismaService, ids: Array<bigint | null>) {
  const distinct = [...new Set(ids.filter((x): x is bigint => x !== null))];
  if (!distinct.length) return new Map<bigint, string>();
  return new Map((await prisma.members.findMany({ where: { id: { in: distinct } }, select: { id: true, name: true } })).map((m) => [m.id, m.name]));
}

/** ISO 날짜(yyyy-MM-dd) @RequestParam — 형식이 틀리면 400 */
function isoDateParam(v: unknown, required: boolean): Date | null {
  const s = optStrParam(v);
  if (s === null || s === '') {
    if (required) throw invalidRequest();
    return null;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw invalidRequest();
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) throw invalidRequest();
  return d;
}

const INQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ON_HOLD'] as const;

@Controller('api/admin/inquiries')
export class AdminInquiryController {
  constructor(private readonly prisma: AdminPrismaService) {}

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const senderId = optLongParam(q.senderId);
    const receiverId = optLongParam(q.receiverId);
    const isRead = optBoolParam(q.isRead);
    const shootType = optStrParam(q.shootType);
    const processStatus = optStrParam(q.processStatus);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const p = pageRequest(page, size);
    const ps = processStatus !== null && !isBlank(processStatus) ? enumValueOf('InquiryProcessStatus', INQUIRY_STATUSES, processStatus) : null;
    const where = Prisma.sql`(${senderId}::bigint IS NULL OR i.sender_id = ${senderId}::bigint) AND (${receiverId}::bigint IS NULL OR r.id = ${receiverId}::bigint)
      AND (${isRead}::boolean IS NULL OR i.is_read = ${isRead}::boolean) AND (${shootType}::text IS NULL OR i.shoot_type = ${shootType}::text)
      AND (${ps}::text IS NULL OR i.process_status = ${ps}::text)`;
    type Row = { id: bigint; sender_id: bigint | null; receiver_id: bigint | null; sender_name: string | null; sender_email: string | null; receiver_name: string | null;
      receiver_profile: string | null; shoot_type: string | null; shoot_date: Date | null; budget: string | null; message: string | null; is_read: boolean; process_status: string; created_at: Date };
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<Row[]>`SELECT i.id, i.sender_id, r.id AS receiver_id, i.sender_name, i.sender_email, r.name AS receiver_name, r.profile_name AS receiver_profile,
        i.shoot_type, i.shoot_date, i.budget, i.message, i.is_read, i.process_status, i.created_at
        FROM inquiries i LEFT JOIN members r ON r.id = i.receiver_id WHERE ${where} ORDER BY i.created_at DESC LIMIT ${p.take} OFFSET ${p.skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM inquiries i LEFT JOIN members r ON r.id = i.receiver_id WHERE ${where}`,
    ]);
    const content = rows.map((i) => ({
      id: Number(i.id), senderId: num(i.sender_id), receiverId: num(i.receiver_id), senderName: i.sender_name, senderEmail: PrivacyMasker.email(i.sender_email),
      receiverName: i.receiver_name, receiverProfileName: i.receiver_profile, shootType: i.shoot_type, shootDate: localDate(i.shoot_date), budget: i.budget,
      message: i.message, processStatus: i.process_status, createdAt: localDateTime(i.created_at),
      // Lombok isRead → JSON read, 필드명과 달라 맨 뒤
      read: i.is_read,
    }));
    return pageResponse(content, page, size, Number(total[0].c));
  }

  private async find(id: number) {
    const i = await this.prisma.inquiries.findUnique({ where: { id: BigInt(id) } });
    if (!i) throw new IllegalArgument('문의를 찾을 수 없습니다.');
    return i;
  }

  @Patch('read-all')
  async markAllRead() {
    const r = await this.prisma.inquiries.updateMany({ where: { is_read: false }, data: { is_read: true } });
    return { message: '모든 미읽음 문의를 읽음 처리했습니다.', count: r.count };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    const i = await this.find(longParam(id));
    if (!i.is_read) await this.prisma.inquiries.update({ where: { id: i.id }, data: { is_read: true } });
    return { message: '읽음 처리되었습니다.' };
  }

  @Patch(':id/process-status')
  async updateProcessStatus(@Param('id') id: string, @Body() body: unknown) {
    const iid = longParam(id);
    const status = stringMap(body).processStatus ?? null;
    const i = await this.find(iid);
    const next = enumValueOf('InquiryProcessStatus', INQUIRY_STATUSES, status);
    if (i.process_status !== next) await this.prisma.inquiries.update({ where: { id: i.id }, data: { process_status: next } });
    return { message: '처리 상태가 변경되었습니다.' };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const i = await this.find(longParam(id));
    await this.prisma.inquiries.delete({ where: { id: i.id } });
    return { message: '문의가 삭제되었습니다.' };
  }
}

const BOOKING_STATUSES = ['REQUESTED', 'CONFIRMED', 'REJECTED', 'CANCELLED'] as const;

type BookingRow = { id: bigint; photographer_id: bigint | null; photographer_name: string | null; photographer_profile: string | null; client_id: bigint | null;
  client_name: string | null; shoot_type: string | null; shoot_date: Date; shoot_location: string | null; budget: string | null; message: string | null;
  status: string; rejected_reason: string | null; created_at: Date };

const BOOKING_SELECT = Prisma.sql`b.id, b.photographer_id, ph.name AS photographer_name, ph.profile_name AS photographer_profile, b.client_id, b.client_name, b.shoot_type,
  b.shoot_date, b.shoot_location, b.budget, b.message, b.status, b.rejected_reason, b.created_at FROM bookings b LEFT JOIN members ph ON ph.id = b.photographer_id`;

const bookingDto = (b: BookingRow) => ({
  id: Number(b.id), photographerId: num(b.photographer_id), photographerName: b.photographer_name, photographerProfileName: b.photographer_profile,
  clientId: num(b.client_id), clientName: b.client_name, shootType: b.shoot_type, shootDate: localDate(b.shoot_date), shootLocation: b.shoot_location,
  budget: b.budget, message: b.message, status: b.status, rejectedReason: b.rejected_reason, createdAt: localDateTime(b.created_at),
});

function todayUtc() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

@Controller('api/admin/bookings')
export class AdminBookingController {
  constructor(private readonly prisma: AdminPrismaService) {}

  @Get('calendar')
  async calendar(@Query() q: Record<string, unknown>) {
    const year = intParam(q.year);
    const month = intParam(q.month);
    // YearMonth.of — 범위 밖은 DateTimeException(처리 안 됨 → 500)
    if (month < 1 || month > 12 || year < -999999999 || year > 999999999) throw new Error('Invalid value for MonthOfYear');
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0));
    const rows = await this.prisma.$queryRaw<{ d: Date; c: bigint }[]>`SELECT shoot_date AS d, COUNT(*) AS c FROM bookings WHERE shoot_date BETWEEN ${from}::date AND ${to}::date GROUP BY shoot_date ORDER BY shoot_date ASC`;
    return rows.map((r) => ({ date: localDate(r.d), count: Number(r.c) }));
  }

  @Get('this-week')
  async thisWeek() {
    const today = todayUtc();
    const end = new Date(today.getTime() + 6 * 86400000);
    return (await this.prisma.$queryRaw<BookingRow[]>`SELECT ${BOOKING_SELECT} WHERE b.shoot_date BETWEEN ${today}::date AND ${end}::date ORDER BY b.shoot_date ASC, b.created_at ASC`).map(bookingDto);
  }

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const date = isoDateParam(q.date, false);
    const status = optStrParam(q.status);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const p = pageRequest(page, size);
    const st = status !== null && !isBlank(status) ? enumValueOf('BookingStatus', BOOKING_STATUSES, status) : null;
    const where = Prisma.sql`(${st}::text IS NULL OR b.status = ${st}::text) AND (${date}::date IS NULL OR b.shoot_date = ${date}::date)`;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<BookingRow[]>`SELECT ${BOOKING_SELECT} WHERE ${where} ORDER BY b.shoot_date DESC, b.created_at DESC LIMIT ${p.take} OFFSET ${p.skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM bookings b WHERE ${where}`,
    ]);
    // 컨트롤러가 Spring Data Page를 그대로 반환 — PageImpl 직렬화 모양
    return springPage(rows.map(bookingDto), page, size, Number(total[0].c));
  }

  @Get('by-date')
  async byDate(@Query() q: Record<string, unknown>) {
    const date = isoDateParam(q.date, true)!;
    return (await this.prisma.$queryRaw<BookingRow[]>`SELECT ${BOOKING_SELECT} WHERE b.shoot_date = ${date}::date ORDER BY b.status ASC, b.created_at ASC`).map(bookingDto);
  }
}

const MEET_STALL_DAYS = 7;
const DELIVERY_EXPIRY_WARN_DAYS = 3;

/** 미팅·납품 운영 현황 — 읽기 전용, 메타데이터만 */
@Controller('api/admin/transactions')
export class AdminTransactionController {
  constructor(private readonly prisma: AdminPrismaService) {}

  private meetRow(m: { id: bigint; requester_id: bigint | null; receiver_id: bigint | null; status: string | null; confirmed_date: Date | null; created_at: Date | null; updated_at: Date | null }, names: Map<bigint, string>) {
    return {
      id: Number(m.id), requesterId: num(m.requester_id), requesterName: m.requester_id !== null ? (names.get(m.requester_id) ?? null) : null,
      receiverId: num(m.receiver_id), receiverName: m.receiver_id !== null ? (names.get(m.receiver_id) ?? null) : null, status: m.status,
      confirmedDate: localDate(m.confirmed_date), createdAt: localDateTime(m.created_at), updatedAt: localDateTime(m.updated_at),
    };
  }

  private deliveryRow(d: { id: bigint; member_id: bigint | null; title: string | null; client_name: string | null; status: string | null; expires_at: Date | null;
    viewed_at: Date | null; approved_at: Date | null; created_at: Date | null }, names: Map<bigint, string>, now: Date) {
    if (d.expires_at === null) throw new Error('expiresAt is null');
    return {
      id: Number(d.id), memberId: num(d.member_id), memberName: d.member_id !== null ? (names.get(d.member_id) ?? null) : null, title: d.title, clientName: d.client_name,
      status: d.status ?? 'PENDING', expiresAt: localDateTime(d.expires_at), expired: d.expires_at.getTime() < now.getTime(), viewed: d.viewed_at !== null,
      approvedAt: localDateTime(d.approved_at), createdAt: localDateTime(d.created_at),
    };
  }

  private statusMap(rows: { s: string | null; c: bigint }[]) {
    const out: Record<string, number> = {};
    for (const r of rows) out[r.s ?? 'PENDING'] = Number(r.c);
    return out;
  }

  @Get('summary')
  async summary() {
    const now = new Date();
    const stalled = await this.prisma.meets.findMany({ where: { status: { in: ['PENDING', 'NEGOTIATING'] }, updated_at: { lt: new Date(now.getTime() - MEET_STALL_DAYS * 86400000) } }, orderBy: { updated_at: 'asc' }, take: 10 });
    const expiring = await this.prisma.delivery_sets.findMany({ where: { OR: [{ status: null }, { status: 'PENDING' }], expires_at: { lt: new Date(now.getTime() + DELIVERY_EXPIRY_WARN_DAYS * 86400000) } }, orderBy: { expires_at: 'asc' }, take: 10 });
    const names = await memberNames(this.prisma, [...stalled.flatMap((m) => [m.requester_id, m.receiver_id]), ...expiring.map((d) => d.member_id)]);
    return {
      meetCounts: this.statusMap(await this.prisma.$queryRaw<{ s: string | null; c: bigint }[]>`SELECT status AS s, COUNT(*) AS c FROM meets GROUP BY status`),
      deliveryCounts: this.statusMap(await this.prisma.$queryRaw<{ s: string | null; c: bigint }[]>`SELECT status AS s, COUNT(*) AS c FROM delivery_sets GROUP BY status`),
      meetStallDays: MEET_STALL_DAYS,
      deliveryExpiryWarnDays: DELIVERY_EXPIRY_WARN_DAYS,
      stalledMeets: stalled.map((m) => this.meetRow(m, names)),
      expiringDeliveries: expiring.map((d) => this.deliveryRow(d, names, now)),
    };
  }

  @Get('meets')
  async meets(@Query() q: Record<string, unknown>) {
    const status = blankToNull(optStrParam(q.status));
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const p = pageRequest(page, size);
    const where = status === null ? {} : { status };
    const [rows, total] = await Promise.all([
      this.prisma.meets.findMany({ where, orderBy: [{ updated_at: 'desc' }, { id: 'desc' }], skip: p.skip, take: p.take }),
      this.prisma.meets.count({ where }),
    ]);
    const names = await memberNames(this.prisma, rows.flatMap((m) => [m.requester_id, m.receiver_id]));
    return pageResponse(rows.map((m) => this.meetRow(m, names)), page, size, total);
  }

  @Get('deliveries')
  async deliveries(@Query() q: Record<string, unknown>) {
    const now = new Date();
    const status = blankToNull(optStrParam(q.status));
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const p = pageRequest(page, size);
    const where = status === null ? {} : { status };
    const [rows, total] = await Promise.all([
      this.prisma.delivery_sets.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: p.skip, take: p.take }),
      this.prisma.delivery_sets.count({ where }),
    ]);
    const names = await memberNames(this.prisma, rows.map((d) => d.member_id));
    return pageResponse(rows.map((d) => this.deliveryRow(d, names, now)), page, size, total);
  }
}

const GATHERING_STATUSES = ['RECRUITING', 'RECRUITMENT_CLOSED', 'SCHEDULED', 'ONGOING', 'ENDED'];

@Controller('api/admin/gatherings')
export class AdminGatheringController {
  constructor(
    private readonly prisma: AdminPrismaService,
    private readonly activity: AdminActivityRecorder,
  ) {}

  private async countBy(sql: Prisma.Sql) {
    return new Map((await this.prisma.$queryRaw<{ k: bigint; c: bigint }[]>(sql)).map((r) => [r.k, Number(r.c)]));
  }

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const status = blankToNull(optStrParam(q.status));
    const search = optStrParam(q.search);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const term = search !== null && !isBlank(search) ? search.trim() : null;
    const p = pageRequest(page, size);
    const where = Prisma.sql`(${status}::text IS NULL OR status = ${status}::text)
      AND (${term}::text IS NULL OR LOWER(title) LIKE '%' || LOWER(${term}::text) || '%' OR LOWER(location) LIKE '%' || LOWER(${term}::text) || '%')`;
    type G = Prisma.gatheringsGetPayload<object>;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<G[]>`SELECT * FROM gatherings WHERE ${where} ORDER BY start_date_time DESC, id DESC LIMIT ${p.take} OFFSET ${p.skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM gatherings WHERE ${where}`,
    ]);
    const ids = rows.map((g) => g.id);
    const participants = ids.length ? await this.countBy(Prisma.sql`SELECT gathering_id AS k, COUNT(*) AS c FROM gathering_participants WHERE gathering_id = ANY(${ids}::bigint[]) AND status = 'PARTICIPATING' GROUP BY gathering_id`) : new Map();
    const posts = ids.length ? await this.countBy(Prisma.sql`SELECT gathering_id AS k, COUNT(*) AS c FROM gathering_posts WHERE gathering_id = ANY(${ids}::bigint[]) GROUP BY gathering_id`) : new Map();
    const hosts = await memberNames(this.prisma, rows.map((g) => g.created_by));
    const content = rows.map((g) => ({
      id: Number(g.id), title: g.title, description: g.description, location: g.location, shootTheme: g.shoot_theme, thumbnailUrl: g.thumbnail_url, status: g.status,
      startDateTime: localDateTime(g.start_date_time), endDateTime: localDateTime(g.end_date_time), recruitmentEndDateTime: localDateTime(g.recruitment_end_date_time),
      maxParticipants: g.max_participants ?? 0, participantCount: participants.get(g.id) ?? 0, postCount: posts.get(g.id) ?? 0, createdBy: num(g.created_by),
      hostName: g.created_by !== null ? (hosts.get(g.created_by) ?? null) : null, createdAt: localDateTime(g.created_at),
    }));
    return pageResponse(content, page, size, Number(total[0].c));
  }

  @Get('counts')
  async counts() {
    const out: Record<string, number> = {};
    for (const s of GATHERING_STATUSES) out[s] = 0;
    for (const r of await this.prisma.$queryRaw<{ s: string; c: bigint }[]>`SELECT status AS s, COUNT(*) AS c FROM gatherings GROUP BY status`) out[r.s] = Number(r.c);
    return out;
  }

  @Get(':id/posts')
  async posts(@Param('id') id: string) {
    const gid = BigInt(longParam(id));
    if (!(await this.prisma.gatherings.count({ where: { id: gid } }))) throw new IllegalArgument('모임을 찾을 수 없습니다.');
    const posts = await this.prisma.gathering_posts.findMany({ where: { gathering_id: gid }, orderBy: { created_at: 'desc' } });
    if (!posts.length) return [];
    const ids = posts.map((p) => p.id);
    const photos = await this.prisma.gathering_photos.findMany({ where: { gathering_post_id: { in: ids } }, orderBy: { sort_order: 'asc' } });
    const byPost = new Map<bigint, string[]>();
    for (const ph of photos) (byPost.get(ph.gathering_post_id) ?? byPost.set(ph.gathering_post_id, []).get(ph.gathering_post_id)!).push(ph.image_url);
    const likes = await this.countBy(Prisma.sql`SELECT gathering_post_id AS k, COUNT(*) AS c FROM gathering_post_likes WHERE gathering_post_id = ANY(${ids}::bigint[]) GROUP BY gathering_post_id`);
    const comments = await this.countBy(Prisma.sql`SELECT gathering_post_id AS k, COUNT(*) AS c FROM gathering_post_comments WHERE gathering_post_id = ANY(${ids}::bigint[]) GROUP BY gathering_post_id`);
    return posts.map((p) => ({
      id: Number(p.id), gatheringId: Number(p.gathering_id), memberId: num(p.member_id), memberName: p.member_name, content: p.content, hashtags: p.hashtags,
      photoUrls: byPost.get(p.id) ?? [], likeCount: likes.get(p.id) ?? 0, commentCount: comments.get(p.id) ?? 0, createdAt: localDateTime(p.created_at),
    }));
  }

  @Delete('posts/:postId')
  async deletePost(@CurrentAdmin() admin: AdminPrincipal, @Param('postId') postId: string) {
    const pid = longParam(postId);
    const post = await this.prisma.gathering_posts.findUnique({ where: { id: BigInt(pid) } });
    if (!post) throw new IllegalArgument('게시글을 찾을 수 없습니다.');
    await this.prisma.$transaction(async (tx) => {
      await tx.gathering_post_likes.deleteMany({ where: { gathering_post_id: post.id } });
      await tx.gathering_post_comments.deleteMany({ where: { gathering_post_id: post.id } });
      await tx.gathering_photos.deleteMany({ where: { gathering_post_id: post.id } });
      await tx.gathering_posts.delete({ where: { id: post.id } });
      const content = post.content ?? '';
      await this.activity.record(admin, 'GATHERING_POST_DELETE', 'GATHERING_POST', pid,
        `모임 #${post.gathering_id} · ${post.member_name}: ${content.length > 60 ? content.slice(0, 60) + '…' : content}`, tx);
    });
    return { message: '게시글이 삭제되었습니다.' };
  }
}

@Controller('api/admin/newsletter')
export class AdminNewsletterController {
  constructor(
    private readonly prisma: AdminPrismaService,
    private readonly activity: AdminActivityRecorder,
    private readonly privacy: PrivacyAccessRecorder,
  ) {}

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const active = optBoolParam(q.active);
    const search = optStrParam(q.search);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 30);
    const term = search !== null && !isBlank(search) ? search.trim() : null;
    const p = pageRequest(page, size);
    const where = Prisma.sql`(${active}::boolean IS NULL OR (${active}::boolean = true AND unsubscribed_at IS NULL) OR (${active}::boolean = false AND unsubscribed_at IS NOT NULL))
      AND (${term}::text IS NULL OR LOWER(email) LIKE '%' || LOWER(${term}::text) || '%')`;
    type S = Prisma.newsletter_subscribersGetPayload<object>;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<S[]>`SELECT * FROM newsletter_subscribers WHERE ${where} ORDER BY subscribed_at DESC, id DESC LIMIT ${p.take} OFFSET ${p.skip}`,
      this.prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) AS c FROM newsletter_subscribers WHERE ${where}`,
    ]);
    const names = await memberNames(this.prisma, rows.map((s) => s.member_id));
    const content = rows.map((s) => ({
      id: Number(s.id), memberId: num(s.member_id), memberName: names.get(s.member_id) ?? null, email: PrivacyMasker.email(s.email),
      active: s.unsubscribed_at === null, subscribedAt: localDateTime(s.subscribed_at), unsubscribedAt: localDateTime(s.unsubscribed_at),
    }));
    return pageResponse(content, page, size, Number(total[0].c));
  }

  @Get('counts')
  async counts() {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const c = (where: Prisma.newsletter_subscribersWhereInput) => this.prisma.newsletter_subscribers.count({ where });
    return {
      active: await c({ unsubscribed_at: null }),
      unsubscribed: await c({ unsubscribed_at: { not: null } }),
      new7d: await c({ subscribed_at: { gte: weekAgo }, unsubscribed_at: null }),
      unsubscribed7d: await c({ unsubscribed_at: { gte: weekAgo } }),
    };
  }

  @Post('export')
  @HttpCode(200)
  async export(@CurrentAdmin() admin: AdminPrincipal, @ClientIp() ip: string | null, @Body() body: unknown) {
    const why = requireReason(stringMap(body, false).reason ?? null);
    const active = await this.prisma.newsletter_subscribers.findMany({ where: { unsubscribed_at: null }, orderBy: { subscribed_at: 'asc' } });
    const names = await memberNames(this.prisma, active.map((s) => s.member_id));
    await this.activity.record(admin, 'NEWSLETTER_EXPORT', 'NEWSLETTER', null, `활성 구독자 ${active.length}명 CSV 내보내기`);
    await this.privacy.record(admin, ip, 'EXPORT', null, active.length, why, '뉴스레터 활성 구독자 CSV (이메일)');
    return active.map((s) => ({ email: s.email, memberName: names.get(s.member_id) ?? null, subscribedAt: localDateTime(s.subscribed_at) }));
  }
}

@Controller('api/admin/verifications')
export class AdminVerificationController {
  constructor(private readonly prisma: AdminPrismaService) {}

  private async dto(id: bigint) {
    const v = await this.prisma.verification_requests.findUnique({ where: { id }, include: { members: true } });
    if (!v) throw new IllegalArgument('인증 신청을 찾을 수 없습니다.');
    return {
      id: Number(v.id), memberId: Number(v.members.id), memberName: v.members.name, memberEmail: PrivacyMasker.email(v.members.email),
      memberProfileName: v.members.profile_name, portfolioUrl: v.portfolio_url, bio: v.bio, status: v.status, rejectReason: v.reject_reason,
      reviewedAt: localDateTime(v.reviewed_at), createdAt: localDateTime(v.created_at),
    };
  }

  @Get()
  async list(@Query() q: Record<string, unknown>) {
    const status = blankToNull(optStrParam(q.status));
    const memberId = optLongParam(q.memberId);
    const page = intParam(q.page, 0);
    const size = intParam(q.size, 20);
    const p = pageRequest(page, size);
    const where = { ...(status !== null ? { status } : {}), ...(memberId !== null ? { member_id: BigInt(memberId) } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.verification_requests.findMany({ where, orderBy: { created_at: 'desc' }, skip: p.skip, take: p.take, select: { id: true } }),
      this.prisma.verification_requests.count({ where }),
    ]);
    const content = [];
    for (const r of rows) content.push(await this.dto(r.id));
    return pageResponse(content, page, size, total);
  }

  @Get('counts')
  async counts() {
    const out: Record<string, number> = {};
    for (const s of ['PENDING', 'APPROVED', 'REJECTED']) out[s] = await this.prisma.verification_requests.count({ where: { status: s } });
    return out;
  }

  @Post(':id/approve')
  @HttpCode(200)
  async approve(@Param('id') id: string) {
    const vid = BigInt(longParam(id));
    const v = await this.prisma.verification_requests.findUnique({ where: { id: vid } });
    if (!v) throw new IllegalArgument('인증 신청을 찾을 수 없습니다.');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.verification_requests.update({ where: { id: vid }, data: { status: 'APPROVED', reviewed_at: now } }),
      this.prisma.members.update({ where: { id: v.member_id }, data: { is_verified: true, verified_at: now, updated_at: now } }),
    ]);
    return this.dto(vid);
  }

  @Post(':id/reject')
  @HttpCode(200)
  async reject(@Param('id') id: string, @Body() body: unknown) {
    const vid = BigInt(longParam(id));
    const b = objectBody(body);
    const reason = jsonField(() => jsonString(b.reason, 'reason'));
    if (!(await this.prisma.verification_requests.count({ where: { id: vid } }))) throw new IllegalArgument('인증 신청을 찾을 수 없습니다.');
    await this.prisma.verification_requests.update({ where: { id: vid }, data: { status: 'REJECTED', reject_reason: reason, reviewed_at: new Date() } });
    return this.dto(vid);
  }
}

