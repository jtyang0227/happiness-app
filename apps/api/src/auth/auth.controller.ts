import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ok } from '../common/api-response.js';
import { header } from '../common/xss-query.middleware.js';
import { clientIp } from '../common/client-ip.js';
import { AppError } from '../common/app-error.js';
import { MemberService, ProfileUpdateRequest, SignUpRequest } from '../member/member.service.js';
import { maskedContact, withoutContact } from '../member/member.mapper.js';
import { AuthUser, CurrentUser, Public, Roles, isAdmin } from './auth.guard.js';
import { AuthService } from './auth.service.js';

/**
 * `/api/auth/**` (Spring AuthController). 아직 없는 것(OAuth, 탈퇴 DELETE member/{id})은
 * 레거시 프록시로 Spring이 처리한다. 계정 찾기는 AccountRecoveryController.
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly members: MemberService, private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(201)
  async signup(@Body() body: SignUpRequest) {
    return ok(await this.members.signUp(body ?? {}));
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email: string; password: string; deviceId?: string }, @Req() req: Request) {
    return ok(await this.auth.login(body, clientIp(req), header(req, 'x-device-id')));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: { refreshToken?: string; deviceId?: string }, @Req() req: Request) {
    return ok(await this.auth.refresh(body ?? {}, header(req, 'x-device-id')));
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() body: { deviceId?: string; allDevices?: boolean } | undefined, @Req() req: Request) {
    const authz = req.header('authorization');
    await this.auth.logout(authz?.startsWith('Bearer ') ? authz.slice(7) : null, body ?? {}, header(req, 'x-device-id'));
    return ok();
  }

  @Public()
  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    return ok({ available: await this.members.isEmailAvailable(email ?? '') });
  }

  @Public()
  @Get('check-profile-name')
  async checkProfileName(@Query('name') name: string) {
    return ok({ available: await this.members.isProfileNameAvailable(name ?? '') });
  }

  @Get('member/:id')
  async getMember(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const m = await this.members.getMember(id);
    return ok(user.id === id || isAdmin(user) ? m : withoutContact(m));
  }

  @Put('member/:id/profile')
  async updateProfile(@Param('id', ParseIntPipe) id: number, @Body() body: ProfileUpdateRequest, @CurrentUser() user: AuthUser) {
    verifySelfOrAdmin(user, id);
    return ok(await this.members.updateProfile(id, body ?? {}));
  }

  /** Spring처럼 인증만 확인 — 남의 통계도 조회 가능 */
  @Get('member/:id/stats')
  async stats(@Param('id', ParseIntPipe) id: number) {
    return ok(await this.members.getStats(id));
  }

  @Put('member/:id/password')
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { currentPassword?: string; newPassword?: string },
    @CurrentUser() user: AuthUser,
  ) {
    verifySelfOrAdmin(user, id);
    await this.members.changePassword(id, body?.currentPassword, body?.newPassword);
    return ok();
  }

  @Get('members')
  @Roles('WM', 'SA')
  async allMembers() {
    return ok((await this.members.getAllMembers()).map(maskedContact));
  }

  /** 래퍼 없는 배열 (Spring과 같음). q가 없으면 Spring은 500 — 그대로 둔다(README 알려진 차이). */
  @Get('members/search')
  async search(@Query('q') q?: string, @Query('size') size?: string) {
    if (q == null) throw new Error('Required request parameter q is not present');
    const n = size == null ? 10 : Number.parseInt(size, 10);
    if (Number.isNaN(n)) throw new Error('size is not a number');
    return (await this.members.searchMembers(q, n)).map(withoutContact);
  }

  @Put('member/:id/role')
  @Roles('WM', 'SA')
  async changeRole(@Param('id', ParseIntPipe) id: number, @Body() body: { role?: string } | undefined) {
    return ok(await this.members.changeRole(id, body?.role));
  }
}

function verifySelfOrAdmin(user: AuthUser, id: number) {
  if (user.id !== id && !isAdmin(user)) throw AppError.of('FORBIDDEN');
}
