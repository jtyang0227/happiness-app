import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AuthUser, CurrentUser, Public } from '../auth/auth.guard.js';
import { clientIp } from '../common/client-ip.js';
import { javaToString, javaTrim } from '../common/json-body.js';
import { EmptyResponseError, RawBodyError } from '../common/raw-body-error.js';
import { localDateTime, now } from '../common/time.js';
import { PrismaService } from '../prisma/prisma.service.js';

const EMAIL = /^[^@ \t\n\u000B\f\r]+@[^@ \t\n\u000B\f\r]+\.[^@ \t\n\u000B\f\r]+$/;

/** Spring NewsletterController — 구독·취소 공개(구독은 IP당 분당 5회), 구독자 목록은 작가 본인 */
@Controller('api/newsletter')
export class NewsletterController {
  private readonly rate = new Map<string, { count: number; start: number }>();
  constructor(private readonly prisma: PrismaService) {}

  private allow(ip: string) {
    const t = Date.now();
    const s = this.rate.get(ip);
    const st = !s || t - s.start > 60_000 ? { count: 1, start: t } : { count: s.count + 1, start: s.start };
    this.rate.set(ip, st);
    return st.count <= 5;
  }

  @Public()
  @Post('subscribe/:memberId')
  async subscribe(@Param('memberId', ParseIntPipe) memberId: number, @Body() body: Record<string, unknown> | undefined, @Req() req: Request,
    @Res({ passthrough: true }) res: Response) {
    if (!this.allow(clientIp(req))) throw new RawBodyError(429, { error: '잠시 후 다시 시도해주세요.' });
    const raw = (body ?? {}).email;
    const email = javaTrim(raw == null ? '' : javaToString(raw)).toLowerCase();
    if (!EMAIL.test(email)) throw new RawBodyError(400, { error: '이메일 형식이 올바르지 않습니다.' });
    const existing = await this.prisma.newsletter_subscribers.findFirst({ where: { member_id: BigInt(memberId), email } });
    if (existing) {
      if (existing.unsubscribed_at != null) {
        await this.prisma.newsletter_subscribers.update({ where: { id: existing.id }, data: { unsubscribed_at: null } });
        res.status(200);
        return { status: 'resubscribed' };
      }
      res.status(200);
      return { status: 'already_subscribed' };
    }
    await this.prisma.newsletter_subscribers.create({ data: { member_id: BigInt(memberId), email, token: randomUUID().replaceAll('-', ''), subscribed_at: now() } });
    res.status(201);
    return { status: 'subscribed' };
  }

  @Public()
  @Get('unsubscribe/:token')
  async unsubscribe(@Param('token') token: string) {
    const s = await this.prisma.newsletter_subscribers.findUnique({ where: { token } });
    if (!s) throw new EmptyResponseError(404);
    await this.prisma.newsletter_subscribers.update({ where: { id: s.id }, data: { unsubscribed_at: now() } });
    return { status: 'unsubscribed' };
  }

  @Get('subscribers')
  async subscribers(@CurrentUser() user: AuthUser) {
    const where = { member_id: BigInt(user.id), unsubscribed_at: null };
    const rows = await this.prisma.newsletter_subscribers.findMany({ where, orderBy: [{ subscribed_at: 'desc' }, { id: 'desc' }] });
    return { count: rows.length, subscribers: rows.map((s) => ({ id: Number(s.id), email: s.email, subscribedAt: localDateTime(s.subscribed_at) })) };
  }
}
