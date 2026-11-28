import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseIntPipe, Post, Put, Query, Res } from '@nestjs/common';
import { AuthUser, CurrentUser, Public, Roles } from '../auth/auth.guard.js';
import { ok } from '../common/api-response.js';
import { optionalInt } from '../common/params.js';
import { TicketMonitorService } from './ticket-monitor.service.js';
import { TicketService } from './ticket.service.js';

/** 공개 — 예매 일정·카운트다운. 시각은 모두 서버 UTC 기준(no-store: 캐시된 과거 시각을 막는다) */
@Controller('api/tickets')
export class TicketController {
  constructor(private readonly tickets: TicketService) {}

  @Public()
  @Get('sessions')
  async sessions(@Query('includePast') includePast?: string) {
    return ok(await this.tickets.listSessions(includePast === 'true'));
  }

  @Public()
  @Get('sessions/:id')
  async session(@Param('id', ParseIntPipe) id: number) {
    return ok(await this.tickets.getSession(id));
  }

  @Public()
  @Get('sessions/:id/countdown')
  @Header('Cache-Control', 'no-store')
  async countdown(@Param('id', ParseIntPipe) id: number, @Query('phaseId') phaseId?: string) {
    return ok(await this.tickets.countdown(id, phaseId ? optionalInt(phaseId, 'phaseId', 0) : undefined));
  }

  @Get('phases/:id/notification')
  async getPreference(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return ok(await this.tickets.getPreference(id, user));
  }

  @Put('phases/:id/notification')
  async putPreference(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: AuthUser) {
    return ok(await this.tickets.putPreference(id, body ?? {}, user));
  }

  @Delete('phases/:id/notification')
  async deletePreference(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.tickets.deletePreference(id, user);
    return ok();
  }

  @Get('notifications/unread-count')
  async unreadCount(@CurrentUser() user: AuthUser) {
    return ok(await this.tickets.unreadCount(user));
  }

  @Post('notifications/read-all')
  @HttpCode(200)
  async readAll(@CurrentUser() user: AuthUser) {
    return ok(await this.tickets.markAllRead(user));
  }

  @Get('me/alerts')
  async myAlerts(@CurrentUser() user: AuthUser) {
    return ok(await this.tickets.myAlerts(user));
  }

  /** 기기 캘린더로 가져가기(RFC 5545). 래퍼 없이 파일 자체를 돌려준다 */
  @Public()
  @Get('phases/:id/calendar.ics')
  async ics(@Param('id', ParseIntPipe) id: number, @Res() res: any) {
    const body = await this.tickets.calendarIcs(id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${id}.ics"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(body);
  }

  // ───── 구독 캘린더(webcal) ─────
  @Get('me/calendar-feed')
  async getFeed(@CurrentUser() user: AuthUser) {
    return ok(await this.tickets.getFeed(user));
  }

  /** 새 비밀 링크 — 응답에서만 보인다. 링크 주소는 Host 헤더가 아니라 설정값으로 만든다(주입 방지) */
  @Post('me/calendar-feed')
  @HttpCode(200)
  async issueFeed(@CurrentUser() user: AuthUser) {
    const base = process.env.API_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://api.happiness.io.kr' : `http://localhost:${process.env.PORT || 8090}`);
    return ok(await this.tickets.issueFeed(user, base));
  }

  @Delete('me/calendar-feed')
  async deleteFeed(@CurrentUser() user: AuthUser) {
    await this.tickets.deleteFeed(user);
    return ok();
  }

  @Public()
  @Get('calendar/:file')
  async feed(@Param('file') file: string, @Res() res: any) {
    const body = await this.tickets.feedIcs(String(file).replace(/\.ics$/, ''));
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(body);
  }

  @Get('notifications')
  async notifications(@CurrentUser() user: AuthUser, @Query('page') page?: string, @Query('size') size?: string) {
    return ok(await this.tickets.notifications(user, Math.max(0, optionalInt(page, 'page', 0)), Math.min(Math.max(optionalInt(size, 'size', 20), 1), 50)));
  }

  @Put('notifications/:id/read')
  async read(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.tickets.markRead(id, user);
    return ok();
  }
}

/** 다음 예매 일정 — /api/time 아래(PROMPT 3.4). scope=mine은 로그인 필요 */
@Controller('api/time')
export class NextBookingController {
  constructor(private readonly tickets: TicketService) {}

  @Public()
  @Get('next-booking')
  @Header('Cache-Control', 'no-store')
  async next(@Query('limit') limit?: string, @Query('sessionId') sessionId?: string, @Query('scope') scope?: string, @CurrentUser() user?: AuthUser) {
    return ok(await this.tickets.nextBooking(optionalInt(limit, 'limit', 5), sessionId ? optionalInt(sessionId, 'sessionId', 0) : undefined, scope === 'mine' ? 'mine' : 'all', user));
  }
}

/** 관리자 — 일정 등록·변경(사유 필수)·오픈 확인·모니터링. 모든 쓰기는 감사 로그(AdminAuditInterceptor) */
@Controller('api/admin/tickets')
@Roles('WM', 'SA')
export class AdminTicketController {
  constructor(private readonly tickets: TicketService, private readonly monitor: TicketMonitorService) {}

  @Get('monitor')
  @Header('Cache-Control', 'no-store')
  async status() {
    return ok(await this.monitor.overview());
  }

  @Post('sessions')
  @HttpCode(201)
  async createSession(@Body() body: any, @CurrentUser() user: AuthUser) {
    return ok(await this.tickets.createSession(body ?? {}, user));
  }

  @Put('sessions/:id')
  async updateSession(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return ok(await this.tickets.updateSession(id, body ?? {}));
  }

  @Post('sessions/:id/phases')
  @HttpCode(201)
  async createPhase(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: AuthUser) {
    return ok(await this.tickets.createPhase(id, body ?? {}, user));
  }

  @Put('phases/:id/schedule')
  async changeSchedule(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: AuthUser) {
    return ok(await this.tickets.changeSchedule(id, body ?? {}, user));
  }

  @Post('phases/:id/verify-schedule')
  @HttpCode(200)
  async verifySchedule(@Param('id', ParseIntPipe) id: number) {
    return ok(await this.tickets.verifySchedule(id));
  }

  @Post('phases/:id/verifications')
  @HttpCode(201)
  async verification(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: AuthUser) {
    return ok(await this.tickets.recordVerification(id, body ?? {}, user));
  }

  @Get('phases/:id/history')
  async history(@Param('id', ParseIntPipe) id: number) {
    return ok(await this.tickets.history(id));
  }

  @Post('phases/:id/test-notification')
  @HttpCode(200)
  async test(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return ok(await this.tickets.testNotification(id, user));
  }

  @Get('jobs')
  async jobs(@Query('status') status?: string, @Query('limit') limit?: string) {
    return ok(await this.tickets.listJobs(status ?? 'DEAD', optionalInt(limit, 'limit', 50)));
  }

  @Post('jobs/:id/retry')
  @HttpCode(200)
  async retry(@Param('id', ParseIntPipe) id: number) {
    return ok(await this.tickets.retryJob(id));
  }

  /** 진단 — 시계 재측정 + 큐·처리기 점검 결과 */
  @Post('diagnostics')
  @HttpCode(200)
  async diagnostics() {
    return ok(await this.monitor.diagnostics());
  }
}
