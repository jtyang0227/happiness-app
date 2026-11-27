import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { isBlank, javaTrim } from '../common/json-body.js';
import { localDate, localDateTime, now, today } from '../common/time.js';
import type { booking_availability, bookings } from '../generated/prisma/client.js';
import { NotionSyncService } from '../ops/notion-sync.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface BookingRequest {
  shootDate: Date | null; shootTime: string | null; shootType: string | null; clientName: string | null;
  clientPhone: string | null; clientEmail: string | null; memo: string | null;
}
export interface PaymentRequest { depositStatus: string | null; depositAmount: number | null; balanceStatus: string | null; balanceAmount: number | null }
export interface SettingsRequest { weekdays: string | null; timeSlots: string | null; bufferHours: number; bookingNote: string | null; active: boolean }

const RATE_LIMIT = 10;
const forbidden = () => AppError.status(403, '접근 권한이 없습니다');

export function toBookingResponse(b: bookings) {
  return {
    id: Number(b.id),
    memberId: Number(b.member_id),
    shootDate: localDate(b.shoot_date),
    shootTime: b.shoot_time,
    shootType: b.shoot_type,
    clientName: b.client_name,
    clientPhone: b.client_phone,
    clientEmail: b.client_email,
    memo: b.memo,
    status: b.status,
    rejectReason: b.reject_reason,
    createdAt: localDateTime(b.created_at),
    confirmedAt: localDateTime(b.confirmed_at),
    cancelledAt: localDateTime(b.cancelled_at),
    checklistJson: b.checklist_json,
    deliveryDeadline: localDate(b.delivery_deadline),
    depositStatus: b.deposit_status,
    depositAmount: b.deposit_amount,
    depositReceivedAt: localDateTime(b.deposit_received_at),
    balanceStatus: b.balance_status,
    balanceAmount: b.balance_amount,
    balanceReceivedAt: localDateTime(b.balance_received_at),
  };
}

/** Lombok boolean isActive → JSON 키 active */
const toSettings = (av: Pick<booking_availability, 'weekdays' | 'time_slots' | 'buffer_hours' | 'booking_note' | 'is_active'>) => ({
  weekdays: av.weekdays, timeSlots: av.time_slots, bufferHours: av.buffer_hours, bookingNote: av.booking_note, active: av.is_active,
});

function parseWeekdays(csv: string | null): Set<number> {
  const set = new Set<number>();
  if (isBlank(csv)) return set;
  for (const s of csv!.split(',')) {
    const t = javaTrim(s);
    if (/^[+-]?\d+$/.test(t) && Math.abs(Number(t)) <= 2147483647) set.add(Number(t));
  }
  return set;
}

function parseTimeSlots(csv: string | null): string[] {
  if (isBlank(csv)) return ['10:00'];
  return csv!.split(',').map(javaTrim).filter((s) => !isBlank(s));
}

/** 1=월 … 7=일 */
const isoWeekday = (d: Date) => ((d.getUTCDay() + 6) % 7) + 1;

/** Spring BookingService — 응답은 래퍼 없는 DTO, 오류는 ResponseStatusException(ApiResponse) */
@Injectable()
export class BookingService {
  private readonly log = new Logger('BookingService');
  private readonly rate = new Map<string, { count: number; start: number }>();
  constructor(private readonly prisma: PrismaService, private readonly notion: NotionSyncService) {}

  private async artist(profileName: string) {
    const m = await this.prisma.members.findFirst({ where: { profile_name: profileName }, select: { id: true } });
    if (!m) throw AppError.status(404, '작가를 찾을 수 없습니다');
    return m.id;
  }

