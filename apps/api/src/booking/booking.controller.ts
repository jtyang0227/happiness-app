import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser, CurrentUser, Public } from '../auth/auth.guard.js';
import { clientIp } from '../common/client-ip.js';
import { jsonInt, jsonLocalDate, jsonPrimitiveBool, jsonPrimitiveInt, jsonString } from '../common/json-body.js';
import { BookingService } from './booking.service.js';

type Body_ = Record<string, unknown> | undefined;

/** `@RequestParam(defaultValue=…) int` — 없으면 기본값, 숫자가 아니면 500 */
function intParam(v: string | undefined, def: number, name: string) {
  if (v == null) return def;
  const t = v.trim();
  if (!/^[+-]?\d+$/.test(t) || Math.abs(Number(t)) > 2147483647) throw new Error(`Failed to convert ${name}: ${v}`);
  return Number(t);
}

/** Spring BookingController — 사설 IP(X-Forwarded-For 10.x 등)는 소켓 주소로 대신해 rate limit을 건다 */
function bookingIp(req: Request) {
  const ip = clientIp(req);
  const priv = ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.') || ip === '127.0.0.1' || ip === '0:0:0:0:0:0:0:1' || ip === '::1';
  return priv ? (req.socket.remoteAddress ?? '') : ip;
}

@Controller('api/booking')
export class BookingController {
  constructor(private readonly bookings: BookingService) {}

  @Get()
  mine(@Query('status') status: string | undefined, @CurrentUser() user: AuthUser) {
    return this.bookings.mine(user.id, status);
  }

  @Get('availability-settings')
  settings(@CurrentUser() user: AuthUser) {
    return this.bookings.settings(user.id);
  }

  @Put('availability-settings')
  saveSettings(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    return this.bookings.saveSettings(user.id, {
      weekdays: jsonString(b.weekdays, 'weekdays'), timeSlots: jsonString(b.timeSlots, 'timeSlots'),
      bufferHours: jsonPrimitiveInt(b.bufferHours, 'bufferHours'), bookingNote: jsonString(b.bookingNote, 'bookingNote'),
      active: jsonPrimitiveBool(b.active, 'active'),
    });
  }

  @Get('blocked-dates')
  blockedDates(@CurrentUser() user: AuthUser) {
    return this.bookings.blockedDates(user.id);
  }

  @Post('blocked-dates')
  @HttpCode(201)
  addBlockedDate(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    return this.bookings.addBlockedDate(user.id, jsonLocalDate(b.date, 'date'), jsonString(b.reason, 'reason'));
  }

  @Delete('blocked-dates/:id')
  @HttpCode(204)
  async deleteBlockedDate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.bookings.deleteBlockedDate(user.id, id);
  }

  @Public()
  @Get(':profileName/availability')
  availability(@Param('profileName') profileName: string, @Query('year') year?: string, @Query('month') month?: string) {
    const n = new Date();
    return this.bookings.calendar(profileName, intParam(year, n.getUTCFullYear(), 'year'), intParam(month, n.getUTCMonth() + 1, 'month'));
  }

  @Public()
  @Post(':profileName')
  @HttpCode(201)
  create(@Param('profileName') profileName: string, @Body() body: Body_, @Req() req: Request) {
    const b = body ?? {};
    return this.bookings.create(profileName, {
      shootDate: jsonLocalDate(b.shootDate, 'shootDate'), shootTime: jsonString(b.shootTime, 'shootTime'), shootType: jsonString(b.shootType, 'shootType'),
      clientName: jsonString(b.clientName, 'clientName'), clientPhone: jsonString(b.clientPhone, 'clientPhone'),
      clientEmail: jsonString(b.clientEmail, 'clientEmail'), memo: jsonString(b.memo, 'memo'),
    }, bookingIp(req));
  }

  @Put(':id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.bookings.confirm(id, user.id);
  }

  @Put(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    return this.bookings.reject(id, jsonString(body?.reason, 'reason'), user.id);
  }

  @Put(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.bookings.cancel(id, user.id);
  }

  @Put(':id/checklist')
  checklist(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    return this.bookings.checklist(id, user.id, jsonString(b.checklistJson, 'checklistJson'), jsonLocalDate(b.deliveryDeadline, 'deliveryDeadline'));
  }

  @Put(':id/payment')
  payment(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const b = body ?? {};
    return this.bookings.payment(id, user.id, {
      depositStatus: jsonString(b.depositStatus, 'depositStatus'), depositAmount: jsonInt(b.depositAmount, 'depositAmount'),
      balanceStatus: jsonString(b.balanceStatus, 'balanceStatus'), balanceAmount: jsonInt(b.balanceAmount, 'balanceAmount'),
    });
  }
}
