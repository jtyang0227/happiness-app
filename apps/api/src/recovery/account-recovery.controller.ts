import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ok } from '../common/api-response.js';
import { clientIp } from '../common/client-ip.js';
import { Public } from '../auth/auth.guard.js';
import { AccountRecoveryService } from './account-recovery.service.js';

export const RESET_REQUESTED_MESSAGE = '가입된 이메일이면 비밀번호 재설정 메일을 보냈습니다. 메일함(스팸함 포함)을 확인해주세요.';

/** Spring AccountRecoveryController — 전부 공개 */
@Public()
@Controller('api/auth')
export class AccountRecoveryController {
  constructor(private readonly recovery: AccountRecoveryService) {}

  @Post('find-email')
  @HttpCode(200)
  async findEmail(@Body() body: { name?: string; tel?: string } | undefined, @Req() req: Request) {
    return ok({ accounts: await this.recovery.findEmails(body?.name, body?.tel, clientIp(req)) });
  }

  @Post('password-reset/request')
  @HttpCode(200)
  async request(@Body() body: { email?: string } | undefined, @Req() req: Request) {
    await this.recovery.requestReset(body?.email, clientIp(req));
    return ok({ message: RESET_REQUESTED_MESSAGE });
  }

  @Get('password-reset/verify')
  async verify(@Query('token') token?: string) {
    // Spring은 token 파라미터가 아예 없으면 500 — 같은 동작
    if (token == null) throw new Error('Required request parameter token is not present');
    return ok({ valid: true, maskedEmail: await this.recovery.verify(token) });
  }

  @Post('password-reset/confirm')
  @HttpCode(200)
  async confirm(@Body() body: { token?: string; newPassword?: string } | undefined, @Req() req: Request) {
    await this.recovery.confirm(body?.token, body?.newPassword, clientIp(req));
    return ok();
  }
}
