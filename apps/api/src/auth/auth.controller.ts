import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ok } from '../common/api-response.js';
import { clientIp } from '../common/client-ip.js';
import { MemberService, SignUpRequest } from '../member/member.service.js';
import { withoutContact } from '../member/member.mapper.js';
import { AuthUser, CurrentUser, Public, isAdmin } from './auth.guard.js';
import { AuthService } from './auth.service.js';

/**
 * `/api/auth/**` 중 2단계에서 옮긴 것. 나머지(OAuth·프로필 수정·비밀번호·탈퇴·관리자 목록·검색·계정 찾기)는
 * 아직 이 컨트롤러에 없어서 레거시 프록시로 Spring이 처리한다.
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
    return ok(await this.auth.login(body, clientIp(req), req.header('x-device-id')));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: { refreshToken?: string; deviceId?: string }, @Req() req: Request) {
    return ok(await this.auth.refresh(body ?? {}, req.header('x-device-id')));
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() body: { deviceId?: string; allDevices?: boolean } | undefined, @Req() req: Request) {
    const header = req.header('authorization');
    await this.auth.logout(header?.startsWith('Bearer ') ? header.slice(7) : null, body ?? {}, req.header('x-device-id'));
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
}
