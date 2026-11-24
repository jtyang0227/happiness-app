import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, newsletterToken } from './db.js';
import { LOCAL_DATE_TIME, call, signupAndLogin, uniq } from './helpers.js';

afterAll(closeDb);

describe('포트폴리오 신뢰 신호·뉴스레터·AI 어시스턴트', () => {
  it('추천사 — 생성·작업 연결 검사·정렬·수정·남의 것 404·삭제 조용히 204, num() 오류 400 C002', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    const s = await call('POST', '/api/series', { token: u.token, body: { title: '작업' } });
    const theirs = await call('POST', '/api/series', { token: other.token, body: { title: '남의 작업' } });
    const t1 = await call('POST', '/api/testimonials', { token: u.token, body: { clientName: '김', content: '최고', displayOrder: '2', featured: 'true', seriesId: String(s.body.id), shootDate: 2025 } });
    expect(t1.status).toBe(201);
    expect(t1.body).toEqual({ id: expect.any(Number), clientName: '김', clientRole: null, content: '최고', shootDate: '2025', featured: false, displayOrder: 2,
      seriesId: s.body.id, createdAt: expect.stringMatching(LOCAL_DATE_TIME) });
    const t2 = await call('POST', '/api/testimonials', { token: u.token, body: { clientName: '이', content: '좋아요', featured: true, displayOrder: 1.9 } });
    expect(t2.body).toMatchObject({ featured: true, displayOrder: 1, seriesId: null });
    expect((await call('POST', '/api/testimonials', { token: u.token, body: { clientName: '박', content: 'x', seriesId: theirs.body.id } })).body).toMatchObject({ code: '400', message: '본인 작업만 연결할 수 있습니다.' });
    expect((await call('POST', '/api/testimonials', { token: u.token, body: { clientName: '박', content: 'x', seriesId: 'abc' } })).body).toMatchObject({ code: '400', message: '잘못된 작업입니다.' });
    expect((await call('POST', '/api/testimonials', { token: u.token, body: { clientName: '박', content: 'x', displayOrder: 'abc' } })).body).toMatchObject({ code: 'C002', message: 'For input string: "abc"' });
    expect((await call('POST', '/api/testimonials', { token: u.token, body: { content: 'x' } })).status).toBe(500);

    const list = await call('GET', `/api/testimonials/member/${u.id}`);
    expect(list.body.map((x: any) => x.id)).toEqual([t2.body.id, t1.body.id]);
    const up = await call('PUT', `/api/testimonials/${t1.body.id}`, { token: u.token, body: { clientRole: '신부', seriesId: '' } });
    expect(up.body).toMatchObject({ clientName: '김', clientRole: '신부', seriesId: null });
    expect((await call('PUT', `/api/testimonials/${t1.body.id}`, { token: other.token, body: {} })).body).toMatchObject({ code: '404', message: '추천사를 찾을 수 없습니다.' });
    expect((await call('DELETE', `/api/testimonials/${t1.body.id}`, { token: other.token })).status).toBe(204);
    expect((await call('GET', `/api/testimonials/member/${u.id}`)).body).toHaveLength(2);
    expect((await call('DELETE', `/api/testimonials/${t1.body.id}`, { token: u.token })).status).toBe(204);
    expect((await call('GET', `/api/testimonials/member/${u.id}`)).body).toHaveLength(1);
    expect((await call('POST', '/api/testimonials', { body: { clientName: 'a', content: 'b' } })).status).toBe(401);
  });

  it('언론·수상 — 목록(수상은 연월 내림차순, 연월 없는 것 먼저)·추가·삭제', async () => {
    const u = await signupAndLogin();
    const p = await call('POST', '/api/press', { token: u.token, body: { publication: '월간사진', title: '인터뷰', url: 'https://x', displayOrder: 1 } });
    expect(p.status).toBe(201);
    expect(p.body).toEqual({ id: expect.any(Number), publication: '월간사진', title: '인터뷰', url: 'https://x', publishedDate: null, logoUrl: null, displayOrder: 1 });
    const a1 = await call('POST', '/api/press/achievements', { token: u.token, body: { type: 'AWARD', title: '대상', yearMonth: '2024.05' } });
    const a2 = await call('POST', '/api/press/achievements', { token: u.token, body: { type: 'EXHIBITION', title: '개인전', yearMonth: '2025.01' } });
    const a3 = await call('POST', '/api/press/achievements', { token: u.token, body: { type: 'PUBLICATION', title: '사진집' } });
    expect(a1.body).toEqual({ id: expect.any(Number), type: 'AWARD', title: '대상', organizer: null, location: null, yearMonth: '2024.05', url: null, displayOrder: 0 });
    const list = await call('GET', `/api/press/member/${u.id}`);
    expect(list.body.press.map((x: any) => x.id)).toEqual([p.body.id]);
    expect(list.body.achievements.map((x: any) => x.id)).toEqual([a3.body.id, a2.body.id, a1.body.id]);
    expect((await call('DELETE', `/api/press/achievements/${a1.body.id}`, { token: u.token })).status).toBe(204);
    expect((await call('DELETE', `/api/press/${p.body.id}`, { token: u.token })).status).toBe(204);
    expect((await call('GET', `/api/press/member/${u.id}`)).body).toMatchObject({ press: [], achievements: [{ id: a3.body.id }, { id: a2.body.id }] });
  });

  it('패키지 — 공개는 활성만, 내 목록 전체, 수정(없으면 500)·삭제 / 브랜드', async () => {
    const u = await signupAndLogin();
    const other = await signupAndLogin();
    const p1 = await call('POST', '/api/pricing', { token: u.token, body: { name: '기본', price: '150000', priceLabel: '15만원~', features: '["a"]', displayOrder: 2 } });
    expect(p1.status).toBe(201);
    expect(p1.body).toEqual({ id: expect.any(Number), name: '기본', price: 150000, priceLabel: '15만원~', description: null, features: '["a"]', featured: false, displayOrder: 2, active: true });
    const p2 = await call('POST', '/api/pricing', { token: u.token, body: { name: '숨김', active: false, displayOrder: 1, featured: true } });
    expect(p2.body).toMatchObject({ active: false, featured: true, price: null });
    expect((await call('GET', `/api/pricing/member/${u.id}`)).body.map((x: any) => x.id)).toEqual([p1.body.id]);
    expect((await call('GET', '/api/pricing/my', { token: u.token })).body.map((x: any) => x.id)).toEqual([p2.body.id, p1.body.id]);
    const up = await call('PUT', `/api/pricing/${p2.body.id}`, { token: u.token, body: { active: 'true', price: null } });
    expect(up.body).toMatchObject({ active: false, price: null });
    expect((await call('PUT', `/api/pricing/${p2.body.id}`, { token: u.token, body: { active: true } })).body.active).toBe(true);
    expect((await call('PUT', `/api/pricing/${p2.body.id}`, { token: other.token, body: {} })).status).toBe(500);
    expect((await call('DELETE', `/api/pricing/${p2.body.id}`, { token: u.token })).status).toBe(204);

    const b1 = await call('POST', '/api/brands', { token: u.token, body: { name: '나이키', logoUrl: 'https://l' } });
    const b2 = await call('POST', '/api/brands', { token: u.token, body: { name: '아디다스' } });
    expect(b1.body).toEqual({ id: expect.any(Number), name: '나이키', logoUrl: 'https://l', displayOrder: 0 });
    expect((await call('GET', `/api/brands/member/${u.id}`)).body.map((x: any) => x.id)).toEqual([b1.body.id, b2.body.id]);
    expect((await call('PUT', `/api/brands/${b2.body.id}`, { token: u.token, body: { displayOrder: -1 } })).body.displayOrder).toBe(-1);
    expect((await call('GET', `/api/brands/member/${u.id}`)).body.map((x: any) => x.id)).toEqual([b2.body.id, b1.body.id]);
    expect((await call('PUT', `/api/brands/${b2.body.id}`, { token: other.token, body: {} })).status).toBe(500);
    expect((await call('DELETE', `/api/brands/${b2.body.id}`, { token: u.token })).status).toBe(204);
  });

  it('뉴스레터 — 구독 201(소문자·trim)·이미 구독 200·형식 400, 토큰 취소 → 재구독, 목록, IP당 분당 5회', async () => {
    const u = await signupAndLogin();
    const email = `news-${uniq()}@test.com`;
    const s1 = await call('POST', `/api/newsletter/subscribe/${u.id}`, { body: { email: `  ${email.toUpperCase()} ` } });
    expect(s1.status).toBe(201);
    expect(s1.body).toEqual({ status: 'subscribed' });
    const again = await call('POST', `/api/newsletter/subscribe/${u.id}`, { body: { email } });
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ status: 'already_subscribed' });
    const bad = await call('POST', `/api/newsletter/subscribe/${u.id}`, { body: { email: 'a b@c.d' } });
    expect(bad.status).toBe(400);
    expect(bad.body).toEqual({ error: '이메일 형식이 올바르지 않습니다.' });

    const subs = await call('GET', '/api/newsletter/subscribers', { token: u.token });
    expect(subs.body).toEqual({ count: 1, subscribers: [{ id: expect.any(Number), email, subscribedAt: expect.stringMatching(LOCAL_DATE_TIME) }] });
    const token = await newsletterToken(u.id, email);
    const un = await call('GET', `/api/newsletter/unsubscribe/${token}`);
    expect(un.status).toBe(200);
    expect(un.body).toEqual({ status: 'unsubscribed' });
    expect((await call('GET', '/api/newsletter/subscribers', { token: u.token })).body).toEqual({ count: 0, subscribers: [] });
    expect((await call('GET', '/api/newsletter/unsubscribe/nope')).status).toBe(404);
    const re = await call('POST', `/api/newsletter/subscribe/${u.id}`, { body: { email } });
    expect(re.status).toBe(200);
    expect(re.body).toEqual({ status: 'resubscribed' });

    const ip = { 'X-Forwarded-For': `9.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` };
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await call('POST', `/api/newsletter/subscribe/${u.id}`, { body: { email }, headers: ip })).status);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
    expect((await call('POST', `/api/newsletter/subscribe/${u.id}`, { body: { email }, headers: ip })).body).toEqual({ error: '잠시 후 다시 시도해주세요.' });
    expect((await call('GET', '/api/newsletter/subscribers')).status).toBe(401);
  });

  it('AI 어시스턴트 — 키가 없으면 503 안내, 회원 경로는 인증, IP당 분당 10회', async () => {
    const u = await signupAndLogin();
    const r = await call('POST', '/api/assistant/chat', { body: { message: '예약은 어떻게 해요?', history: [{ role: 'model', content: '안녕하세요' }] } });
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ error: 'AI 어시스턴트가 아직 설정되지 않았습니다. 관리자에게 문의해주세요.' });
    expect((await call('POST', '/api/assistant/chat/workspace', { token: u.token, body: { message: 'x' } })).status).toBe(503);
    expect((await call('POST', '/api/assistant/chat/workspace', { body: { message: 'x' } })).status).toBe(401);
    const ip = { 'X-Forwarded-For': `9.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` };
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await call('POST', '/api/assistant/chat', { body: { message: 'x' }, headers: ip })).status);
    expect(codes.slice(0, 10).every((c) => c === 503)).toBe(true);
    expect(codes[10]).toBe(429);
  });
});
