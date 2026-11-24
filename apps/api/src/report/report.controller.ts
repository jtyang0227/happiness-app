import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { optionalInt } from '../common/params.js';
import { AuthUser, CurrentUser, Roles } from '../auth/auth.guard.js';
import { ReportRequest, ReportService } from './report.service.js';

/** Spring Photo/Comment/AdminReportController — 응답은 전부 래퍼 없는 JSON */
@Controller()
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  @Post('api/photos/:photoId/report')
  @HttpCode(201)
  async photo(@Param('photoId', ParseIntPipe) photoId: number, @Body() body: ReportRequest | undefined, @CurrentUser() user: AuthUser) {
    return this.reports.createPhotoReport(photoId, user.id, body ?? {});
  }

  @Post('api/comments/:commentId/report')
  @HttpCode(201)
  async comment(@Param('commentId', ParseIntPipe) commentId: number, @Body() body: ReportRequest | undefined, @CurrentUser() user: AuthUser) {
    return this.reports.createCommentReport(commentId, user.id, body ?? {});
  }

  @Get('api/photos/reports/mine')
  async mine(@CurrentUser() user: AuthUser) {
    return this.reports.mine(user.id);
  }

  @Get('api/photos/reports/mine/unread-count')
  async unread(@CurrentUser() user: AuthUser) {
    return { count: await this.reports.unreadCount(user.id) };
  }

  @Put('api/photos/reports/mine/:id/seen')
  async seen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.reports.markSeen(id, user.id);
    return { message: '확인 처리되었습니다.' };
  }

  @Get('api/admin/reports')
  @Roles('WM', 'SA')
  async adminList(@Query('status') status?: string, @Query('page') page?: string, @Query('size') size?: string) {
    return this.reports.adminList(status, optionalInt(page, 'page', 0), optionalInt(size, 'size', 20));
  }

  @Put('api/admin/reports/:id')
  @Roles('WM', 'SA')
  async adminUpdate(@Param('id', ParseIntPipe) id: number, @Body() body: { status?: string; resolutionNote?: string | null } | undefined, @CurrentUser() user: AuthUser) {
    return this.reports.adminUpdate(id, body ?? {}, user.email);
  }
}
