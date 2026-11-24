import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ok } from '../common/api-response.js';
import { escapeHtml4 } from '../common/escape-html4.js';
import { header } from '../common/xss-query.middleware.js';
import { Public } from '../auth/auth.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { OAuthService } from './oauth.service.js';

/** Spring AuthController의 /oauth/** */
@Public()
@Controller('api/auth/oauth')
export class OAuthController {
  constructor(private readonly oauth: OAuthService, private readonly auth: AuthService) {}

  @Post('kakao')
  @HttpCode(200)
  async kakao(@Body() body: { code?: string } | undefined, @Req() req: Request) {
    return ok(await this.auth.issueForOAuth(await this.oauth.kakao(body?.code), header(req, 'x-device-id')));
  }

  @Post('google')
  @HttpCode(200)
  async google(@Body() body: { code?: string } | undefined, @Req() req: Request) {
    return ok(await this.auth.issueForOAuth(await this.oauth.google(body?.code), header(req, 'x-device-id')));
  }

  @Post('naver')
  @HttpCode(200)
  async naver(@Body() body: { code?: string; state?: string } | undefined, @Req() req: Request) {
    return ok(await this.auth.issueForOAuth(await this.oauth.naver(body?.code, body?.state), header(req, 'x-device-id')));
  }

  /**
   * Apple form_post → 처리 후 프론트로 302. 어떤 실패든 ?error=apple_login_failed.
   * 폼 값도 Spring XSS 필터처럼 이스케이프한다 — 그래서 user JSON의 따옴표가 깨져 이름은 늘 기본값(Spring과 같음).
   */
  @Post('apple/callback')
  async apple(@Body() body: Record<string, string> | undefined, @Req() req: Request, @Res() res: Response) {
    const base = this.oauth.appleFrontendRedirect;
    try {
      const t = await this.auth.issueForOAuth(await this.oauth.apple(escapeHtml4(body?.id_token), escapeHtml4(body?.user)), header(req, 'x-device-id'));
      res.redirect(302, `${base}?accessToken=${encodeURIComponent(t.accessToken)}&refreshToken=${encodeURIComponent(t.refreshToken)}&memberId=${t.member.id}`);
    } catch {
      res.redirect(302, `${base}?error=apple_login_failed`);
    }
  }
}
