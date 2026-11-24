import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { jsonInt, jsonString } from '../../common/json-body.js';
import type { AdminPrincipal } from '../auth/admin-auth.middleware.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { requireWm } from '../common/admin-errors.js';
import { intParam, longParam, optStrParam } from '../common/admin-params.js';
import { ClientIp, jsonField, objectBody, stringMap } from '../common/admin-request.js';
import { AdminMemberService } from './admin-member.service.js';

/** Spring 어드민 AdminMemberController — /api/admin/members */
@Controller('api/admin/members')
export class AdminMemberController {
  constructor(private readonly members: AdminMemberService) {}

  @Get()
  list(@CurrentAdmin() admin: AdminPrincipal, @ClientIp() ip: string | null, @Query() q: Record<string, unknown>) {
    return this.members.list(admin, ip, optStrParam(q.search), optStrParam(q.authority), optStrParam(q.status), intParam(q.page, 0), intParam(q.size, 20));
  }

  @Get('summary')
  summary() {
    return this.members.summary();
  }

  @Post('export')
  @HttpCode(200)
  export(@CurrentAdmin() admin: AdminPrincipal, @ClientIp() ip: string | null, @Body() body: unknown) {
    return this.members.export(admin, ip, stringMap(body, false));
  }

  @Post(':id/reveal')
  @HttpCode(200)
  reveal(@CurrentAdmin() admin: AdminPrincipal, @ClientIp() ip: string | null, @Param('id') id: string, @Body() body: unknown) {
    const memberId = longParam(id);
    return this.members.reveal(admin, ip, memberId, stringMap(body).reason ?? null);
  }

  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.members.history(longParam(id));
  }

  @Get(':id/notes')
  notes(@Param('id') id: string) {
    return this.members.notes(longParam(id));
  }

  @Post(':id/notes')
  @HttpCode(200)
  addNote(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string, @Body() body: unknown) {
    const memberId = longParam(id);
    return this.members.addNote(admin, memberId, stringMap(body).content ?? null);
  }

  @Delete(':id/notes/:noteId')
  async deleteNote(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string, @Param('noteId') noteId: string) {
    await this.members.deleteNote(admin, longParam(id), longParam(noteId));
    return { message: '메모가 삭제되었습니다.' };
  }

  @Get(':id')
  detail(@CurrentAdmin() admin: AdminPrincipal, @ClientIp() ip: string | null, @Param('id') id: string) {
    return this.members.detail(admin, ip, longParam(id));
  }

  @Patch(':id/role')
  async updateRole(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string, @Body() body: unknown) {
    const memberId = longParam(id);
    const b = objectBody(body);
    const authority = jsonField(() => jsonString(b.authority, 'authority'));
    requireWm(admin);
    await this.members.updateRole(admin, memberId, authority);
    return { message: '역할이 변경되었습니다.' };
  }

  @Patch(':id/status')
  async updateStatus(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string, @Body() body: unknown) {
    const memberId = longParam(id);
    const b = objectBody(body);
    const status = jsonField(() => jsonString(b.status, 'status'));
    const reason = jsonField(() => jsonString(b.reason, 'reason'));
    const days = jsonField(() => jsonInt(b.suspendDays, 'suspendDays'));
    await this.members.updateStatus(admin, memberId, status, reason, days);
    return { message: '회원 상태가 변경되었습니다.' };
  }

  @Delete(':id')
  async delete(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string) {
    const memberId = longParam(id);
    requireWm(admin);
    await this.members.deleteMember(admin, memberId);
    return { message: '회원이 영구 삭제되었습니다.' };
  }
}
