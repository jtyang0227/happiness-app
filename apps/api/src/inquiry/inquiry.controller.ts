import { Body, Controller, Delete, Get, HttpCode, Logger, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Public, isAdmin } from '../auth/auth.guard.js';
import { htmlEscape, isBlank, javaTrim, jsonLong, jsonString } from '../common/json-body.js';
import { requiredLong } from '../common/params.js';
import { EmptyResponseError, RawBodyError } from '../common/raw-body-error.js';
import { localDateTime, now } from '../common/time.js';
import type { inquiries } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { maskEmail } from '../member/member.mapper.js';

interface InquiryRequest {
  receiverMemberId: number | null;
  senderName: string | null;
  senderEmail: string | null;
  shootType: string | null;
  shootDate: string | null;
  budget: string | null;
  message: string | null;
  sourceSeriesId: number | null;
}

function readRequest(b: Record<string, unknown>): InquiryRequest {
  return {
    receiverMemberId: jsonLong(b.receiverMemberId, 'receiverMemberId'),
    senderName: jsonString(b.senderName, 'senderName'),
    senderEmail: jsonString(b.senderEmail, 'senderEmail'),
    shootType: jsonString(b.shootType, 'shootType'),
    shootDate: jsonString(b.shootDate, 'shootDate'),
    budget: jsonString(b.budget, 'budget'),
    message: jsonString(b.message, 'message'),
    sourceSeriesId: jsonLong(b.sourceSeriesId, 'sourceSeriesId'),
  };
}

const toResponse = (i: inquiries) => ({
  id: Number(i.id),
  receiverMemberId: Number(i.receiver_member_id),
  senderName: i.sender_name,
  senderEmail: i.sender_email,
  shootType: i.shoot_type,
  shootDate: i.shoot_date,
  budget: i.budget,
  message: i.message,
  sourceSeriesId: i.source_series_id == null ? null : Number(i.source_series_id),
  sourceSeriesTitle: null as string | null,
  isRead: i.is_read,
  createdAt: localDateTime(i.created_at),
});

