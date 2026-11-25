import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Public, isAdmin } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { jsonBool, jsonInt, jsonLocalDate, jsonLocalDateTime, jsonLong, jsonString } from '../common/json-body.js';
import { HolidayService } from './holiday.service.js';
import { OutingPollService } from './outing-poll.service.js';

type Body_ = Record<string, unknown> | undefined;

function requireAdmin(user: AuthUser) {
  if (!isAdmin(user)) throw AppError.status(403, '관리자만 할 수 있습니다.');
}
function yearParam(v: string | undefined) {
  const y = v == null ? new Date().getUTCFullYear() : Number(v);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw AppError.status(400, '연도가 올바르지 않습니다.');
  return y;
}
function dateParam(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw AppError.status(400, '날짜는 YYYY-MM-DD 형식이어야 합니다.');
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) throw AppError.status(400, '없는 날짜입니다.');
  return d;
}

/** SNAPDAY 공휴일 — 조회 공개, 가져오기·등록·삭제는 관리자 */
@Controller('api/outing/holidays')
export class HolidayController {
  constructor(private readonly holidays: HolidayService) {}

  @Public()
  @Get()
  list(@Query('year') year?: string) {
    return this.holidays.list(yearParam(year));
  }

  @Post('import')
  importYear(@Query('year') year: string | undefined, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    return this.holidays.importYear(yearParam(year));
  }

  @Post()
  add(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    const b = body ?? {};
    const date = jsonLocalDate(b.date, 'date');
    const name = jsonString(b.name, 'name')?.replace(/<[^>]*>/g, '').trim();
    if (!date) throw AppError.status(400, '날짜는 필수입니다.');
    if (!name) throw AppError.status(400, '공휴일 이름은 필수입니다.');
    return this.holidays.add(date, name.slice(0, 50), jsonBool(b.substitute, 'substitute') === true);
  }

  @Delete(':date')
  @HttpCode(204)
  async remove(@Param('date') date: string, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    await this.holidays.remove(dateParam(date));
  }
}

/** SNAPDAY 월간 출사 투표 — 조회 공개(로그인 시 내 응답), 응답은 로그인 회원, 운영(생성·마감·확정)은 관리자 */
@Controller('api/outing/polls')
export class OutingPollController {
  constructor(private readonly polls: OutingPollService) {}

  @Public()
  @Get()
  list(@Query('year') year?: string) {
    return this.polls.list(yearParam(year));
  }

  @Public()
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: AuthUser) {
    return this.polls.detail(id, user?.id);
  }

  @Post()
  create(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    const b = body ?? {};
    const year = jsonInt(b.year, 'year');
    const month = jsonInt(b.month, 'month');
    if (year == null || month == null) throw AppError.status(400, '연도와 월은 필수입니다.');
    return this.polls.create(user.id, {
      year, month, title: jsonString(b.title, 'title'), description: jsonString(b.description, 'description'), region: jsonString(b.region, 'region'),
      startsAt: jsonLocalDateTime(b.startsAt, 'startsAt'), endsAt: jsonLocalDateTime(b.endsAt, 'endsAt'),
      minParticipants: jsonInt(b.minParticipants, 'minParticipants'), maxParticipants: jsonInt(b.maxParticipants, 'maxParticipants'),
    });
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    const b = body ?? {};
    const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
    return this.polls.update(id, {
      title: jsonString(b.title, 'title'),
      description: has('description') ? jsonString(b.description, 'description') : undefined,
      region: has('region') ? jsonString(b.region, 'region') : undefined,
      endsAt: jsonLocalDateTime(b.endsAt, 'endsAt'),
      minParticipants: has('minParticipants') ? jsonInt(b.minParticipants, 'minParticipants') : undefined,
      maxParticipants: has('maxParticipants') ? jsonInt(b.maxParticipants, 'maxParticipants') : undefined,
    });
  }

  @Post(':id/options')
  addOption(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    const date = jsonLocalDate((body ?? {}).date, 'date');
    if (!date) throw AppError.status(400, '날짜는 필수입니다.');
    return this.polls.addOption(id, date);
  }

  @Delete(':id/options/:optionId')
  removeOption(@Param('id', ParseIntPipe) id: number, @Param('optionId', ParseIntPipe) optionId: number, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    return this.polls.removeOption(id, optionId);
  }

  @Put(':id/votes')
  vote(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const raw = (body ?? {}).votes;
    if (!Array.isArray(raw)) throw AppError.status(400, 'votes 목록이 필요합니다.');
    const votes = raw.map((v, i) => {
      const o = (v ?? {}) as Record<string, unknown>;
      const optionId = jsonLong(o.optionId, `votes[${i}].optionId`);
      if (optionId == null) throw AppError.status(400, 'optionId가 필요합니다.');
      return { optionId, availability: jsonString(o.availability, `votes[${i}].availability`) };
    });
    return this.polls.vote(id, user.id, votes);
  }

  @Post(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    return this.polls.close(id);
  }

  @Post(':id/reopen')
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    return this.polls.reopen(id);
  }

  @Post(':id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    const b = body ?? {};
    const optionId = jsonLong(b.optionId, 'optionId');
    if (optionId == null) throw AppError.status(400, '확정할 날짜(optionId)가 필요합니다.');
    return this.polls.confirm(id, user.id, {
      optionId, title: jsonString(b.title, 'title'), location: jsonString(b.location, 'location'),
      startTime: jsonString(b.startTime, 'startTime'), endTime: jsonString(b.endTime, 'endTime'),
      maxParticipants: jsonInt(b.maxParticipants, 'maxParticipants'), description: jsonString(b.description, 'description'),
    });
  }

  @Post(':id/remind')
  remind(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    return this.polls.remind(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    requireAdmin(user);
    await this.polls.remove(id);
  }
}
