import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { isBlank, javaSplit, javaTrim, jsonDouble, jsonLong, jsonString, jsonStringList } from '../common/json-body.js';
import { localDate, localDateTime, now } from '../common/time.js';
import type { meet_messages, meets } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Body_ = Record<string, unknown> | undefined;
const bad = (m: string) => AppError.status(400, m);
const ENDED = 'CANCELLED';

const sanitize = (s: string | null) => (s == null ? null : javaTrim(s.replace(/<[^>]*>/g, '')));
function validLat(v: number | null) {
  if (v != null && (v < -90 || v > 90)) throw bad('유효하지 않은 위도입니다.');
  return v;
}
function validLng(v: number | null) {
  if (v != null && (v < -180 || v > 180)) throw bad('유효하지 않은 경도입니다.');
  return v;
}

/** Map<String,Object>에서 (String) 캐스트 — 문자열이 아니면 ClassCastException(500) */
function castString(v: unknown, name: string): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') throw new Error(`${name} is not a String`);
  return v;
}
function castNumber(v: unknown, name: string): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'number') throw new Error(`${name} is not a Number`);
  return v;
}
/** (List<String>) 캐스트 후 String.join — 문자열이 아닌 요소는 500 */
function castStringList(v: unknown, name: string): string[] | null {
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new Error(`${name} is not a List<String>`);
  return v as string[];
}

/** LocalDate.parse — 형식이 틀리거나 null이면 500 */
function parseLocalDate(s: string | null): Date {
  const m = s == null ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]) return d;
  }
  throw new Error(`Text '${s}' could not be parsed`);
}

const messageBody = (m: meet_messages) => ({
  id: Number(m.id), meetId: Number(m.meet_id), senderId: Number(m.sender_id), senderName: m.sender_name, senderAvatar: m.sender_avatar,
  content: m.content, createdAt: localDateTime(m.created_at),
});

/** Spring MeetController/MeetService — 전부 인증, 요청자·수신자 외 403 */
@Controller('api/meets')
export class MeetController {
  constructor(private readonly prisma: PrismaService) {}

