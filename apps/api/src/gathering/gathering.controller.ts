import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Public } from '../auth/auth.guard.js';
import { AppError } from '../common/app-error.js';
import { jsonString } from '../common/json-body.js';
import { GatheringNotificationService } from './gathering-notification.service.js';
import { GatheringPlacePollService } from './gathering-place-poll.service.js';
import { GatheringService, readGatheringRequest } from './gathering.service.js';

type Body_ = Record<string, unknown> | undefined;

/** `@RequestParam(defaultValue=…) int` — 숫자가 아니면 500 */
function intParam(v: string | undefined, def: number, name: string) {
  if (v == null) return def;
  const t = v.trim();
  if (!/^[+-]?\d+$/.test(t) || Math.abs(Number(t)) > 2147483647) throw new Error(`Failed to convert ${name}: ${v}`);
  return Number(t);
}

/** Spring GatheringNotificationController — `/{id}`보다 먼저 등록해야 한다(app.module 순서) */
@Controller('api/gatherings/notifications')
export class GatheringNotificationController {
  constructor(private readonly notifications: GatheringNotificationService) {}

  @Get()
  list(@Query('page') page: string | undefined, @Query('size') size: string | undefined, @CurrentUser() user: AuthUser) {
    return this.notifications.list(user.id, intParam(page, 0, 'page'), intParam(size, 20, 'size'));
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: AuthUser) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Put(':id/read')
  @HttpCode(204)
  async read(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.notifications.markRead(id, user.id);
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(@CurrentUser() user: AuthUser) {
    await this.notifications.markAllRead(user.id);
  }
}

/** Spring GatheringPlacePollController — 조회 공개, 후보 설정은 만든 사람, 투표는 참여·대기자 */
@Controller('api/gatherings/:gatheringId/place-poll')
export class GatheringPlacePollController {
  constructor(private readonly polls: GatheringPlacePollService) {}

  @Public()
  @Get()
  get(@Param('gatheringId', ParseIntPipe) id: number, @CurrentUser() user?: AuthUser) {
    return this.polls.getPoll(id, user?.id);
  }

  @Put()
  setOptions(@Param('gatheringId', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const raw = (body ?? {}).options;
    if (raw != null && !Array.isArray(raw)) throw AppError.status(400, 'options는 배열이어야 합니다.');
    const list = (raw ?? []) as unknown[];
    for (const o of list) if (typeof o !== 'object' || o === null || Array.isArray(o)) throw AppError.status(400, '장소 후보 형식이 올바르지 않습니다.');
    return this.polls.setOptions(id, user.id, list as Record<string, unknown>[]);
  }

  @Post('vote')
  @HttpCode(200)
  vote(@Param('gatheringId', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    const raw = (body ?? {}).optionId;
    let optionId: number | null = null;
    if (raw != null) {
      if (typeof raw === 'number') optionId = Math.trunc(raw);
      else {
        const s = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
        if (!/^[+-]?\d+$/.test(s)) throw AppError.status(400, '후보 id가 올바르지 않습니다.');
        optionId = Number(s);
      }
    }
    return this.polls.vote(id, user.id, optionId);
  }
}

/** Spring GatheringController — 목록·상세 공개, 나머지 인증 */
@Controller('api/gatherings')
export class GatheringController {
  constructor(private readonly gatherings: GatheringService) {}

  @Public()
  @Get()
  list(@Query('status') status: string | undefined, @Query('page') page: string | undefined, @Query('size') size: string | undefined) {
    return this.gatherings.list(status, intParam(page, 0, 'page'), intParam(size, 20, 'size'));
  }

  @Get('my')
  mine(@CurrentUser() user: AuthUser) {
    return this.gatherings.mine(user.id);
  }

  @Public()
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.gatherings.detail(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() body: Body_, @CurrentUser() user: AuthUser) {
    return this.gatherings.create(user.id, readGatheringRequest(body ?? {}));
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    return this.gatherings.update(id, user.id, readGatheringRequest(body ?? {}));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.gatherings.remove(id, user.id);
  }

  @Post(':id/participation')
  @HttpCode(200)
  respond(@Param('id', ParseIntPipe) id: number, @Body() body: Body_, @CurrentUser() user: AuthUser) {
    return this.gatherings.respond(id, user.id, jsonString(body?.status, 'status'), jsonString(body?.reason, 'reason'));
  }

  @Delete(':id/participation')
  @HttpCode(204)
  async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.gatherings.cancel(id, user.id);
  }

  @Get(':id/participants')
  participants(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.gatherings.participants(id, user.id);
  }

  @Post(':id/close-recruitment')
  @HttpCode(200)
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.gatherings.closeRecruitment(id, user.id);
  }
}