/** Spring InquiryEmailService.buildHtml — 공개 입력이라 모든 값을 이스케이프 */
export function buildInquiryHtml(r: InquiryRequest): string {
  const esc = (v: string | null) => (v == null ? '' : htmlEscape(v));
  const orDash = (v: string | null) => (v != null ? esc(v) : '—');
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:12px;">
  <h2 style="color:#5b6ef5;">✦ 새 촬영 문의</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;color:#666;width:100px;">보내는 분</td><td style="padding:8px 0;font-weight:700;">${esc(r.senderName)}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">이메일</td><td style="padding:8px 0;">${esc(r.senderEmail)}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">촬영 종류</td><td style="padding:8px 0;">${orDash(r.shootType)}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">희망 날짜</td><td style="padding:8px 0;">${orDash(r.shootDate)}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">예산</td><td style="padding:8px 0;">${orDash(r.budget)}</td></tr>
  </table>
  <div style="margin-top:16px;padding:16px;background:#fff;border-radius:8px;border-left:3px solid #5b6ef5;">
    <p style="color:#333;line-height:1.7;margin:0;">${esc(r.message).replaceAll('\n', '<br>')}</p>
  </div>
  <p style="color:#999;font-size:12px;margin-top:16px;">Happiness 포트폴리오 갤러리에서 발송된 문의입니다.</p>
</div>
`;
}

/** Spring InquiryController — 등록은 공개, 수신함·읽음·삭제는 수신자 본인·관리자 */
@Controller('api/inquiry')
export class InquiryController {
  private readonly log = new Logger('InquiryController');
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  @Public()
  @Post()
  @HttpCode(201)
  async create(@Body() body: Record<string, unknown> | undefined) {
    const req = readRequest(body ?? {});
    if (isBlank(req.senderName)) throw new RawBodyError(400, { message: '보내는 분 이름을 입력해주세요.' });
    if (isBlank(req.senderEmail)) throw new RawBodyError(400, { message: '이메일을 입력해주세요.' });
    if (isBlank(req.message)) throw new RawBodyError(400, { message: '메시지를 입력해주세요.' });
    if (req.receiverMemberId == null) throw new RawBodyError(400, { message: 'receiverMemberId는 필수입니다.' });
    const receiver = BigInt(req.receiverMemberId);

    // 출처 작업은 수신 작가의 시리즈일 때만 기록 — 아니면 조용히 버린다
    let sourceSeriesId: bigint | null = null;
    if (req.sourceSeriesId != null) {
      const s = await this.prisma.series.findUnique({ where: { id: BigInt(req.sourceSeriesId) }, select: { member_id: true } });
      if (s?.member_id === receiver) sourceSeriesId = BigInt(req.sourceSeriesId);
    }
    const saved = await this.prisma.inquiries.create({ data: {
      receiver_member_id: receiver,
      sender_name: javaTrim(req.senderName!),
      sender_email: javaTrim(req.senderEmail!),
      shoot_type: req.shootType,
      shoot_date: req.shootDate,
      budget: req.budget,
      message: javaTrim(req.message!),
      source_series_id: sourceSeriesId,
      is_read: false,
      created_at: now(),
    } });

    // 분석 KPI "문의" — 실패해도 문의 접수는 막지 않는다
    try {
      await this.prisma.analytics_events.create({ data: {
        event_type: 'INQUIRY_SENT', target_type: sourceSeriesId != null ? 'SERIES' : 'PORTFOLIO', target_id: sourceSeriesId,
        member_id: receiver, created_at: now(),
      } });
    } catch (e) {
      this.log.warn(`[Analytics] INQUIRY_SENT 기록 실패 (문의는 저장됨): ${(e as Error).message}`);
    }

    const artist = await this.prisma.members.findUnique({ where: { id: receiver }, select: { email: true } });
    if (artist) await this.notify(artist.email, req);
    return { message: '문의가 성공적으로 접수되었습니다.', id: Number(saved.id) };
  }

  private async notify(artistEmail: string | null, req: InquiryRequest) {
    if (!process.env.MAIL_HOST || isBlank(artistEmail)) {
      this.log.log('Mail not configured or artist email not set — inquiry saved to DB only.');
      return;
    }
    const subject = `[Happiness] 새 문의가 도착했습니다 — ${String(req.senderName).replace(/[\r\n]+/g, ' ')}`;
    if (await this.mail.send(artistEmail!, subject, buildInquiryHtml(req), 'Inquiry')) {
      this.log.log(`Inquiry notification sent to ${maskEmail(artistEmail)}`);
    }
  }

  @Get('inbox')
  async inbox(@Query('memberId') memberId: string | undefined, @CurrentUser() user: AuthUser) {
    const id = requiredLong(memberId, 'memberId');
    if (id !== user.id && !isAdmin(user)) throw new EmptyResponseError(403);
    const rows = await this.prisma.inquiries.findMany({ where: { receiver_member_id: BigInt(id) }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }] });
    const list = rows.map(toResponse);
    const ids = [...new Set(rows.flatMap((r) => (r.source_series_id == null ? [] : [r.source_series_id])))];
    if (ids.length) {
      const titles = new Map((await this.prisma.series.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })).map((s) => [Number(s.id), s.title]));
      for (const r of list) if (r.sourceSeriesId != null) r.sourceSeriesTitle = titles.get(r.sourceSeriesId) ?? null;
    }
    return list;
  }

  @Get('inbox/unread-count')
  async unreadCount(@Query('memberId') memberId: string | undefined, @CurrentUser() user: AuthUser) {
    const id = requiredLong(memberId, 'memberId');
    if (id !== user.id && !isAdmin(user)) throw new EmptyResponseError(403);
    return { count: await this.prisma.inquiries.count({ where: { receiver_member_id: BigInt(id), is_read: false } }) };
  }

  @Put(':id/read')
  async markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const i = await this.prisma.inquiries.findUnique({ where: { id: BigInt(id) } });
    if (!i) throw new EmptyResponseError(404);
    if (Number(i.receiver_member_id) !== user.id && !isAdmin(user)) throw new EmptyResponseError(403);
    if (!i.is_read) await this.prisma.inquiries.update({ where: { id: i.id }, data: { is_read: true } });
    return { message: '읽음 처리되었습니다.' };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const i = await this.prisma.inquiries.findUnique({ where: { id: BigInt(id) } });
    if (!i) throw new EmptyResponseError(404);
    if (Number(i.receiver_member_id) !== user.id && !isAdmin(user)) throw new EmptyResponseError(403);
    await this.prisma.inquiries.delete({ where: { id: i.id } });
  }
}
