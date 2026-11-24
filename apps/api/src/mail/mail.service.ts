import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

/**
 * Spring JavaMailSender + `spring.mail.*`와 같은 환경 변수(MAIL_HOST/PORT/USERNAME/PASSWORD/FROM).
 * MAIL_HOST가 없거나 발송이 실패하면 false — 요청 자체는 실패시키지 않는다(Spring 정책과 같음).
 */
@Injectable()
export class MailService {
  private readonly log = new Logger('MailService');
  private transporter: Transporter | null | undefined;

  get from() {
    return process.env.MAIL_FROM || 'noreply@happiness.app';
  }

  private transport(): Transporter | null {
    if (this.transporter !== undefined) return this.transporter;
    const host = process.env.MAIL_HOST;
    if (!host) return (this.transporter = null);
    const port = Number(process.env.MAIL_PORT || 587);
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465, // starttls.enable=true
      auth: process.env.MAIL_USERNAME ? { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD } : undefined,
    });
    return this.transporter;
  }

  async send(to: string, subject: string, html: string, tag: string): Promise<boolean> {
    const t = this.transport();
    if (!t) {
      this.log.warn(`[${tag}] 메일 서버 미설정(MAIL_HOST) — 메일을 보내지 못했습니다.`);
      return false;
    }
    try {
      await t.sendMail({ from: this.from, to, subject, html });
      return true;
    } catch (e) {
      this.log.warn(`[${tag}] 메일 발송 실패: ${(e as Error).message}`);
      return false;
    }
  }
}