  async calendar(profileName: string, year: number, month: number) {
    const memberId = await this.artist(profileName);
    const av = await this.prisma.booking_availability.findUnique({ where: { member_id: memberId } });
    const weekdays = parseWeekdays(av ? av.weekdays : '1,2,3,4,5');
    const slots = parseTimeSlots(av ? av.time_slots : '10:00,14:00');
    const bookingNote = av ? av.booking_note : null;
    if (av && !av.is_active) return { availableDates: [], bookedSlots: {}, timeSlots: slots, bookingNote };

    // YearMonth.of — 잘못된 월·연도는 DateTimeException(500)
    if (month < 1 || month > 12 || year < -999999999 || year > 999999999) throw new Error(`Invalid value for MonthOfYear: ${month}`);
    const start = ymd(year, month, 1);
    const end = ymd(year, month, [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]);
    const [blocked, existing] = await Promise.all([
      this.prisma.booking_blocked_dates.findMany({ where: { member_id: memberId, blocked_date: { gte: start, lte: end } }, select: { blocked_date: true } }),
      this.prisma.bookings.findMany({ where: { member_id: memberId, shoot_date: { gte: start, lte: end } }, orderBy: { id: 'asc' } }),
    ]);
    const blockedSet = new Set(blocked.map((b) => localDate(b.blocked_date)));
    const booked = new Map<string, string[]>();
    for (const b of existing) {
      if (b.status === 'CONFIRMED' || b.status === 'REQUESTED') {
        const k = localDate(b.shoot_date)!;
        booked.set(k, [...(booked.get(k) ?? []), b.shoot_time ?? '']);
      }
    }
    const availableDates: string[] = [];
    const t = today().getTime();
    for (let c = new Date(start); c.getTime() <= end.getTime(); c.setUTCDate(c.getUTCDate() + 1)) {
      const k = localDate(c)!;
      if (c.getTime() >= t && weekdays.has(isoWeekday(c)) && !blockedSet.has(k) && (booked.get(k)?.length ?? 0) < slots.length) availableDates.push(k);
    }
    return { availableDates, bookedSlots: Object.fromEntries(booked), timeSlots: slots, bookingNote };
  }

  private checkRate(ip: string) {
    const nowSec = Math.floor(Date.now() / 1000);
    const s = this.rate.get(ip);
    const state = !s || nowSec - s.start > 60 ? { count: 1, start: nowSec } : { count: s.count + 1, start: s.start };
    this.rate.set(ip, state);
    if (state.count > RATE_LIMIT) throw AppError.status(429, '너무 많은 예약 시도입니다. 잠시 후 다시 시도해주세요.');
  }

  async create(profileName: string, req: BookingRequest, ip: string) {
    this.checkRate(ip);
    const memberId = await this.artist(profileName);
    if (req.shootDate == null || req.shootDate.getTime() <= today().getTime()) throw AppError.status(400, '촬영일은 오늘 이후 날짜여야 합니다');
    // findByMemberIdAndShootDateAndShootTime — 상태와 무관, 시간 null이면 IS NULL, 둘 이상이면 Optional 조회가 실패(500)
    const same = await this.prisma.bookings.findMany({ where: { member_id: memberId, shoot_date: req.shootDate, shoot_time: req.shootTime }, take: 2, select: { id: true } });
    if (same.length > 1) throw new Error('query did not return a unique result');
    if (same.length === 1) throw AppError.status(409, '해당 시간은 이미 예약되어 있습니다');
    if (req.clientName == null) throw new Error('not-null property references a null value: clientName');
    const b = await this.prisma.bookings.create({ data: {
      member_id: memberId, shoot_date: req.shootDate, shoot_time: req.shootTime, shoot_type: req.shootType, client_name: req.clientName,
      client_phone: req.clientPhone, client_email: req.clientEmail, memo: req.memo, status: 'REQUESTED',
      deposit_status: 'PENDING', balance_status: 'PENDING', created_at: now(),
    } });
    this.log.log(`New booking created: id=${b.id}, memberId=${memberId}, date=${localDate(req.shootDate)}`);
    this.notion.bookingChanged(b);
    return toBookingResponse(b);
  }

  async mine(memberId: number, status?: string) {
    const where = { member_id: BigInt(memberId) };
    const rows = status != null && !isBlank(status)
      ? await this.prisma.bookings.findMany({ where: { ...where, status: status.toUpperCase() }, orderBy: { id: 'asc' } })
      : await this.prisma.bookings.findMany({ where, orderBy: [{ shoot_date: 'asc' }, { id: 'asc' }] });
    return rows.map(toBookingResponse);
  }

  private async own(id: number, memberId: number) {
    const b = await this.prisma.bookings.findFirst({ where: { id: BigInt(id), member_id: BigInt(memberId) } });
    if (!b) throw forbidden();
    return b;
  }

  /** Hibernate처럼 바뀐 값이 있을 때만 UPDATE */
  private async save(b: bookings, data: Partial<bookings>) {
    const changed = Object.entries(data).some(([k, v]) => {
      const cur = (b as Record<string, unknown>)[k];
      return cur instanceof Date || v instanceof Date ? (cur as Date | null)?.getTime() !== (v as Date | null)?.getTime() : cur !== v;
    });
    const saved = changed ? await this.prisma.bookings.update({ where: { id: b.id }, data }) : b;
    if (changed) this.notion.bookingChanged(saved);
    return toBookingResponse(saved);
  }