  private async toResponses(list: meets[]) {
    const memberIds = [...new Set(list.flatMap((m) => [m.requester_id, m.receiver_id]))];
    const [members, counts] = list.length ? await Promise.all([
      this.prisma.members.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true, avatar_url: true, profile_name: true } }),
      this.prisma.meet_messages.groupBy({ by: ['meet_id'], where: { meet_id: { in: list.map((m) => m.id) } }, _count: { _all: true } }),
    ]) : [[], []];
    const byId = new Map(members.map((m) => [m.id, m]));
    const count = new Map(counts.map((c) => [c.meet_id, c._count._all]));
    return list.map((m) => {
      const rq = byId.get(m.requester_id);
      const rc = byId.get(m.receiver_id);
      return {
        id: Number(m.id), status: m.status,
        requesterId: Number(m.requester_id), requesterName: rq ? rq.name : '', requesterAvatarUrl: rq?.avatar_url ?? null, requesterProfileName: rq?.profile_name ?? null,
        receiverId: Number(m.receiver_id), receiverName: rc ? rc.name : '', receiverAvatarUrl: rc?.avatar_url ?? null, receiverProfileName: rc?.profile_name ?? null,
        locationName: m.location_name, locationAddress: m.location_address, locationLat: m.location_lat, locationLng: m.location_lng,
        confirmedDate: localDate(m.confirmed_date), confirmedTime: m.confirmed_time, initialMessage: m.initial_message,
        messageCount: count.get(m.id) ?? 0, createdAt: localDateTime(m.created_at), updatedAt: localDateTime(m.updated_at),
      };
    });
  }

  private async access(id: number, memberId: number) {
    const mid = BigInt(memberId);
    const m = await this.prisma.meets.findFirst({ where: { id: BigInt(id), OR: [{ requester_id: mid }, { receiver_id: mid }] } });
    if (!m) throw AppError.status(403, '접근 권한이 없습니다.');
    return m;
  }

  /** Hibernate @PreUpdate — 바뀐 값이 있을 때만 updated_at 갱신 */
  private async save(m: meets, data: Partial<meets>) {
    const changed = Object.entries(data).some(([k, v]) => {
      const cur = (m as Record<string, unknown>)[k];
      return cur instanceof Date || v instanceof Date ? (cur as Date | null)?.getTime() !== (v as Date | null)?.getTime() : cur !== v;
    });
    if (changed) await this.prisma.meets.update({ where: { id: m.id }, data: { ...data, updated_at: now() } });
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const receiverId = jsonLong(b.receiverId, 'receiverId');
    const proposed = jsonStringList(b.proposedDates, 'proposedDates');
    const req = {
      locationName: jsonString(b.locationName, 'locationName'), locationAddress: jsonString(b.locationAddress, 'locationAddress'),
      locationLat: jsonDouble(b.locationLat, 'locationLat'), locationLng: jsonDouble(b.locationLng, 'locationLng'), initialMessage: jsonString(b.initialMessage, 'initialMessage'),
    };
    if (receiverId === user.id) throw bad('자기 자신에게 약속을 요청할 수 없습니다.');
    if (receiverId == null) throw new Error('The given id must not be null');
    if (!(await this.prisma.members.findUnique({ where: { id: BigInt(receiverId) }, select: { id: true } }))) throw AppError.status(404, '상대방을 찾을 수 없습니다.');
    const lat = validLat(req.locationLat);
    const lng = validLng(req.locationLng);
    const t = now();
    const meet = await this.prisma.$transaction(async (tx) => {
      const m = await tx.meets.create({ data: {
        requester_id: BigInt(user.id), receiver_id: BigInt(receiverId), status: 'PENDING', location_name: sanitize(req.locationName),
        location_address: sanitize(req.locationAddress), location_lat: lat, location_lng: lng, initial_message: sanitize(req.initialMessage),
        created_at: t, updated_at: t,
      } });
      if (proposed?.length) {
        await tx.meet_availabilities.create({ data: { meet_id: m.id, member_id: BigInt(user.id), available_dates: proposed.join(','), updated_at: now() } });
      }
      return m;
    });
    return (await this.toResponses([meet]))[0];
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const id = BigInt(user.id);
    return this.toResponses(await this.prisma.meets.findMany({ where: { OR: [{ requester_id: id }, { receiver_id: id }] }, orderBy: [{ updated_at: 'desc' }, { id: 'desc' }] }));
  }

  @Get('pending-count')
  async pendingCount(@CurrentUser() user: AuthUser) {
    return { count: await this.prisma.meets.count({ where: { receiver_id: BigInt(user.id), status: 'PENDING' } }) };
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return (await this.toResponses([await this.access(id, user.id)]))[0];
  }

  @Put(':id/respond')
  @HttpCode(204)
  async respond(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const action = jsonString(body?.action, 'action');
    const m = await this.access(id, user.id);
    if (m.status !== 'PENDING') throw bad('이미 처리된 요청입니다.');
    if (Number(m.receiver_id) !== user.id) throw AppError.status(403, '수신자만 응답할 수 있습니다.');
    if (action === 'accept') await this.save(m, { status: 'NEGOTIATING' });
    else if (action === 'reject') await this.save(m, { status: ENDED });
    else throw bad('action은 accept 또는 reject여야 합니다.');
  }

  @Post(':id/availability')
  @HttpCode(204)
  async submitAvailability(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const dates = castStringList(b.dates, 'dates');
    const times = castStringList(b.times, 'times');
    const m = await this.access(id, user.id);
    if (m.status === 'CANCELLED' || m.status === 'COMPLETED') throw bad('이미 종료된 약속입니다.');
    const next = { available_dates: dates ? dates.join(',') : '', available_times: times ? times.join(',') : '' };
    const cur = await this.prisma.meet_availabilities.findFirst({ where: { meet_id: m.id, member_id: BigInt(user.id) } });
    if (!cur) await this.prisma.meet_availabilities.create({ data: { meet_id: m.id, member_id: BigInt(user.id), ...next, updated_at: now() } });
    else if (cur.available_dates !== next.available_dates || cur.available_times !== next.available_times) {
      await this.prisma.meet_availabilities.update({ where: { id: cur.id }, data: { ...next, updated_at: now() } });
    }
    if (m.status === 'PENDING' && Number(m.receiver_id) === user.id) await this.save(m, { status: 'NEGOTIATING' });
  }

  @Get(':id/availability')
  async availability(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const m = await this.access(id, user.id);
    const rows = await this.prisma.meet_availabilities.findMany({ where: { meet_id: m.id }, orderBy: { id: 'asc' } });
    const split = (s: string | null) => (s != null && !isBlank(s) ? javaSplit(s, ',') : []);
    const out: Record<string, unknown> = {};
    for (const a of rows) {
      out[String(a.member_id)] = { memberId: Number(a.member_id), dates: split(a.available_dates), times: split(a.available_times), updatedAt: localDateTime(a.updated_at) };
    }
    return out;
  }

  @Put(':id/confirm')
  @HttpCode(204)
  async confirm(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const date = jsonString(body?.date, 'date');
    const time = jsonString(body?.time, 'time');
    const m = await this.access(id, user.id);
    if (m.status !== 'NEGOTIATING') throw bad('날짜 조율 중인 약속만 확정할 수 있습니다.');
    await this.save(m, { confirmed_date: parseLocalDate(date), confirmed_time: time, status: 'CONFIRMED' });
  }

  @Put(':id/location')
  @HttpCode(204)
  async location(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    const name = castString(b.locationName, 'locationName');
    const address = castString(b.locationAddress, 'locationAddress');
    const lat = castNumber(b.locationLat, 'locationLat');
    const lng = castNumber(b.locationLng, 'locationLng');
    const m = await this.access(id, user.id);
    if (m.status === 'CANCELLED' || m.status === 'COMPLETED') throw bad('이미 종료된 약속입니다.');
    await this.save(m, { location_name: sanitize(name), location_address: sanitize(address), location_lat: validLat(lat), location_lng: validLng(lng) });
  }

  @Put(':id/cancel')
  @HttpCode(204)
  async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const m = await this.access(id, user.id);
    if (m.status === 'COMPLETED') throw bad('완료된 약속은 취소할 수 없습니다.');
    await this.save(m, { status: ENDED });
  }

  @Put(':id/complete')
  @HttpCode(204)
  async complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const m = await this.access(id, user.id);
    if (m.status !== 'CONFIRMED') throw bad('확정된 약속만 완료 처리할 수 있습니다.');
    await this.save(m, { status: 'COMPLETED' });
  }

  @Get(':id/messages')
  async messages(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const m = await this.access(id, user.id);
    return (await this.prisma.meet_messages.findMany({ where: { meet_id: m.id }, orderBy: [{ created_at: 'asc' }, { id: 'asc' }] })).map(messageBody);
  }

  @Post(':id/messages')
  @HttpCode(201)
  async send(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const content = jsonString(body?.content, 'content');
    const m = await this.access(id, user.id);
    if (m.status === 'CANCELLED') throw bad('취소된 약속에는 메시지를 보낼 수 없습니다.');
    if (content == null || isBlank(content)) throw bad('메시지 내용을 입력하세요.');
    const safe = sanitize(content)!;
    if (safe.length > 1000) throw bad('메시지는 1000자 이하로 입력하세요.');
    const sender = await this.prisma.members.findUnique({ where: { id: BigInt(user.id) }, select: { name: true, avatar_url: true } });
    if (!sender) throw AppError.status(404, '사용자를 찾을 수 없습니다.');
    const msg = await this.prisma.meet_messages.create({ data: {
      meet_id: m.id, sender_id: BigInt(user.id), sender_name: sender.name, sender_avatar: sender.avatar_url, content: safe, created_at: now(),
    } });
    return messageBody(msg);
  }
}
