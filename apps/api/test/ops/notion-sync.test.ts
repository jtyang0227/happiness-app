import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingProperties, inquiryProperties, maskName, NotionSyncService } from '../../src/ops/notion-sync.service.js';
import type { bookings, inquiries } from '../../src/generated/prisma/client.js';

const booking = (over: Partial<bookings> = {}) => ({
  id: 42n, member_id: 7n, shoot_date: new Date('2026-12-05T00:00:00Z'), shoot_time: '14:00', shoot_type: 'WEDDING',
  client_name: '김민수', client_phone: '010-1234-5678', client_email: 'c@example.com', memo: '야외', status: 'REQUESTED',
  reject_reason: null, created_at: new Date('2026-11-27T03:00:00Z'), confirmed_at: null, cancelled_at: null, checklist_json: null,
  delivery_deadline: null, deposit_status: 'PENDING', deposit_amount: 100000, deposit_received_at: null,
  balance_status: 'PENDING', balance_amount: null, balance_received_at: null, ...over,
}) as unknown as bookings;

const inquiry = (over: Partial<inquiries> = {}) => ({
  id: 9n, budget: '50만원', created_at: new Date('2026-11-27T03:00:00Z'), is_read: false, message: '12월 스냅 가능할까요?\n감사합니다',
  receiver_member_id: 7n, sender_email: 's@example.com', sender_name: '이준', shoot_date: '2026-12-10', shoot_type: 'SNAP',
  source_series_id: null, ...over,
}) as unknown as inquiries;

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('maskName', () => {
  it('가운데 글자를 가린다', () => {
    expect(maskName('김민수')).toBe('김*수');
    expect(maskName('이준')).toBe('이*');
    expect(maskName('John')).toBe('J**n');
    expect(maskName('  ')).toBe('(이름 없음)');
  });
});

describe('bookingProperties', () => {
  it('상태·촬영 종류를 한글 선택지로, 이름은 마스킹, 연락처는 기본 제외', () => {
    const p = bookingProperties(booking(), false) as Record<string, any>;
    expect(p['고객'].title[0].text.content).toBe('김*수 · 웨딩');
    expect(p['상태'].select.name).toBe('요청');
    expect(p['촬영일'].date.start).toBe('2026-12-05');
    expect(p['예약 ID'].number).toBe(42);
    expect(p['계약금 상태'].select.name).toBe('미수');
    expect(p['연락처']).toBeUndefined();
    expect(JSON.stringify(p)).not.toContain('010-1234-5678');
  });
  it('OPS_NOTION_INCLUDE_CONTACT일 때만 연락처를 넣는다', () => {
    const p = bookingProperties(booking(), true) as Record<string, any>;
    expect(p['연락처'].rich_text[0].text.content).toBe('010-1234-5678 / c@example.com');
  });
});

describe('inquiryProperties', () => {
  it('요약은 공백을 합치고 희망 날짜는 YYYY-MM-DD일 때만 날짜로', () => {
    const p = inquiryProperties(inquiry(), false) as Record<string, any>;
    expect(p['요약'].rich_text[0].text.content).toBe('12월 스냅 가능할까요? 감사합니다');
    expect(p['희망 날짜'].date.start).toBe('2026-12-10');
    expect(p['처리 상태'].select.name).toBe('새 문의');
    const free = inquiryProperties(inquiry({ shoot_date: '12월 중순' }), false) as Record<string, any>;
    expect(free['희망 날짜'].date).toBeNull();
  });
});

describe('NotionSyncService', () => {
  const env = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    process.env.NOTION_TOKEN = 'test-token';
    process.env.NOTION_BOOKING_DB_ID = 'bookingdb';
    process.env.NOTION_INQUIRY_DB_ID = 'inquirydb';
  });
  afterEach(() => { vi.unstubAllGlobals(); process.env = { ...env }; });

  it('토큰이 없으면 아무 요청도 하지 않는다', async () => {
    delete process.env.NOTION_TOKEN;
    new NotionSyncService().bookingChanged(booking());
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('행이 없으면 만든다', async () => {
    fetchMock.mockResolvedValueOnce(ok({ results: [] })).mockResolvedValueOnce(ok({ id: 'new' }));
    new NotionSyncService().bookingChanged(booking());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [qUrl, qInit] = fetchMock.mock.calls[0];
    expect(qUrl).toBe('https://api.notion.com/v1/databases/bookingdb/query');
    expect(JSON.parse(qInit.body).filter).toEqual({ property: '예약 ID', number: { equals: 42 } });
    expect(qInit.headers.Authorization).toBe('Bearer test-token');
    const [cUrl, cInit] = fetchMock.mock.calls[1];
    expect(cUrl).toBe('https://api.notion.com/v1/pages');
    expect(JSON.parse(cInit.body).parent).toEqual({ database_id: 'bookingdb' });
  });

  it('예약 행이 있으면 수정한다', async () => {
    fetchMock.mockResolvedValueOnce(ok({ results: [{ id: 'page-1' }] })).mockResolvedValueOnce(ok({}));
    new NotionSyncService().bookingChanged(booking({ status: 'CONFIRMED' }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api.notion.com/v1/pages/page-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body).properties['상태'].select.name).toBe('확정');
  });

  it('문의 행이 이미 있으면 운영자가 바꾼 처리 상태를 덮어쓰지 않는다', async () => {
    fetchMock.mockResolvedValueOnce(ok({ results: [{ id: 'page-9' }] }));
    new NotionSyncService().inquiryCreated(inquiry());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('노션 오류는 예외로 새지 않는다', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    expect(() => new NotionSyncService().bookingChanged(booking())).not.toThrow();
    await flush();
  });
});