  async confirm(id: number, memberId: number) {
    return this.save(await this.own(id, memberId), { status: 'CONFIRMED', confirmed_at: now() });
  }

  async reject(id: number, reason: string | null, memberId: number) {
    return this.save(await this.own(id, memberId), { status: 'REJECTED', reject_reason: reason });
  }

  async cancel(id: number, memberId: number) {
    return this.save(await this.own(id, memberId), { status: 'CANCELLED', cancelled_at: now() });
  }

  async checklist(id: number, memberId: number, checklistJson: string | null, deadline: Date | null) {
    return this.save(await this.own(id, memberId), { checklist_json: checklistJson, delivery_deadline: deadline });
  }

  async payment(id: number, memberId: number, req: PaymentRequest) {
    const b = await this.own(id, memberId);
    const data: Partial<bookings> = {};
    const valid = (s: string) => {
      if (s !== 'PENDING' && s !== 'RECEIVED') throw AppError.status(400, '수금 상태는 PENDING 또는 RECEIVED만 허용됩니다');
    };
    if (req.depositStatus != null) {
      valid(req.depositStatus);
      data.deposit_status = req.depositStatus;
      data.deposit_received_at = req.depositStatus === 'RECEIVED' ? now() : null;
    }
    if (req.depositAmount != null) data.deposit_amount = req.depositAmount;
    if (req.balanceStatus != null) {
      valid(req.balanceStatus);
      data.balance_status = req.balanceStatus;
      data.balance_received_at = req.balanceStatus === 'RECEIVED' ? now() : null;
    }
    if (req.balanceAmount != null) data.balance_amount = req.balanceAmount;
    return this.save(b, data);
  }

  async settings(memberId: number) {
    const av = await this.prisma.booking_availability.findUnique({ where: { member_id: BigInt(memberId) } });
    return toSettings(av ?? { weekdays: '1,2,3,4,5', time_slots: '10:00,14:00', buffer_hours: 0, booking_note: null, is_active: true });
  }

  async saveSettings(memberId: number, dto: SettingsRequest) {
    const id = BigInt(memberId);
    const av = await this.prisma.booking_availability.findUnique({ where: { member_id: id } });
    const next = {
      weekdays: dto.weekdays ?? (av ? av.weekdays : '1,2,3,4,5'),
      time_slots: dto.timeSlots ?? (av ? av.time_slots : '10:00,14:00'),
      buffer_hours: dto.bufferHours,
      booking_note: dto.bookingNote,
      is_active: dto.active,
    };
    if (!av) {
      return toSettings(await this.prisma.booking_availability.create({ data: {
        member_id: id, ...next, weekdays: next.weekdays ?? '1,2,3,4,5', time_slots: next.time_slots ?? '10:00,14:00', updated_at: now(),
      } }));
    }
    const changed = (Object.keys(next) as (keyof typeof next)[]).some((k) => av[k] !== next[k]);
    return toSettings(changed ? await this.prisma.booking_availability.update({ where: { id: av.id }, data: { ...next, updated_at: now() } }) : av);
  }

  async blockedDates(memberId: number) {
    const rows = await this.prisma.booking_blocked_dates.findMany({ where: { member_id: BigInt(memberId) }, orderBy: { id: 'asc' } });
    return rows.map((b) => ({ id: Number(b.id), date: localDate(b.blocked_date), reason: b.reason }));
  }

  async addBlockedDate(memberId: number, date: Date | null, reason: string | null) {
    if (date == null) throw AppError.status(400, '날짜를 입력해주세요');
    try {
      const b = await this.prisma.booking_blocked_dates.create({ data: { member_id: BigInt(memberId), blocked_date: date, reason } });
      return { id: Number(b.id), date: localDate(b.blocked_date), reason: b.reason };
    } catch {
      // Spring은 저장 예외를 모두 409로 바꾼다(사유 길이 초과도 포함)
      throw AppError.status(409, '이미 차단된 날짜입니다');
    }
  }

  async deleteBlockedDate(memberId: number, id: number) {
    const n = await this.prisma.booking_blocked_dates.deleteMany({ where: { id: BigInt(id), member_id: BigInt(memberId) } });
    if (n.count === 0) throw forbidden();
  }
}

/** 0~99년도 Date.UTC가 1900년대로 바꾸지 않게 setUTCFullYear로 만든다 */
function ymd(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(2000, 0, 1));
  dt.setUTCFullYear(y, m - 1, d);
  return dt;
}

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
