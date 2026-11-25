import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOutingYear, closeDb, makeAdmin, notificationsOf, setPollEndsAt } from './db.js';
import { IS_SPRING, LOCAL_DATE_TIME, User, call, signupAndLogin } from './helpers.js';

// SNAPDAY 월간 출사 투표·공휴일 — 새 API에만 있는 경로(Spring에 없음)
const YEAR = 2090 + Math.floor(Math.random() * 9);
const MONTH = 3;
const ymd = (d: number) => `${YEAR}-${String(MONTH).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const lastDay = new Date(Date.UTC(YEAR, MONTH, 0)).getUTCDate();
const dow = (d: number) => new Date(Date.UTC(YEAR, MONTH - 1, d)).getUTCDay();
const weekends = Array.from({ length: lastDay }, (_, i) => i + 1).filter((d) => dow(d) === 0 || dow(d) === 6);
const weekdays = Array.from({ length: lastDay }, (_, i) => i + 1).filter((d) => dow(d) !== 0 && dow(d) !== 6);

afterAll(async () => {
  await cleanupOutingYear(YEAR);
  await closeDb();
});

describe.skipIf(IS_SPRING)('SNAPDAY 공휴일·월간 출사 투표', () => {
  let admin: User;
  let a: User;
  let b: User;
  beforeAll(async () => {
    await cleanupOutingYear(YEAR);
    admin = await signupAndLogin();
    await makeAdmin(admin.id);
    admin = { ...admin, token: (await call('POST', '/api/auth/login', { body: { email: admin.email, password: 'Passw0rd!!' } })).body.data.accessToken };
    a = await signupAndLogin();
    b = await signupAndLogin();
  });

  it('공휴일 — 키 없으면 가져오기 503 안내, 수동 등록·중복·조회·삭제, 비관리자 403', async () => {
    if (!process.env.HOLIDAY_API_KEY) {
      const imp = await call('POST', `/api/outing/holidays/import?year=${YEAR}`, { token: admin.token });
      expect(imp.status).toBe(503);
      expect(imp.body.message).toContain('HOLIDAY_API_KEY');
    }
    expect((await call('POST', '/api/outing/holidays', { token: a.token, body: { date: ymd(weekdays[0]), name: '테스트' } })).status).toBe(403);
    const add = await call('POST', '/api/outing/holidays', { token: admin.token, body: { date: ymd(weekdays[0]), name: ' <b>테스트절</b> ' } });
    expect(add.status).toBe(201);
    expect(add.body).toEqual({ date: ymd(weekdays[0]), name: '테스트절', substitute: false, source: 'MANUAL' });
    expect((await call('POST', '/api/outing/holidays', { token: admin.token, body: { date: ymd(weekdays[0]), name: '중복' } })).status).toBe(409);
    await call('POST', '/api/outing/holidays', { token: admin.token, body: { date: ymd(weekdays[1]), name: '대체공휴일', substitute: true } });
    const list = await call('GET', `/api/outing/holidays?year=${YEAR}`);
    expect(list.body.map((h: any) => h.date)).toEqual([ymd(weekdays[0]), ymd(weekdays[1])]);
    expect(list.body[1].substitute).toBe(true);
    expect((await call('DELETE', `/api/outing/holidays/${ymd(weekdays[1])}`, { token: admin.token })).status).toBe(204);
    expect((await call('DELETE', `/api/outing/holidays/${ymd(weekdays[1])}`, { token: admin.token })).status).toBe(404);
  });

  it('투표 — 생성(토·일·공휴일 후보), 응답·수정·삭제, 모두에게 같은 집계, 추천, 평일 추가, 마감·다시 열기, 확정 → 모임·알림', async () => {
    expect((await call('POST', '/api/outing/polls', { token: a.token, body: { year: YEAR, month: MONTH } })).status).toBe(403);
    const created = await call('POST', '/api/outing/polls', { token: admin.token, body: {
      year: YEAR, month: MONTH, region: '경주', minParticipants: 2, endsAt: `${YEAR}-02-20T23:59:00`,
    } });
    expect(created.status).toBe(201);
    const poll = created.body;
    expect(poll).toMatchObject({ year: YEAR, month: MONTH, title: `${YEAR}년 ${MONTH}월 출사`, status: 'OPEN', votingOpen: true, region: '경주', minParticipants: 2, voterCount: 0, recommended: [] });
    expect(poll.startsAt).toMatch(LOCAL_DATE_TIME);
    // 후보 = 토·일 + 등록된 공휴일(평일)
    expect(poll.options.map((o: any) => o.date)).toEqual([...weekends, weekdays[0]].sort((x, y) => x - y).map(ymd));
    const holidayOpt = poll.options.find((o: any) => o.date === ymd(weekdays[0]));
    expect(holidayOpt).toMatchObject({ dayKind: 'HOLIDAY', label: '테스트절', available: 0, unavailable: 0, mine: null });
    expect(poll.options.find((o: any) => o.date === ymd(weekends[0])).dayKind).toBe(dow(weekends[0]) === 6 ? 'SAT' : 'SUN');
    expect((await call('POST', '/api/outing/polls', { token: admin.token, body: { year: YEAR, month: MONTH } })).status).toBe(409);
    expect((await call('GET', `/api/outing/polls?year=${YEAR}`)).body).toEqual([expect.objectContaining({ id: poll.id, month: MONTH, voterCount: 0, optionCount: poll.options.length, confirmedDate: null })]);

    const [o1, o2, o3] = poll.options;
    // 응답
    const va = await call('PUT', `/api/outing/polls/${poll.id}/votes`, { token: a.token, body: { votes: [{ optionId: o1.id, availability: 'AVAILABLE' }, { optionId: o2.id, availability: 'UNAVAILABLE' }] } });
    expect(va.status).toBe(200);
    expect(va.body.options.find((o: any) => o.id === o1.id)).toMatchObject({ available: 1, mine: 'AVAILABLE' });
    expect(va.body.myRespondedAt).toMatch(LOCAL_DATE_TIME);
    await call('PUT', `/api/outing/polls/${poll.id}/votes`, { token: b.token, body: { votes: [{ optionId: o1.id, availability: 'AVAILABLE' }, { optionId: o3.id, availability: 'AVAILABLE' }] } });
    // 같은 집계(비로그인·다른 회원), 내 응답은 사람마다
    const anon = (await call('GET', `/api/outing/polls/${poll.id}`)).body;
    const asB = (await call('GET', `/api/outing/polls/${poll.id}`, { token: b.token })).body;
    for (const d of [anon, asB]) {
      expect(d.voterCount).toBe(2);
      expect(d.options.find((o: any) => o.id === o1.id)).toMatchObject({ available: 2, unavailable: 0 });
      expect(d.options.find((o: any) => o.id === o2.id)).toMatchObject({ available: 0, unavailable: 1 });
      expect(d.recommended).toEqual([o1.id]); // 최소 2명 — o3(1명)은 추천 아님
    }
    expect(anon.options.find((o: any) => o.id === o1.id).mine).toBeNull();
    expect(asB.options.find((o: any) => o.id === o2.id).mine).toBeNull();
    // 수정·응답 지우기
    const vb = await call('PUT', `/api/outing/polls/${poll.id}/votes`, { token: a.token, body: { votes: [{ optionId: o1.id, availability: 'UNAVAILABLE' }, { optionId: o2.id, availability: null }] } });
    expect(vb.body.options.find((o: any) => o.id === o1.id)).toMatchObject({ available: 1, unavailable: 1, mine: 'UNAVAILABLE' });
    expect(vb.body.options.find((o: any) => o.id === o2.id)).toMatchObject({ unavailable: 0, mine: null });
    expect(vb.body.recommended).toEqual([]); // 최소 2명 충족 날짜 없음
    await call('PUT', `/api/outing/polls/${poll.id}/votes`, { token: a.token, body: { votes: [{ optionId: o1.id, availability: 'AVAILABLE' }] } });
    // 잘못된 응답
    expect((await call('PUT', `/api/outing/polls/${poll.id}/votes`, { token: a.token, body: { votes: [{ optionId: o1.id, availability: 'MAYBE' }] } })).status).toBe(400);
    expect((await call('PUT', `/api/outing/polls/${poll.id}/votes`, { token: a.token, body: { votes: [{ optionId: 999999999, availability: 'AVAILABLE' }] } })).status).toBe(400);
    expect((await call('PUT', `/api/outing/polls/${poll.id}/votes`, { token: a.token, body: { votes: [] } })).status).toBe(400);
    expect((await call('PUT', `/api/outing/polls/${poll.id}/votes`, { body: { votes: [{ optionId: o1.id, availability: 'AVAILABLE' }] } })).status).toBe(401);

    // 평일 추가
    const wd = weekdays[2];
    const added = await call('POST', `/api/outing/polls/${poll.id}/options`, { token: admin.token, body: { date: ymd(wd) } });
    expect(added.body.options.find((o: any) => o.date === ymd(wd))).toMatchObject({ dayKind: 'WEEKDAY', label: null });
    expect((await call('POST', `/api/outing/polls/${poll.id}/options`, { token: admin.token, body: { date: ymd(wd) } })).status).toBe(409);
    expect((await call('POST', `/api/outing/polls/${poll.id}/options`, { token: admin.token, body: { date: `${YEAR}-04-01` } })).status).toBe(400);
    expect((await call('POST', `/api/outing/polls/${poll.id}/options`, { token: a.token, body: { date: ymd(weekdays[3]) } })).status).toBe(403);
    const wdOpt = added.body.options.find((o: any) => o.date === ymd(wd));
    expect((await call('DELETE', `/api/outing/polls/${poll.id}/options/${wdOpt.id}`, { token: admin.token })).body.options.some((o: any) => o.id === wdOpt.id)).toBe(false);

    // 리마인드(대상자 계산만 확인 — 숫자)
    expect(typeof (await call('POST', `/api/outing/polls/${poll.id}/remind`, { token: admin.token })).body.sent).toBe('number');

    // 마감 → 응답 불가 → 다시 열기
    expect((await call('POST', `/api/outing/polls/${poll.id}/close`, { token: admin.token })).body.status).toBe('CLOSED');
    expect((await call('PUT', `/api/outing/polls/${poll.id}/votes`, { token: b.token, body: { votes: [{ optionId: o2.id, availability: 'AVAILABLE' }] } })).body.message).toBe('투표 기간이 아닙니다.');
    expect((await call('POST', `/api/outing/polls/${poll.id}/reopen`, { token: admin.token })).body.status).toBe('OPEN');

    // 확정 → 모임 생성, 가능 응답자(a·b)에게 알림
    expect((await call('POST', `/api/outing/polls/${poll.id}/confirm`, { token: admin.token, body: { optionId: o1.id, location: '대릉원', startTime: '25:00', endTime: '17:00' } })).status).toBe(400);
    const conf = await call('POST', `/api/outing/polls/${poll.id}/confirm`, { token: admin.token, body: { optionId: o1.id, title: '경주 벚꽃 출사', location: '대릉원', startTime: '10:00', endTime: '17:00' } });
    expect(conf.status).toBe(201);
    expect(conf.body).toEqual({ pollId: poll.id, gatheringId: expect.any(Number) });
    const g = (await call('GET', `/api/gatherings/${conf.body.gatheringId}`)).body;
    expect(g).toMatchObject({ title: '경주 벚꽃 출사', location: '대릉원', status: 'RECRUITING', startDateTime: `${o1.date}T10:00:00`, endDateTime: `${o1.date}T17:00:00`, createdBy: admin.id });
    const after = (await call('GET', `/api/outing/polls/${poll.id}`)).body;
    expect(after).toMatchObject({ status: 'CONFIRMED', votingOpen: false, confirmedOptionId: o1.id, gatheringId: conf.body.gatheringId });
    expect((await call('GET', `/api/outing/polls?year=${YEAR}`)).body[0].confirmedDate).toBe(o1.date);
    for (const u of [a, b]) {
      const n = await notificationsOf(u.id, 'POLL_CONFIRMED');
      expect(n.at(-1)).toMatchObject({ gathering_id: String(conf.body.gatheringId), related_post_id: String(poll.id) });
    }
    expect((await call('POST', `/api/outing/polls/${poll.id}/confirm`, { token: admin.token, body: { optionId: o1.id, location: 'x', startTime: '10:00', endTime: '17:00' } })).status).toBe(409);
    expect((await call('PUT', `/api/outing/polls/${poll.id}/votes`, { token: a.token, body: { votes: [{ optionId: o1.id, availability: 'AVAILABLE' }] } })).body.message).toBe('이미 날짜가 확정된 투표입니다.');
    expect((await call('DELETE', `/api/outing/polls/${poll.id}`, { token: admin.token })).status).toBe(400);
  });

  it('투표 기간 — 마감 시각이 지나면 응답 불가(배치 전에도), 다른 달 생성·삭제', async () => {
    const p = (await call('POST', '/api/outing/polls', { token: admin.token, body: { year: YEAR, month: 4 } })).body;
    await setPollEndsAt(p.id, '2000-01-01T00:00:00');
    const v = await call('PUT', `/api/outing/polls/${p.id}/votes`, { token: a.token, body: { votes: [{ optionId: p.options[0].id, availability: 'AVAILABLE' }] } });
    expect(v.body.message).toBe('투표 기간이 아닙니다.');
    expect((await call('GET', `/api/outing/polls/${p.id}`)).body.votingOpen).toBe(false);
    expect((await call('POST', '/api/outing/polls', { token: admin.token, body: { year: YEAR, month: 13 } })).status).toBe(400);
    expect((await call('DELETE', `/api/outing/polls/${p.id}`, { token: admin.token })).status).toBe(204);
    expect((await call('GET', `/api/outing/polls/${p.id}`)).status).toBe(404);
  });
});
