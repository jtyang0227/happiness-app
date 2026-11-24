import { afterAll, describe, expect, it } from 'vitest';
import { closeDb } from './db.js';
import { LOCAL_DATE_TIME, call, signupAndLogin } from './helpers.js';

afterAll(closeDb);

const r = () => Math.floor(Math.random() * 200) + 20;
/** 공인 IP처럼 보이게 — 사설 IP면 서버가 소켓 주소(127.0.0.1)로 묶어 분당 10회 제한을 테스트끼리 나눠 쓴다 */
const pubIp = () => ({ 'X-Forwarded-For': `8.${r()}.${r()}.${r()}` });
const book = (profile: string, body: Record<string, unknown>, ip = pubIp()) => call('POST', `/api/booking/${profile}`, { body, headers: ip });

const YEAR = new Date().getUTCFullYear() + 1;
const d = (m: number, day: number) => `${YEAR}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const BOOKING_KEYS = ['balanceAmount', 'balanceReceivedAt', 'balanceStatus', 'cancelledAt', 'checklistJson', 'clientEmail', 'clientName', 'clientPhone',
  'confirmedAt', 'createdAt', 'deliveryDeadline', 'depositAmount', 'depositReceivedAt', 'depositStatus', 'id', 'memberId', 'memo', 'rejectReason',
  'shootDate', 'shootTime', 'shootType', 'status'];

describe('예약', () => {
  it('설정 기본값·저장(키 active)·달력(요일·차단일·꽉 찬 날·REQUESTED/CONFIRMED만)', async () => {
    const u = await signupAndLogin();
    const def = await call('GET', '/api/booking/availability-settings', { token: u.token });
    expect(def.body).toEqual({ weekdays: '1,2,3,4,5', timeSlots: '10:00,14:00', bufferHours: 0, bookingNote: null, active: true });

    // 설정 없음 → 기본(평일·10/14시)
    const cal0 = await call('GET', `/api/booking/${u.profileName}/availability?year=${YEAR}&month=3`);
    expect(cal0.status).toBe(200);
    expect(cal0.body.timeSlots).toEqual(['10:00', '14:00']);

    const saved = await call('PUT', '/api/booking/availability-settings', { token: u.token, body: { weekdays: '1, 3,x', timeSlots: ' 10:00, ,14:00', bufferHours: '2', bookingNote: '안내', active: true, isActive: false } });
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ weekdays: '1, 3,x', timeSlots: ' 10:00, ,14:00', bufferHours: 2, bookingNote: '안내', active: true });

    // 3월의 월·수
    const all: string[] = [];
    for (let day = 1; day <= 31; day++) {
      const wd = new Date(Date.UTC(YEAR, 2, day)).getUTCDay();
      if (wd === 1 || wd === 3) all.push(d(3, day));
    }
    const [blockedDay, fullDay, halfDay] = all;
    const blk = await call('POST', '/api/booking/blocked-dates', { token: u.token, body: { date: blockedDay, reason: '휴가' } });
    expect(blk.status).toBe(201);
    expect(blk.body).toMatchObject({ date: blockedDay, reason: '휴가' });
    const b1 = await book(u.profileName, { shootDate: fullDay, shootTime: '10:00', clientName: '가' });
    const b2 = await book(u.profileName, { shootDate: fullDay, shootTime: '14:00', clientName: '나' });
    const b3 = await book(u.profileName, { shootDate: halfDay, shootTime: '10:00', clientName: '다' });
    const b4 = await book(u.profileName, { shootDate: halfDay, shootTime: '14:00', clientName: '라' });
    expect([b1.status, b2.status, b3.status, b4.status]).toEqual([201, 201, 201, 201]);
    expect((await call('PUT', `/api/booking/${b2.body.id}/confirm`, { token: u.token })).status).toBe(200);
    expect((await call('PUT', `/api/booking/${b4.body.id}/reject`, { token: u.token, body: { reason: '일정' } })).body).toMatchObject({ status: 'REJECTED', rejectReason: '일정' });

    const cal = await call('GET', `/api/booking/${u.profileName}/availability?year=${YEAR}&month=3`);
    expect(cal.body.availableDates).toEqual(all.filter((x) => x !== blockedDay && x !== fullDay));
    expect(cal.body.timeSlots).toEqual(['10:00', '14:00']);
    expect(cal.body.bookingNote).toBe('안내');
    expect(cal.body.bookedSlots).toEqual({ [fullDay]: ['10:00', '14:00'], [halfDay]: ['10:00'] });

    // 거절된 슬롯도 중복 검사에서는 막힌다(상태 무관)
    const dup = await book(u.profileName, { shootDate: halfDay, shootTime: '14:00', clientName: '마' });
    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({ success: false, code: '409', message: '해당 시간은 이미 예약되어 있습니다' });

    // 꺼 두면 빈 달력
    await call('PUT', '/api/booking/availability-settings', { token: u.token, body: { weekdays: '1,3', timeSlots: '10:00' } });
    const off = await call('GET', `/api/booking/${u.profileName}/availability?year=${YEAR}&month=3`);
    expect(off.body).toEqual({ availableDates: [], bookedSlots: {}, timeSlots: ['10:00'], bookingNote: null });
    expect((await call('GET', '/api/booking/availability-settings', { token: u.token })).body).toEqual({ weekdays: '1,3', timeSlots: '10:00', bufferHours: 0, bookingNote: null, active: false });

    expect((await call('GET', `/api/booking/nobody-x${r()}/availability`)).body).toMatchObject({ code: '404', message: '작가를 찾을 수 없습니다' });
  });

  it('생성 응답·목록·확정·취소·체크리스트·수금, 남의 예약 403', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    const c = await book(u.profileName, { shootDate: d(5, 10), shootTime: '10:00', shootType: 'WEDDING', clientName: '고객', clientPhone: '010', clientEmail: 'c@x.com', memo: '메모' });
    expect(c.status).toBe(201);
    expect(Object.keys(c.body).sort()).toEqual(BOOKING_KEYS);
    expect(c.body).toMatchObject({ memberId: u.id, shootDate: d(5, 10), status: 'REQUESTED', depositStatus: 'PENDING', balanceStatus: 'PENDING',
      confirmedAt: null, checklistJson: null, deliveryDeadline: null, depositAmount: null });
    expect(c.body.createdAt).toMatch(LOCAL_DATE_TIME);
    const early = await book(u.profileName, { shootDate: d(4, 1), clientName: '먼저' });
    expect(early.body.shootTime).toBeNull();

    const list = await call('GET', '/api/booking', { token: u.token });
    expect(list.body.map((x: any) => x.id)).toEqual([early.body.id, c.body.id]);
    expect((await call('GET', '/api/booking?status=requested', { token: u.token })).body).toHaveLength(2);
    expect((await call('GET', '/api/booking?status=CONFIRMED', { token: u.token })).body).toEqual([]);

    for (const p of ['confirm', 'reject', 'cancel', 'checklist', 'payment']) {
      const f = await call('PUT', `/api/booking/${c.body.id}/${p}`, { token: other.token, body: {} });
      expect(f.status, p).toBe(403);
      expect(f.body).toMatchObject({ code: '403', message: '접근 권한이 없습니다' });
    }

    const conf = await call('PUT', `/api/booking/${c.body.id}/confirm`, { token: u.token });
    expect(conf.body.status).toBe('CONFIRMED');
    expect(conf.body.confirmedAt).toMatch(LOCAL_DATE_TIME);

    const ck = await call('PUT', `/api/booking/${c.body.id}/checklist`, { token: u.token, body: { checklistJson: '[{"id":"1","text":"바디","checked":false}]', deliveryDeadline: d(6, 1) } });
    expect(ck.body).toMatchObject({ checklistJson: '[{"id":"1","text":"바디","checked":false}]', deliveryDeadline: d(6, 1) });
    const ck2 = await call('PUT', `/api/booking/${c.body.id}/checklist`, { token: u.token, body: { checklistJson: '[]' } });
    expect(ck2.body).toMatchObject({ checklistJson: '[]', deliveryDeadline: null });

    const pay = await call('PUT', `/api/booking/${c.body.id}/payment`, { token: u.token, body: { depositStatus: 'RECEIVED', depositAmount: '300000' } });
    expect(pay.body).toMatchObject({ depositStatus: 'RECEIVED', depositAmount: 300000, balanceStatus: 'PENDING', balanceReceivedAt: null });
    expect(pay.body.depositReceivedAt).toMatch(LOCAL_DATE_TIME);
    const pay2 = await call('PUT', `/api/booking/${c.body.id}/payment`, { token: u.token, body: { depositStatus: 'PENDING', balanceAmount: 5 } });
    expect(pay2.body).toMatchObject({ depositStatus: 'PENDING', depositReceivedAt: null, depositAmount: 300000, balanceAmount: 5 });
    const bad = await call('PUT', `/api/booking/${c.body.id}/payment`, { token: u.token, body: { balanceStatus: 'PAID' } });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ code: '400', message: '수금 상태는 PENDING 또는 RECEIVED만 허용됩니다' });

    const can = await call('PUT', `/api/booking/${early.body.id}/cancel`, { token: u.token });
    expect(can.body.status).toBe('CANCELLED');
    expect(can.body.cancelledAt).toMatch(LOCAL_DATE_TIME);
    const rej = await call('PUT', `/api/booking/${c.body.id}/reject`, { token: u.token });
    expect(rej.body).toMatchObject({ status: 'REJECTED', rejectReason: null });
  });

  it('생성 검사 — 오늘·과거 400, 없는 작가 404, 같은 IP 분당 10회 후 429', async () => {
    const u = await signupAndLogin();
    const todayStr = new Date().toISOString().slice(0, 10);
    const past = await book(u.profileName, { shootDate: todayStr, clientName: '가' });
    expect(past.status).toBe(400);
    expect(past.body).toMatchObject({ code: '400', message: '촬영일은 오늘 이후 날짜여야 합니다' });
    expect((await book(u.profileName, { clientName: '가' })).status).toBe(400);
    expect((await book(`nobody-x${r()}`, { shootDate: d(7, 1), clientName: '가' })).body).toMatchObject({ code: '404', message: '작가를 찾을 수 없습니다' });

    const ip = pubIp();
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await book(u.profileName, { shootDate: d(8, 1), shootTime: `0${i % 10}:00`, clientName: '가' }, ip)).status);
    expect(codes.slice(0, 10)).toEqual([201, 201, 201, 201, 201, 201, 201, 201, 201, 201]);
    expect(codes[10]).toBe(429);
  });

  it('차단 날짜 — 목록·중복 409·날짜 없음 400·남의 것 삭제 403·삭제 204', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    const a = await call('POST', '/api/booking/blocked-dates', { token: u.token, body: { date: d(9, 1) } });
    const b = await call('POST', '/api/booking/blocked-dates', { token: u.token, body: { date: d(9, 2), reason: '행사' } });
    expect((await call('GET', '/api/booking/blocked-dates', { token: u.token })).body).toEqual([
      { id: a.body.id, date: d(9, 1), reason: null }, { id: b.body.id, date: d(9, 2), reason: '행사' }]);
    const dup = await call('POST', '/api/booking/blocked-dates', { token: u.token, body: { date: d(9, 1) } });
    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({ code: '409', message: '이미 차단된 날짜입니다' });
    const none = await call('POST', '/api/booking/blocked-dates', { token: u.token, body: { reason: 'x' } });
    expect(none.body).toMatchObject({ code: '400', message: '날짜를 입력해주세요' });
    expect((await call('DELETE', `/api/booking/blocked-dates/${a.body.id}`, { token: other.token })).body).toMatchObject({ code: '403' });
    expect((await call('DELETE', `/api/booking/blocked-dates/${a.body.id}`, { token: u.token })).status).toBe(204);
    expect((await call('GET', '/api/booking/blocked-dates', { token: u.token })).body).toHaveLength(1);
    expect((await call('GET', '/api/booking/blocked-dates')).status).toBe(401);
  });
});
