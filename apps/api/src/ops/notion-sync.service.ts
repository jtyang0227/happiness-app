import { Injectable, Logger } from '@nestjs/common';
import type { bookings, inquiries } from '../generated/prisma/client.js';
import { localDate } from '../common/time.js';

/**
 * 예약·문의를 운영자 노션 「해피니스 운영 센터」 DB로 옮긴다(단방향, 앱 → 노션).
 * - NOTION_TOKEN과 대상 DB ID가 없으면 아무것도 하지 않는다(기본 꺼짐).
 * - 사용자 요청을 절대 막지 않는다: 호출부는 기다리지 않고, 실패는 경고 로그만 남긴다.
 * - 고객 이름은 마스킹, 연락처는 OPS_NOTION_INCLUDE_CONTACT=true일 때만 보낸다.
 * 노션 DB 속성 이름은 DESIGN_PROMPTS/planning/PROMPT_ops-notion-google.md 표와 같아야 한다.
 */
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const TIMEOUT_MS = 3000;

const STATUS_LABEL: Record<string, string> = { REQUESTED: '요청', CONFIRMED: '확정', REJECTED: '거절', CANCELLED: '취소' };
const SHOOT_TYPE_LABEL: Record<string, string> = {
  WEDDING: '웨딩', SNAP: '스냅', PROFILE: '프로필', MATERNITY: '만삭', NEWBORN: '신생아', COMMERCIAL: '상업', CUSTOM: '협의',
};
const PAYMENT_LABEL: Record<string, string> = { PENDING: '미수', RECEIVED: '수금' };

type NotionProps = Record<string, unknown>;

const text = (s: string | null | undefined) => ({ rich_text: s ? [{ text: { content: s.slice(0, 2000) } }] : [] });
const title = (s: string) => ({ title: [{ text: { content: s.slice(0, 200) } }] });
const select = (s: string | null | undefined) => ({ select: s ? { name: s.replace(/,/g, ' ') } : null });
const date = (d: string | null | undefined) => ({ date: d ? { start: d } : null });
const num = (n: number | bigint | null | undefined) => ({ number: n == null ? null : Number(n) });

/** "김민수" → "김*수", "이준" → "이*", 영문 "John" → "J**n" */
export function maskName(name: string | null | undefined): string {
  const s = (name ?? '').trim();
  const chars = [...s];
  if (chars.length === 0) return '(이름 없음)';
  if (chars.length === 1) return '*';
  if (chars.length === 2) return `${chars[0]}*`;
  return chars[0] + '*'.repeat(chars.length - 2) + chars[chars.length - 1];
}

const shootTypeLabel = (t: string | null | undefined) => (t ? SHOOT_TYPE_LABEL[t] ?? t : null);

export function bookingProperties(b: bookings, includeContact: boolean): NotionProps {
  const type = shootTypeLabel(b.shoot_type);
  const props: NotionProps = {
    '고객': title(type ? `${maskName(b.client_name)} · ${type}` : maskName(b.client_name)),
    '예약 ID': num(b.id),
    '상태': select(STATUS_LABEL[b.status ?? ''] ?? b.status),
    '촬영일': date(localDate(b.shoot_date)),
    '촬영 시간': text(b.shoot_time),
    '촬영 종류': select(type),
    '작가 회원 ID': num(b.member_id),
    '납품 기한': date(localDate(b.delivery_deadline)),
    '계약금': num(b.deposit_amount),
    '계약금 상태': select(PAYMENT_LABEL[b.deposit_status ?? ''] ?? null),
    '잔금': num(b.balance_amount),
    '잔금 상태': select(PAYMENT_LABEL[b.balance_status ?? ''] ?? null),
    '메모': text(b.memo),
    '거절 사유': text(b.reject_reason),
    '접수일': date(localDate(b.created_at)),
  };
  if (includeContact) props['연락처'] = text([b.client_phone, b.client_email].filter(Boolean).join(' / ') || null);
  return props;
}

export function inquiryProperties(i: inquiries, includeContact: boolean): NotionProps {
  const type = shootTypeLabel(i.shoot_type);
  const summary = i.message.replace(/\s+/g, ' ').trim();
  // 문의 폼의 희망 날짜는 자유 입력 문자열 — YYYY-MM-DD일 때만 날짜 속성으로 넣는다
  const wantDate = i.shoot_date && /^\d{4}-\d{2}-\d{2}$/.test(i.shoot_date) ? i.shoot_date : null;
  const props: NotionProps = {
    '제목': title(`${maskName(i.sender_name)} · ${type ?? '문의'}`),
    '문의 ID': num(i.id),
    '출처': select('앱'),
    '처리 상태': select('새 문의'),
    '작가 회원 ID': num(i.receiver_member_id),
    '촬영 종류': text(type),
    '희망 날짜': date(wantDate),
    '예산': text(i.budget),
    '요약': text(summary.length > 200 ? `${summary.slice(0, 200)}…` : summary),
    '접수일': date(localDate(i.created_at)),
  };
  if (includeContact) props['연락처'] = text(i.sender_email);
  return props;
}

@Injectable()
export class NotionSyncService {
  private readonly log = new Logger('NotionSyncService');

  private get token() { return process.env.NOTION_TOKEN?.trim() || null; }
  private get includeContact() { return process.env.OPS_NOTION_INCLUDE_CONTACT === 'true'; }

  /** 예약 생성·상태 변경 후 호출. 기다리지 않는다. */
  bookingChanged(b: bookings): void {
    const db = process.env.NOTION_BOOKING_DB_ID?.trim();
    if (!this.token || !db) return;
    void this.upsert(db, '예약 ID', Number(b.id), bookingProperties(b, this.includeContact), false)
      .catch((e) => this.log.warn(`[Notion] 예약 ${b.id} 동기화 실패 (예약은 저장됨): ${(e as Error).message}`));
  }

  /** 문의 생성 후 호출. 기다리지 않는다. 처리 상태는 운영자가 노션에서 바꾸므로 이미 있으면 덮어쓰지 않는다. */
  inquiryCreated(i: inquiries): void {
    const db = process.env.NOTION_INQUIRY_DB_ID?.trim();
    if (!this.token || !db) return;
    void this.upsert(db, '문의 ID', Number(i.id), inquiryProperties(i, this.includeContact), true)
      .catch((e) => this.log.warn(`[Notion] 문의 ${i.id} 동기화 실패 (문의는 저장됨): ${(e as Error).message}`));
  }

  /** 키 속성으로 행을 찾아 있으면 수정, 없으면 만든다. */
  async upsert(databaseId: string, keyProp: string, key: number, properties: NotionProps, createOnly: boolean): Promise<void> {
    const found = await this.call('POST', `/databases/${databaseId}/query`, {
      filter: { property: keyProp, number: { equals: key } }, page_size: 1,
    }) as { results?: { id: string }[] };
    const pageId = found.results?.[0]?.id;
    if (pageId) {
      if (!createOnly) await this.call('PATCH', `/pages/${pageId}`, { properties });
      return;
    }
    await this.call('POST', '/pages', { parent: { database_id: databaseId }, properties });
  }

  private async call(method: string, path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${NOTION_API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Notion ${method} ${path.split('/')[1]} → ${res.status}`);
    return res.json();
  }
}
